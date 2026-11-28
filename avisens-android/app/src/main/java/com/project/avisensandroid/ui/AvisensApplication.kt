package com.project.avisensandroid.ui

import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Bundle
import androidx.core.view.WindowCompat
import androidx.appcompat.app.AppCompatDelegate

class AvisensApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        aplicar(this)
        // Retirar trabajos y canales de la antigua prueba de avisos locales.
        androidx.work.WorkManager.getInstance(this)
            .cancelUniqueWork("avisens_notificaciones_periodicas")
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            val manager = getSystemService(android.app.NotificationManager::class.java)
            manager.deleteNotificationChannel("avisens_criticas_v2")
            manager.deleteNotificationChannel("avisens_avisos_v2")
        }
        com.project.avisensandroid.controller.PushAvisens.crearCanal(this)
        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
            override fun onActivityStarted(activity: Activity) = ajustarContraste(activity)
            override fun onActivityResumed(activity: Activity) = ajustarContraste(activity)
            override fun onActivityPaused(activity: Activity) = Unit
            override fun onActivityStopped(activity: Activity) = Unit
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
            override fun onActivityDestroyed(activity: Activity) = Unit
        })
    }

    private fun ajustarContraste(activity: Activity) {
        if (activity is SplashActivity) return

        val temaClaro = (activity.resources.configuration.uiMode and
                android.content.res.Configuration.UI_MODE_NIGHT_MASK) !=
                android.content.res.Configuration.UI_MODE_NIGHT_YES
        WindowCompat.getInsetsController(activity.window, activity.window.decorView).apply {
            isAppearanceLightStatusBars = temaClaro
            isAppearanceLightNavigationBars = temaClaro
        }
    }

    companion object {
        private const val PREFS = "avisens_apariencia"
        private const val KEY = "modo_oscuro"
        fun oscuro(context: Context): Boolean =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY, false)

        fun cambiar(context: Context, oscuro: Boolean) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putBoolean(KEY, oscuro).apply()
            aplicar(context)
        }

        private fun aplicar(context: Context) {
            AppCompatDelegate.setDefaultNightMode(
                if (oscuro(context)) AppCompatDelegate.MODE_NIGHT_YES
                else AppCompatDelegate.MODE_NIGHT_NO
            )
        }
    }
}
