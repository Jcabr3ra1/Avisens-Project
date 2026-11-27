package com.project.avisensandroid.controller

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.*
import com.project.avisensandroid.R
import com.project.avisensandroid.model.UserSession
import com.project.avisensandroid.model.NotificacionResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.TimeUnit

/** Avisos locales obtenidos por consulta HTTP; no son push FCM. */
object NotificacionesLocales {
    const val EXTRA_USUARIO = "aviso_usuario"
    const val EXTRA_NOTIFICACION = "aviso_id"
    const val EXTRA_ALERTA = "aviso_alerta"
    private const val PREFS = "avisens_notificaciones_v1"
    private const val TRABAJO = "avisens_notificaciones_periodicas"
    private const val CRITICO = "avisens_criticas_v2"
    private const val NORMAL = "avisens_avisos_v2"
    private val mutex = Mutex()

    fun programar(context: Context) {
        val solicitud = PeriodicWorkRequestBuilder<NotificacionesWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            TRABAJO, ExistingPeriodicWorkPolicy.KEEP, solicitud
        )
    }

    fun cancelar(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(TRABAJO)
        NotificationManagerCompat.from(context).cancelAll()
    }

    suspend fun revisar(context: Context): Boolean = mutex.withLock {
        val usuario = UserSession.userId(context) ?: return@withLock true
        fun vigente() = UserSession.isLoggedIn(context) && UserSession.userId(context) == usuario
        if (!vigente()) return@withLock true
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(
                context, Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED) return@withLock true
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) return@withLock true
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        try { revisarStock(context, usuario, manager) }
        catch (e: CancellationException) { throw e }
        catch (_: Exception) { /* No impedir la consulta de alertas. */ }
        val clave = "ultimo_id_$usuario"
        val ultimo = prefs.getInt(clave, -1)
        val nuevas = mutableListOf<NotificacionResponse>()
        var pagina = 1
        var maximo = ultimo
        do {
            val respuesta = RetrofitClient.api.listarMisNotificaciones(page = pagina, limit = 100)
            val cuerpo = respuesta.body() ?: return@withLock false
            if (!respuesta.isSuccessful || !vigente()) return@withLock false
            val datos = cuerpo.data.filter { it.usuario_id == usuario }
            maximo = maxOf(maximo, datos.maxOfOrNull { it.id } ?: 0)
            nuevas.addAll(datos.filter { it.id > ultimo && !it.leida })
            pagina++
        } while (pagina <= cuerpo.meta.totalPages)
        if (!vigente()) return@withLock false
        // Primera consulta: no emitir una ráfaga de avisos históricos.
        if (ultimo == -1) {
            prefs.edit().putInt(clave, maximo.coerceAtLeast(0)).commit()
            return@withLock true
        }
        crearCanales(context)
        for (n in nuevas.distinctBy { it.id }.sortedBy { it.id }) {
            if (!vigente()) return@withLock false
            val esAlerta = n.referencia_tipo.equals("alerta", true)
            val criticidad = if (esAlerta && n.referencia_id != null) {
                try {
                    RetrofitClient.api.consultarAlertaNotificacion(n.referencia_id).body()?.criticidad
                } catch (e: CancellationException) { throw e }
                catch (_: Exception) { null }
            } else null
            val critica = criticidad.equals("alta", true) || criticidad.equals("critica", true) ||
                    (criticidad == null && n.titulo.orEmpty().contains("crítica", true))
            if (!vigente()) return@withLock false
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra(EXTRA_USUARIO, usuario)
                putExtra(EXTRA_NOTIFICACION, n.id)
                putExtra(EXTRA_ALERTA, esAlerta)
            }
            val destino = PendingIntent.getActivity(context, n.id, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val aviso = NotificationCompat.Builder(context, if (critica) CRITICO else NORMAL)
                .setSmallIcon(R.drawable.ic_notifications)
                .setContentTitle(n.titulo ?: "Avisens")
                .setContentText(n.mensaje ?: "Nueva notificación")
                .setStyle(NotificationCompat.BigTextStyle().bigText(n.mensaje))
                .setPriority(if (critica) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
                .setSound(RingtoneManager.getDefaultUri(if (critica) RingtoneManager.TYPE_ALARM else RingtoneManager.TYPE_NOTIFICATION))
                .setVibrate(if (critica) longArrayOf(0, 400, 150, 400) else longArrayOf(0, 180))
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .setContentIntent(destino)
                .build()
            manager.notify("avisens_$usuario", n.id, aviso)
            prefs.edit().putInt(clave, n.id).commit()
        }
        prefs.edit().putInt(clave, maximo).commit()
        true
    }

    private suspend fun revisarStock(context: Context, usuario: Int, manager: NotificationManagerCompat) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        var pagina = 1
        do {
            val r = RetrofitClient.api.listarInsumos(pagina, 100)
            val cuerpo = r.body() ?: return
            if (!r.isSuccessful || UserSession.userId(context) != usuario) return
            for (insumo in cuerpo.data) {
                val actual = insumo.stock_actual ?: continue
                val minimo = insumo.stock_minimo ?: continue
                val clave = "stock_bajo_${usuario}_${insumo.id}"
                val bajo = insumo.activo && minimo > 0 && actual < minimo
                if (bajo && !prefs.getBoolean(clave, false)) {
                    crearCanales(context)
                    val destino = PendingIntent.getActivity(context, insumo.id,
                        Intent(context, MainActivity::class.java).apply {
                            action = "com.project.avisensandroid.STOCK_${insumo.id}"
                            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                        }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                    val mensaje = "${insumo.nombre}: $actual ${insumo.unidad_medida}. Mínimo: $minimo ${insumo.unidad_medida}."
                    val aviso = NotificationCompat.Builder(context, NORMAL)
                        .setSmallIcon(R.drawable.ic_notifications)
                        .setContentTitle("Stock bajo")
                        .setContentText(mensaje)
                        .setStyle(NotificationCompat.BigTextStyle().bigText(mensaje))
                        .setAutoCancel(true).setContentIntent(destino).build()
                    manager.notify("stock_$usuario", insumo.id, aviso)
                }
                prefs.edit().putBoolean(clave, bajo).apply()
            }
            pagina++
        } while (pagina <= cuerpo.meta.totalPages)
    }

    private fun crearCanales(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val manager = context.getSystemService(NotificationManager::class.java)
        for (critica in listOf(false, true)) {
            val canal = NotificationChannel(
                if (critica) CRITICO else NORMAL,
                if (critica) "Alertas críticas" else "Avisos generales",
                if (critica) NotificationManager.IMPORTANCE_HIGH else NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                enableVibration(true)
                vibrationPattern = if (critica) longArrayOf(0, 400, 150, 400) else longArrayOf(0, 180)
                setSound(RingtoneManager.getDefaultUri(if (critica) RingtoneManager.TYPE_ALARM else RingtoneManager.TYPE_NOTIFICATION),
                    AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build())
            }
            manager.createNotificationChannel(canal)
        }
    }
}

class NotificacionesWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        RetrofitClient.inicializar(applicationContext)
        return try {
            if (NotificacionesLocales.revisar(applicationContext)) Result.success() else Result.retry()
        } catch (e: CancellationException) { throw e }
        catch (_: Exception) { Result.retry() }
    }
}
