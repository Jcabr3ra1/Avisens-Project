package com.project.avisensandroid.controller

import com.project.avisensandroid.model.RefreshTokenResponse

/** Resultado de POST /v1/auth/refresh. */
sealed class ResultadoRenovacion {

    data class Renovada(
        val accessToken: String,
        val refreshToken: String
    ) : ResultadoRenovacion()

    /** El backend rechazó el refresh token: la sesión terminó. */
    object Rechazada : ResultadoRenovacion()

    /**
     * Sin red, timeout, 429 o 5xx. La sesión puede seguir siendo válida:
     * no se borra y la siguiente petición vuelve a intentar la renovación.
     */
    object ErrorTransitorio : ResultadoRenovacion()
}

object RenovacionToken {

    /**
     * Clasifica la respuesta HTTP del refresh. [cuerpo] solo se usa en 2xx.
     *
     * El backend rota el refresh token en cada renovación (compare-and-swap
     * sobre la sesión): un 2xx sin tokens legibles deja el token anterior
     * ya invalidado, así que se trata como rechazo y no como error
     * transitorio.
     */
    fun clasificar(codigo: Int, cuerpo: RefreshTokenResponse?): ResultadoRenovacion = when {
        codigo in 200..299 -> {
            val accessToken = cuerpo?.access_token
            val refreshToken = cuerpo?.refresh_token
            if (accessToken.isNullOrBlank() || refreshToken.isNullOrBlank()) {
                ResultadoRenovacion.Rechazada
            } else {
                ResultadoRenovacion.Renovada(accessToken, refreshToken)
            }
        }
        codigo == 408 || codigo == 429 || codigo >= 500 -> ResultadoRenovacion.ErrorTransitorio
        // 400, 401, 403...: token inválido, expirado, ya usado o cuenta
        // desactivada. Reintentar no lo arregla.
        else -> ResultadoRenovacion.Rechazada
    }
}
