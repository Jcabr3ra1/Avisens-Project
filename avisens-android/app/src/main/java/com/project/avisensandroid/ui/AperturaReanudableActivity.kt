package com.project.avisensandroid.ui

import androidx.appcompat.app.AppCompatActivity

/** La apertura animada pertenece exclusivamente a SplashActivity. */
abstract class AperturaReanudableActivity : AppCompatActivity() {
    // Compatibilidad con las llamadas existentes al abrir la camara.
    protected fun omitirAperturaPorActividadExterna() = Unit
    protected fun cancelarOmisionApertura() = Unit
}
