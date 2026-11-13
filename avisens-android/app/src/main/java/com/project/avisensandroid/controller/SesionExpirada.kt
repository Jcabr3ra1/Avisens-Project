package com.project.avisensandroid.controller

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.project.avisensandroid.model.UserSession
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Punto único para una sesión que ya no es válida (refresh rechazado o sin
 * refresh token). Borra la sesión local y avisa una sola vez a la pantalla
 * visible, aunque varias peticiones reciban 401 a la vez.
 *
 * Si no hay pantalla registrada (app en segundo plano), MainActivity
 * comprueba la sesión al volver a primer plano y redirige al login.
 */
object SesionExpirada {

    /** Extra de LoginActivity para mostrar el motivo del cierre. */
    const val EXTRA_SESION_EXPIRADA = "sesion_expirada"

    private val avisoPendiente = AtomicBoolean(false)
    private val hiloPrincipal by lazy { Handler(Looper.getMainLooper()) }

    @Volatile
    private var oyente: (() -> Unit)? = null

    fun registrar(alExpirar: () -> Unit) {
        oyente = alExpirar
    }

    fun quitar(alExpirar: () -> Unit) {
        if (oyente === alExpirar) oyente = null
    }

    /** Se puede llamar desde cualquier hilo (el Authenticator usa el de OkHttp). */
    fun notificar(context: Context) {
        UserSession.clear(context)
        if (!avisoPendiente.compareAndSet(false, true)) return
        hiloPrincipal.post { oyente?.invoke() }
    }

    /** Tras un login exitoso, una próxima expiración vuelve a avisarse. */
    fun reiniciar() {
        avisoPendiente.set(false)
    }
}
