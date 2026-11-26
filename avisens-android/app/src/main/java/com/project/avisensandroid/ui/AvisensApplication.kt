package com.project.avisensandroid.ui

import android.app.Application
import android.content.Context
import androidx.appcompat.app.AppCompatDelegate

class AvisensApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        aplicar(this)
    }

    companion object {

        private const val PREFS = "avisens_apariencia"
        private const val KEY = "modo_oscuro"

        fun oscuro(context: Context): Boolean =
            context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
            ).getBoolean(KEY, false)

        fun cambiar(context: Context, oscuro: Boolean) {

            context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
            ).edit()
                .putBoolean(KEY, oscuro)
                .apply()

            aplicar(context)
        }

        private fun aplicar(context: Context) {

            AppCompatDelegate.setDefaultNightMode(
                if (oscuro(context)) {
                    AppCompatDelegate.MODE_NIGHT_YES
                } else {
                    AppCompatDelegate.MODE_NIGHT_NO
                }
            )
        }
    }
}