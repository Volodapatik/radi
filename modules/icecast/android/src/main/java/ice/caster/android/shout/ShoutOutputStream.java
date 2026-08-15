package ice.caster.android.shout;

import java.io.IOException;

public class ShoutOutputStream {
    static {
        System.loadLibrary("shout");
        System.loadLibrary("shout-jni");
    }

    public void init(String url, int port, String mount, String user, String password) throws IOException {
        if (jniInit(url, port, mount, user, password) <= 0) {
            throw new IOException("Caster.fm connection rejected: " + getLastError());
        }
    }

    public void write(byte[] buffer, int count) throws IOException {
        if (jniSend(buffer, count) < 0) {
            throw new IOException("Caster.fm send failed: " + getLastError());
        }
    }

    public String getLastError() {
        return jniGetError();
    }

    public void close() {
        jniClose();
    }

    private native int jniInit(String url, int port, String mount, String user, String password);
    private native String jniGetError();
    private native int jniSend(byte[] buffer, int length);
    private native int jniClose();
}
