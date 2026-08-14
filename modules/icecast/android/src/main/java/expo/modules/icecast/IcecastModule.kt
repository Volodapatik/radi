package expo.modules.icecast

import android.content.Intent
import android.os.Build
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import ice.caster.android.shout.ShoutOutputStream

class IcecastModule : Module() {
  private var stream: ShoutOutputStream? = null
  private var connected = false

  override fun definition() = ModuleDefinition {
    Name("Icecast")

    AsyncFunction("connect") { host: String, port: Int, mountPoint: String, username: String, password: String ->
      closeInternal()
      val next = ShoutOutputStream()
      next.init(host, port, mountPoint, username, password)
      stream = next
      connected = true
      true
    }

    AsyncFunction("sendBase64") { base64: String ->
      val active = stream ?: throw IllegalStateException("Icecast is not connected")
      val bytes = Base64.decode(base64, Base64.DEFAULT)
      active.write(bytes, bytes.size)
      bytes.size
    }

    AsyncFunction("disconnect") {
      closeInternal()
      true
    }

    AsyncFunction("startBroadcast") { host: String, port: Int, mountPoint: String, username: String, password: String, folderUri: String ->
      val context = appContext.reactContext ?: throw IllegalStateException("Android context unavailable")
      val intent = Intent(context, BroadcastService::class.java)
        .putExtra("host", host)
        .putExtra("port", port)
        .putExtra("mountPoint", mountPoint)
        .putExtra("username", username)
        .putExtra("password", password)
        .putExtra("folderUri", folderUri)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
      true
    }

    AsyncFunction("stopBroadcast") {
      val context = appContext.reactContext
      if (context != null) {
        context.startService(Intent(context, BroadcastService::class.java).setAction("STOP"))
      }
      closeInternal()
      true
    }

    Function("isConnected") { connected }
    OnDestroy { closeInternal() }
  }

  private fun closeInternal() {
    stream?.close()
    stream = null
    connected = false
  }
}
