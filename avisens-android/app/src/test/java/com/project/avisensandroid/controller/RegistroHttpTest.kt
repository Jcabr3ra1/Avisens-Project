package com.project.avisensandroid.controller

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RegistroHttpTest {

    @Test
    fun noRegistraCuerposConCredenciales() {
        assertFalse(RegistroHttp.registraCuerpo("/v1/auth/login"))
        assertFalse(RegistroHttp.registraCuerpo("/v1/auth/refresh"))
        assertFalse(RegistroHttp.registraCuerpo("/v1/auth/logout"))
        assertFalse(RegistroHttp.registraCuerpo("/v1/usuarios"))
        assertFalse(RegistroHttp.registraCuerpo("/v1/usuarios/7/galpones"))
        assertFalse(RegistroHttp.registraCuerpo("/v1/recuperaciones-password/cambiar-password"))
    }

    @Test
    fun registraCuerposDeDatosOperativos() {
        assertTrue(RegistroHttp.registraCuerpo("/v1/sensores"))
        assertTrue(RegistroHttp.registraCuerpo("/v1/mediciones"))
        assertTrue(RegistroHttp.registraCuerpo("/v1/alertas/galpon/3"))
    }

    @Test
    fun leeElMensajeDelBackend() {
        assertEquals(
            "Cuenta bloqueada temporalmente",
            RegistroHttp.mensajeDeError("""{"statusCode":403,"message":"Cuenta bloqueada temporalmente"}""")
        )
        assertEquals(
            "Uno. Dos",
            RegistroHttp.mensajeDeError("""{"message":["Uno","Dos"]}""")
        )
    }

    @Test
    fun cuerposSinMensajeDevuelvenNull() {
        assertNull(RegistroHttp.mensajeDeError(null))
        assertNull(RegistroHttp.mensajeDeError(""))
        assertNull(RegistroHttp.mensajeDeError("<html>502</html>"))
        assertNull(RegistroHttp.mensajeDeError("""{"error":"x"}"""))
        assertNull(RegistroHttp.mensajeDeError("""{"message":"  "}"""))
    }
}
