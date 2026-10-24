package com.project.avisensandroid.controller

import com.project.avisensandroid.model.RefreshTokenResponse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test

class RenovacionTokenTest {

    @Test
    fun respuestaExitosaConTokensRenueva() {
        val resultado = RenovacionToken.clasificar(200, RefreshTokenResponse("acceso", "refresco"))
        assertEquals(ResultadoRenovacion.Renovada("acceso", "refresco"), resultado)
    }

    @Test
    fun respuestaExitosaSinTokensEsRechazo() {
        // El backend ya rotó el token anterior: no se puede reintentar con él.
        assertSame(ResultadoRenovacion.Rechazada, RenovacionToken.clasificar(200, null))
        assertSame(
            ResultadoRenovacion.Rechazada,
            RenovacionToken.clasificar(200, RefreshTokenResponse(null, "refresco"))
        )
        assertSame(
            ResultadoRenovacion.Rechazada,
            RenovacionToken.clasificar(200, RefreshTokenResponse("acceso", " "))
        )
    }

    @Test
    fun tokenInvalidoOCuentaDesactivadaEsRechazo() {
        listOf(400, 401, 403, 404).forEach { codigo ->
            assertSame("HTTP $codigo", ResultadoRenovacion.Rechazada, RenovacionToken.clasificar(codigo, null))
        }
    }

    @Test
    fun saturacionOServidorCaidoEsTransitorio() {
        listOf(408, 429, 500, 502, 503).forEach { codigo ->
            assertSame(
                "HTTP $codigo",
                ResultadoRenovacion.ErrorTransitorio,
                RenovacionToken.clasificar(codigo, null)
            )
        }
    }
}
