package com.project.avisensandroid.controller

import com.google.gson.JsonParser

/** Reglas del registro HTTP de depuración y lectura de errores del backend. */
object RegistroHttp {

    // Rutas cuyos cuerpos llevan contraseñas o tokens: login, refresh,
    // logout, cambio de contraseña, alta de usuarios y recuperaciones.
    private val PREFIJOS_SENSIBLES = listOf(
        "/v1/auth/",
        "/v1/usuarios",
        "/v1/recuperaciones-password"
    )

    /** Si el cuerpo de esta ruta puede registrarse en depuración. */
    fun registraCuerpo(rutaCodificada: String): Boolean =
        PREFIJOS_SENSIBLES.none { rutaCodificada.startsWith(it) }

    /**
     * Mensaje de un error del backend ({"message": "..."} o
     * {"message": ["...", "..."]}). Null si el cuerpo no tiene ese formato.
     */
    fun mensajeDeError(cuerpo: String?): String? {
        if (cuerpo.isNullOrBlank()) return null
        return try {
            val raiz = JsonParser.parseString(cuerpo)
            if (!raiz.isJsonObject) return null
            val mensaje = raiz.asJsonObject.get("message") ?: return null
            when {
                mensaje.isJsonPrimitive -> mensaje.asString
                mensaje.isJsonArray -> mensaje.asJsonArray
                    .filter { it.isJsonPrimitive }
                    .joinToString(". ") { it.asString }
                else -> null
            }?.trim()?.takeIf { it.isNotEmpty() }
        } catch (_: Exception) {
            null
        }
    }
}
