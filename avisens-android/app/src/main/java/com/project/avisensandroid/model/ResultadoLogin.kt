package com.project.avisensandroid.model

/** Interpretación de una respuesta exitosa (2xx) de POST /v1/auth/login. */
sealed class ResultadoLogin {

    data class SesionIniciada(
        val accessToken: String,
        val refreshToken: String,
        val usuarioId: Int,
        val nombre: String,
        val email: String?,
        val rol: UserRole
    ) : ResultadoLogin()

    /**
     * La cuenta tiene una contraseña temporal. El backend no entrega una
     * sesión, solo un cambio_password_token de 15 minutos para
     * POST /v1/recuperaciones-password/cambiar-password. La app todavía no
     * tiene esa pantalla, así que el token no se guarda.
     */
    object CambioPasswordRequerido : ResultadoLogin()

    data class RolNoValido(val rol: String?) : ResultadoLogin()

    /** Faltan tokens o datos del usuario: no se puede abrir la sesión. */
    object RespuestaIncompleta : ResultadoLogin()

    companion object {
        fun desde(respuesta: LoginResponse?): ResultadoLogin {
            if (respuesta == null) return RespuestaIncompleta
            if (respuesta.requiere_cambio_password == true) return CambioPasswordRequerido

            val accessToken = respuesta.access_token
            val refreshToken = respuesta.refresh_token
            val usuario = respuesta.usuario
            if (accessToken.isNullOrBlank() || refreshToken.isNullOrBlank() || usuario == null) {
                return RespuestaIncompleta
            }

            val rol = UserRole.fromApiValue(usuario.rol) ?: return RolNoValido(usuario.rol)

            // El nombre completo es obligatorio en el backend; si faltara, se
            // usa el nombre de usuario real antes que un texto inventado.
            val nombre = usuario.nombre?.takeIf { it.isNotBlank() }
                ?: usuario.username?.takeIf { it.isNotBlank() }
                ?: return RespuestaIncompleta

            return SesionIniciada(
                accessToken = accessToken,
                refreshToken = refreshToken,
                usuarioId = usuario.id,
                nombre = nombre,
                email = usuario.email?.takeIf { it.isNotBlank() },
                rol = rol
            )
        }
    }
}
