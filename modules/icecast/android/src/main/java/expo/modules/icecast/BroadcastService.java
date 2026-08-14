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

import java.io.InputStream;
import java.util.Arrays;

import ice.caster.android.shout.ShoutOutputStream;

public class BroadcastService extends Service {
    private static final String TAG = "RadioFolderStreamer";
    private static final String CHANNEL_ID = "radio_broadcast";
    private volatile boolean running = false;
    private Thread worker;
    private ShoutOutputStream shout;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        if ("STOP".equals(intent.getAction())) {
            stopStreaming();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!running) {
            startForeground(1101, createNotification("Підключення до Caster.fm…"));
            worker = new Thread(() -> streamFolder(intent), "radio-folder-stream");
            running = true;
            worker.start();
        }
        return START_STICKY;
    }

    private void streamFolder(Intent intent) {
        try {
            String host = intent.getStringExtra("host");
            int port = intent.getIntExtra("port", 16855);
            String mount = intent.getStringExtra("mountPoint");
            String username = intent.getStringExtra("username");
            String password = intent.getStringExtra("password");
            String folderUri = intent.getStringExtra("folderUri");
            shout = new ShoutOutputStream();
            shout.init(host, port, mount, username, password);

            DocumentFile folder = DocumentFile.fromTreeUri(this, Uri.parse(folderUri));
            if (folder == null) throw new IllegalStateException("Вибрана папка недоступна");
            DocumentFile[] files = folder.listFiles();
            Arrays.sort(files, (a, b) -> a.getName().compareToIgnoreCase(b.getName()));
            while (running) {
                boolean sentAny = false;
                for (DocumentFile file : files) {
                    if (!running) break;
                    String name = file.getName() == null ? "" : file.getName();
                    if (file.isDirectory() || !name.toLowerCase().endsWith(".mp3")) continue;
                    sentAny = true;
                    updateNotification(name);
                    try (InputStream input = getContentResolver().openInputStream(file.getUri())) {
                        if (input == null) throw new IllegalStateException("Не вдалося відкрити " + name);
                        byte[] buffer = new byte[32 * 1024];
                        int read;
                        while (running && (read = input.read(buffer)) != -1) {
                            if (read > 0) shout.write(buffer, read);
                        }
                    }
                }
                if (!sentAny) throw new IllegalStateException("У папці немає MP3-файлів");
            }
        } catch (Exception error) {
            Log.e(TAG, "Broadcast stopped", error);
            updateNotification("Помилка трансляції");
        } finally {
            stopStreaming();
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

    private void updateNotification(String text) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.notify(1101, createNotification(text));
    }

    private synchronized void stopStreaming() {
        running = false;
        if (shout != null) {
            shout.close();
            shout = null;
        }
    }

    @Override
    public void onDestroy() {
        stopStreaming();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
