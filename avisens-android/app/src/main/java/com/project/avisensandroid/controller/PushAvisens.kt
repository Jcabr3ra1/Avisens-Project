package com.project.avisensandroid.controller

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.*
import com.google.android.gms.tasks.Task
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.project.avisensandroid.R
import com.project.avisensandroid.model.UserSession
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class DispositivoPush(val token: String, val plataforma: String = "android")

object PushAvisens {
    const val CANAL = "avisens_alertas"
    private const val PREFS = "avisens_push"
    private const val TRABAJO = "avisens_push_registro"
    private val mutex = Mutex()
    @Volatile
    private var cerrando = false
    private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun crearCanal(c: Context) {
        if (Build.VERSION.SDK_INT >= 26) {
            c.getSystemService(NotificationManager::class.java).createNotificationChannel(
                NotificationChannel(
                    CANAL,
                    "Alertas Avisens",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    enableVibration(true)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
                }
            )
        }
    }

    fun registrado(c: Context, usuario: Int): Boolean =
        !cerrando && prefs(c).getInt("usuario", -1) == usuario &&
                !prefs(c).getBoolean("eliminar_token", false)

    fun programar(c: Context, renovar: Boolean = false) {
        val app = c.applicationContext
        val solicitud = OneTimeWorkRequestBuilder<RegistroPushWorker>()
            .setConstraints(
                Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
            )
            .build()
        WorkManager.getInstance(app).enqueueUniqueWork(
            TRABAJO,
            if (renovar) ExistingWorkPolicy.APPEND_OR_REPLACE else ExistingWorkPolicy.KEEP,
            solicitud
        )
    }

    fun tokenRenovado(c: Context) {
        prefs(c).edit().remove("usuario").apply()
        if (UserSession.isLoggedIn(c) && !cerrando) programar(c, renovar = true)
    }

    private suspend fun <T> Task<T>.esperar(): T = suspendCancellableCoroutine { cont ->
        addOnCompleteListener { task ->
            if (!cont.isActive) return@addOnCompleteListener
            if (task.isSuccessful) cont.resume(task.result)
            else cont.resumeWithException(
                task.exception ?: IllegalStateException("Firebase no disponible")
            )
        }
    }

    suspend fun sincronizar(c: Context): Boolean = mutex.withLock {
        if (cerrando) return@withLock true
        val firebase = FirebaseMessaging.getInstance()
        val estado = prefs(c)
        if (estado.getBoolean("eliminar_token", false)) {
            firebase.deleteToken().esperar()
            estado.edit().remove("eliminar_token").remove("token").remove("usuario").commit()
        }
        val usuario = UserSession.userId(c) ?: return@withLock true
        if (!UserSession.isLoggedIn(c)) return@withLock true
        val token = firebase.token.esperar()
        if (cerrando || UserSession.userId(c) != usuario) return@withLock false
        RetrofitClient.inicializar(c)
        val r = RetrofitClient.api.registrarDispositivoPush(DispositivoPush(token))
        if (!r.isSuccessful) {
            estado.edit().remove("usuario").apply()
            Log.w("AvisensPush", "Registro FCM HTTP ${r.code()}")
            return@withLock false
        }
        r.body()?.close()
        if (UserSession.userId(c) != usuario || !UserSession.isLoggedIn(c)) return@withLock false
        estado.edit().putString("token", token).putInt("usuario", usuario).commit()
        true
    }

    // Se intenta desactivar antes de que se eliminen las credenciales de la API.
    suspend fun desactivar(c: Context) {
        cerrando = true
        WorkManager.getInstance(c).cancelUniqueWork(TRABAJO)
        val estado = prefs(c)
        estado.edit().remove("usuario").putBoolean("eliminar_token", true).commit()
        try {
            withTimeoutOrNull(4000L) {
                mutex.withLock {
                    val token = estado.getString("token", null)
                    if (!token.isNullOrBlank() && UserSession.isLoggedIn(c)) {
                        val r = RetrofitClient.api.desactivarDispositivoPush(DispositivoPush(token))
                        r.body()?.close()
                        if (!r.isSuccessful) Log.w("AvisensPush", "Desactivación HTTP ${r.code()}")
                    }
                    FirebaseMessaging.getInstance().deleteToken().esperar()
                    estado.edit().remove("eliminar_token").remove("token").commit()
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) { /* El worker reintentará invalidar el token. */
        }
    }

    fun sesionCerrada(c: Context) {
        val estado = prefs(c)
        if (estado.contains("token") || estado.contains("usuario")) {
            estado.edit().remove("usuario").putBoolean("eliminar_token", true).commit()
        }
        NotificationManagerCompat.from(c).cancelAll()
        cerrando = false
        if (estado.getBoolean("eliminar_token", false)) programar(c, renovar = true)
    }

    fun esAviso(i: Intent): Boolean = i.hasExtra("referencia_tipo") &&
            (i.hasExtra("referencia_id") || i.hasExtra("tipo"))

    fun copiarAviso(origen: Intent?, destino: Intent) {
        if (origen == null || !esAviso(origen)) return
        for (key in listOf("tipo", "referencia_tipo", "referencia_id")) {
            origen.getStringExtra(key)?.let { destino.putExtra(key, it) }
        }
        destino.putExtra("push_usuario", origen.getIntExtra("push_usuario", -1))
    }

    fun limpiarAviso(i: Intent) {
        for (key in listOf(
            "tipo",
            "referencia_tipo",
            "referencia_id",
            "push_usuario"
        )) i.removeExtra(key)
    }

    fun recibir(c: Context, mensaje: RemoteMessage) {
        val usuario = UserSession.userId(c) ?: return
        if (!UserSession.isLoggedIn(c) || !registrado(c, usuario)) return
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(
                c,
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) return
        val manager = NotificationManagerCompat.from(c)
        if (!manager.areNotificationsEnabled()) return
        crearCanal(c)
        val id = (mensaje.messageId ?: mensaje.data.toString()).hashCode()
        val intent = Intent(c, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            mensaje.data.forEach { (key, value) -> putExtra(key, value) }
            putExtra("push_usuario", usuario)
        }
        val destino = PendingIntent.getActivity(
            c, id, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val titulo = mensaje.notification?.title ?: mensaje.data["titulo"] ?: "Avisens"
        val texto = mensaje.notification?.body ?: mensaje.data["mensaje"] ?: "Nueva alerta"
        val aviso = NotificationCompat.Builder(c, CANAL)
            .setSmallIcon(R.drawable.ic_notifications).setContentTitle(titulo).setContentText(texto)
            .setStyle(NotificationCompat.BigTextStyle().bigText(texto))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true).setOnlyAlertOnce(true).setContentIntent(destino).build()
        manager.notify("avisens_push_$usuario", id, aviso)
    }
}

class RegistroPushWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = try {
        if (PushAvisens.sincronizar(applicationContext)) Result.success() else Result.retry()
    } catch (e: CancellationException) {
        throw e
    } catch (_: Exception) {
        Result.retry()
    }
}

class AvisensMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        PushAvisens.tokenRenovado(applicationContext)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        PushAvisens.recibir(applicationContext, message)
    }
}
