package com.project.avisensandroid.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Relés y motores tal como los registra el backend: sensores con unidad
 * "estado" cuyo valor (1/0) es la salida que reportó el ESP32.
 */
class ActuadoresTest {

    private fun registro(
        id: Int,
        codigo: String,
        tipo: String,
        unidad: String = "estado",
        canal: String? = null,
        estado: String = "activo"
    ) = SensorResponse(
        id = id,
        codigo = codigo,
        tipo = tipo,
        canal = canal,
        unidad_medida = unidad,
        modelo = null,
        fabricante = null,
        coordenada_x = null,
        coordenada_y = null,
        altura_metros = null,
        fecha_instalacion = null,
        ultima_calibracion = null,
        proxima_calibracion = null,
        estado = estado,
        galpon = GalponSensorResponse(id = 6, nombre = "Galpón1 norte", granja = GranjaSensorResponse(id = 1, propietario_id = 2)),
        dispositivo = null
    )

    private fun reporte(valor: Double?, antiguedad: Long?) = UltimaLecturaResponse(
        valor = valor,
        fecha_hora = "2026-10-22T15:00:00.000Z",
        calidad = "ok",
        antiguedad_segundos = antiguedad
    )

    private val releK2Legado = registro(1, "REL-K2-G1-01", "Ventiladores")
    private val releK4Canal = registro(2, "RELE-G1-ABC", "Bomba de agua", canal = "rele:k4")
    private val motor = registro(3, "MOT-ALIM-G1-01", "Motor alimentador")
    private val dht = registro(4, "TEMP-G1-01", "temperatura", unidad = "°C", canal = "gpio:4")

    @Test
    fun soloLosActivosConUnidadEstadoSonActuadores() {
        val inactivo = registro(5, "REL-K1-G1-01", "Bombillos", estado = "inactivo")
        val activos = Actuadores.activos(listOf(dht, motor, releK4Canal, inactivo, releK2Legado))

        // Ordenados por relé (K2, K4) y luego el resto por id.
        assertEquals(listOf(releK2Legado, releK4Canal, motor), activos)
    }

    @Test
    fun losActuadoresNoSeClasificanComoSensores() {
        listOf(releK2Legado, releK4Canal, motor).forEach {
            assertTrue(ClasificadorSensores.esActuador(it))
            assertNull(ClasificadorSensores.variableDe(it))
        }
        assertFalse(ClasificadorSensores.esActuador(dht))
    }

    @Test
    fun identificaElReleSoloConCanalOCodigoDelFirmware() {
        assertEquals(2, Actuadores.numeroRele(releK2Legado))
        assertEquals(4, Actuadores.numeroRele(releK4Canal))
        assertNull(Actuadores.numeroRele(motor))
        // Con un canal GPIO nunca es un relé, aunque el código lo parezca.
        assertNull(Actuadores.numeroRele(registro(6, "REL-K1-X", "x", canal = "gpio:4")))
    }

    @Test
    fun soloUnoYCeroTienenSignificado() {
        assertEquals(SalidaActuador.ENCENDIDA, Actuadores.salidaDe(1.0))
        assertEquals(SalidaActuador.APAGADA, Actuadores.salidaDe(0.0))
        assertEquals(SalidaActuador.VALOR_NO_RECONOCIDO, Actuadores.salidaDe(0.5))
        assertEquals(SalidaActuador.VALOR_NO_RECONOCIDO, Actuadores.salidaDe(2.0))
        assertEquals(SalidaActuador.SIN_REPORTE, Actuadores.salidaDe(null))
    }

    @Test
    fun reporteRecienteMuestraLaSalida() {
        val vista = Actuadores.vista(LecturaDeSensor(releK2Legado, reporte(1.0, 30)))

        assertEquals(SalidaActuador.ENCENDIDA, vista.salida)
        assertEquals(VigenciaLectura.RECIENTE, vista.vigencia)
        assertEquals("Relé K2", vista.rele)
        assertEquals("Ventiladores", vista.nombre)
        assertEquals("Salida encendida", Actuadores.textoSalida(vista))
    }

    @Test
    fun reporteViejoConservaSuVigencia() {
        val vista = Actuadores.vista(LecturaDeSensor(motor, reporte(0.0, 4_000)))
        assertEquals(VigenciaLectura.OBSOLETA, vista.vigencia)
        assertEquals(SalidaActuador.APAGADA, vista.salida)
    }

    @Test
    fun sinReporteNiErrorNoSeInventaUnaSalida() {
        val sinReporte = Actuadores.vista(LecturaDeSensor(motor, null))
        assertEquals(SalidaActuador.SIN_REPORTE, sinReporte.salida)
        assertEquals(VigenciaLectura.SIN_LECTURAS, sinReporte.vigencia)

        val conError = Actuadores.vista(LecturaDeSensor(motor, null, errorConsulta = true))
        assertTrue(conError.errorConsulta)
        assertEquals(SalidaActuador.SIN_REPORTE, conError.salida)
    }
}
