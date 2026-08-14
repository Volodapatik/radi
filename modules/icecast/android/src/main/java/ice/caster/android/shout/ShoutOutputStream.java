package ice.caster.android.shout;

import java.io.IOException;

public class ShoutOutputStream {
    static {
        System.loadLibrary("shout");
        System.loadLibrary("shout-jni");
    }

    public void init(String url, int port, String mount, String user, String password) throws IOException {
        if (jniInit(url, port, mount, user, password) <= 0) {
            throw new IOException("Icecast source connection was rejected");
        }
    }

    public void write(byte[] buffer, int count) throws IOException {
        if (jniSend(buffer, count) < 0) {
            throw new IOException("Icecast send failed");
        }
    }

    public void close() {
        jniClose();
    }

    private native int jniInit(String url, int port, String mount, String user, String password);
    private native int jniSend(byte[] buffer, int length);
    private native int jniClose();
}
