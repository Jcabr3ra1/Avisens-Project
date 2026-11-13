package com.project.avisensandroid.model

/**
 * Respuesta de POST /v1/auth/login. El backend devuelve dos formas:
 *
 * - Sesión iniciada: requiere_cambio_password = false, access_token,
 *   refresh_token y usuario.
 * - Contraseña temporal: requiere_cambio_password = true y
 *   cambio_password_token, sin tokens de sesión ni usuario.
 *
 * Por eso casi todo es nullable. Gson no respeta la nulabilidad de Kotlin:
 * un campo declarado no nulo puede llegar null y fallar lejos de aquí.
 * ResultadoLogin.desde() valida la respuesta antes de usarla.
 */
data class LoginResponse(
    val requiere_cambio_password: Boolean?,
    val cambio_password_token: String?,
    val access_token: String?,
    val refresh_token: String?,
    val usuario: UsuarioLoginResponse?
)

data class UsuarioLoginResponse(
    val id: Int,
    val nombre: String?,
    val username: String?,
    // El correo es opcional en el backend (Usuario.email String?).
    val email: String?,
    val rol: String?
)
