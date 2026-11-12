package com.project.avisensandroid.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test

/** Formas de respuesta de POST /v1/auth/login (auth.service.ts del backend). */
class ResultadoLoginTest {

    private fun usuario(
        nombre: String? = "María López",
        email: String? = "maria@granja.co",
        rol: String? = "Propietario"
    ) = UsuarioLoginResponse(id = 7, nombre = nombre, username = "maria.lopez", email = email, rol = rol)

    private fun respuesta(usuario: UsuarioLoginResponse? = usuario()) = LoginResponse(
        requiere_cambio_password = false,
        cambio_password_token = null,
        access_token = "acceso",
        refresh_token = "refresco",
        usuario = usuario
    )

    @Test
    fun sesionNormal() {
        assertEquals(
            ResultadoLogin.SesionIniciada("acceso", "refresco", 7, "María López", "maria@granja.co", UserRole.PROPIETARIO),
            ResultadoLogin.desde(respuesta())
        )
    }

    @Test
    fun usuarioSinCorreoIniciaSesion() {
        val resultado = ResultadoLogin.desde(respuesta(usuario(email = null)))
        assertEquals(null, (resultado as ResultadoLogin.SesionIniciada).email)
    }

    @Test
    fun contrasenaTemporalNoAbreSesion() {
        val temporal = LoginResponse(
            requiere_cambio_password = true,
            cambio_password_token = "token-de-cambio",
            access_token = null,
            refresh_token = null,
            usuario = null
        )
        assertSame(ResultadoLogin.CambioPasswordRequerido, ResultadoLogin.desde(temporal))
    }

    @Test
    fun respuestaSinTokensOUsuarioEsIncompleta() {
        assertSame(ResultadoLogin.RespuestaIncompleta, ResultadoLogin.desde(null))
        assertSame(ResultadoLogin.RespuestaIncompleta, ResultadoLogin.desde(respuesta(usuario = null)))
        assertSame(
            ResultadoLogin.RespuestaIncompleta,
            ResultadoLogin.desde(respuesta().copy(access_token = ""))
        )
    }

    @Test
    fun nombreAusenteUsaElNombreDeUsuario() {
        val resultado = ResultadoLogin.desde(respuesta(usuario(nombre = null)))
        assertEquals("maria.lopez", (resultado as ResultadoLogin.SesionIniciada).nombre)
    }

    @Test
    fun rolDesconocidoNoAbreSesion() {
        assertEquals(ResultadoLogin.RolNoValido("Auditor"), ResultadoLogin.desde(respuesta(usuario(rol = "Auditor"))))
        assertEquals(ResultadoLogin.RolNoValido(null), ResultadoLogin.desde(respuesta(usuario(rol = null))))
    }

    @Test
    fun aceptaLosNombresDeRolDelBackend() {
        assertEquals(
            UserRole.ADMINISTRADOR,
            (ResultadoLogin.desde(respuesta(usuario(rol = "Administrador"))) as ResultadoLogin.SesionIniciada).rol
        )
        assertEquals(
            UserRole.OPERARIO,
            (ResultadoLogin.desde(respuesta(usuario(rol = "Operario"))) as ResultadoLogin.SesionIniciada).rol
        )
    }
}
