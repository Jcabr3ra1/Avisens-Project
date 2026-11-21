package com.project.avisensandroid.controller

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.project.avisensandroid.R
import com.project.avisensandroid.model.UserSession
import com.project.avisensandroid.ui.MainActivity

/** Consulta las notificaciones guardadas por NestJS; no es FCM. */
object NotificacionesLocales {
    private const val CHANNEL_ID = "avisens_alertas"
    private const val PREFS = "avisens_notificaciones_v1"

    suspend fun revisar(context: Context) {
        val userId = UserSession.userId(context) ?: return
        if (!UserSession.isLoggedIn(context)) return
        val response = RetrofitClient.api.listarMisNotificaciones(page = 1, limit = 100)
        if (!response.isSuccessful) return
        val datos = response.body()?.data ?: return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val clave = "ultimo_id_$userId"
        val ultimo = prefs.getInt(clave, -1)
        val maximo = datos.maxOfOrNull { it.id } ?: return

        // Primera consulta: establecer referencia sin anunciar registros antiguos.
        if (ultimo == -1) {
            prefs.edit().putInt(clave, maximo).apply()
            return
        }
        if (maximo <= ultimo) return

        // Solo avisos nuevos y aún no leídos. No notificar datos de otra sesión.
        if (UserSession.userId(context) != userId) return
        val nuevas = datos.filter { it.id > ultimo && !it.leida }.sortedBy { it.id }
        if (nuevas.isNotEmpty()) {
            crearCanal(context)
            if (Build.VERSION.SDK_INT < 33 ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            ) {
                val manager = NotificationManagerCompat.from(context)
                nuevas.forEach { notificacion ->
                    val intent = Intent(context, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    }
                    val pendingIntent = PendingIntent.getActivity(
                        context, notificacion.id, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    val aviso = NotificationCompat.Builder(context, CHANNEL_ID)
                        .setSmallIcon(R.drawable.logo_avisens)
                        .setContentTitle(notificacion.titulo ?: "Avisens")
                        .setContentText(notificacion.mensaje ?: "Nueva notificación")
                        .setStyle(NotificationCompat.BigTextStyle().bigText(notificacion.mensaje))
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setAutoCancel(true)
                        .setContentIntent(pendingIntent)
                        .build()
                    manager.notify(notificacion.id, aviso)
                }
            }
        }
        prefs.edit().putInt(clave, maximo).apply()
    }

    private fun crearCanal(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Alertas Avisens", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Avisos de nuevas alertas de las granjas asignadas"
            }
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
