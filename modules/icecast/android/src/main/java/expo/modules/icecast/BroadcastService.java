package expo.modules.icecast;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.documentfile.provider.DocumentFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;

import ice.caster.android.shout.ShoutOutputStream;

public class BroadcastService extends Service {
    private static final String TAG = "RadioFolderStreamer";
    private static final String CHANNEL_ID = "radio_broadcast";
    private static final String PREFS = "icecast_broadcast_status";
    private static final long[] RECONNECT_DELAYS_MS = {5000L, 10000L, 20000L, 40000L, 60000L};

    private volatile boolean running = false;
    private Thread worker;
    private ShoutOutputStream shout;
    private String host;
    private int port;
    private String mount;
    private String username;
    private String password;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        if ("STOP".equals(intent.getAction())) {
            setStatus("STOPPED", "Трансляцію зупинено");
            stopStreaming();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!running) {
            host = intent.getStringExtra("host");
            port = intent.getIntExtra("port", 16855);
            mount = intent.getStringExtra("mountPoint");
            username = intent.getStringExtra("username");
            password = intent.getStringExtra("password");
            setStatus("CONNECTING", "Підключення до Caster.fm…");
            startForeground(1101, createNotification("Підключення до Caster.fm…"));
            worker = new Thread(() -> streamFolder(intent), "radio-folder-stream");
            running = true;
            worker.start();
        }
        return START_STICKY;
    }

    private void streamFolder(Intent intent) {
        try {
            String folderUri = intent.getStringExtra("folderUri");
            DocumentFile folder = DocumentFile.fromTreeUri(this, Uri.parse(folderUri));
            if (folder == null) throw new IllegalStateException("Вибрана папка недоступна");
            DocumentFile[] files = folder.listFiles();
            Arrays.sort(files, (a, b) -> {
                String left = a.getName() == null ? "" : a.getName();
                String right = b.getName() == null ? "" : b.getName();
                return left.compareToIgnoreCase(right);
            });

            connectWithRetry();
            while (running) {
                boolean sentAny = false;
                for (DocumentFile file : files) {
                    if (!running) break;
                    String name = file.getName() == null ? "" : file.getName();
                    if (file.isDirectory() || !name.toLowerCase().endsWith(".mp3")) continue;
                    sentAny = true;
                    setStatus("TRACK", name);
                    try (InputStream input = getContentResolver().openInputStream(file.getUri())) {
                        if (input == null) throw new IllegalStateException("Не вдалося відкрити " + name);
                        byte[] buffer = new byte[32 * 1024];
                        int read;
                        while (running && (read = input.read(buffer)) != -1) {
                            if (read > 0) writeWithReconnect(buffer, read);
                        }
                    }
                }
                if (!sentAny) throw new IllegalStateException("У папці немає MP3-файлів");
            }
        } catch (Exception error) {
            Log.e(TAG, "Broadcast stopped", error);
            String message = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
            setStatus("ERROR", message);
        } finally {
            stopStreaming();
        }
    }

    private void connectWithRetry() throws IOException {
        int attempt = 0;
        while (running) {
            try {
                closeShout();
                ShoutOutputStream next = new ShoutOutputStream();
                next.init(host, port, mount, username, password);
                shout = next;
                setStatus("CONNECTED", "Caster.fm прийняв SOURCE-підключення");
                return;
            } catch (IOException error) {
                closeShout();
                long delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
                attempt++;
                setStatus("RECONNECTING", "Caster.fm: повтор через " + (delay / 1000) + " с");
                sleepWhileRunning(delay);
            }
        }
        throw new IOException("Трансляцію зупинено");
    }

    private void writeWithReconnect(byte[] buffer, int count) throws IOException {
        while (running) {
            try {
                if (shout == null) connectWithRetry();
                shout.write(buffer, count);
                return;
            } catch (IOException error) {
                Log.w(TAG, "Socket send failed; reconnecting", error);
                closeShout();
                connectWithRetry();
            }
        }
        throw new IOException("Трансляцію зупинено");
    }

    private void sleepWhileRunning(long delayMs) throws IOException {
        long end = System.currentTimeMillis() + delayMs;
        while (running && System.currentTimeMillis() < end) {
            try {
                Thread.sleep(Math.min(1000L, end - System.currentTimeMillis()));
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new IOException("Reconnect interrupted", interrupted);
            }
        }
    }

    private Notification createNotification(String text) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "Radio broadcast", NotificationManager.IMPORTANCE_LOW));
        }
        return new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Radio Folder Streamer")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setOngoing(true)
                .build();
    }

    private void setStatus(String status, String message) {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString("status", status)
                .putString("message", message)
                .apply();
        updateNotification(message);
    }

    private void updateNotification(String text) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.notify(1101, createNotification(text));
    }

    private synchronized void closeShout() {
        if (shout != null) {
            shout.close();
            shout = null;
        }
    }

    private synchronized void stopStreaming() {
        running = false;
        closeShout();
    }

    @Override
    public void onDestroy() {
        stopStreaming();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
