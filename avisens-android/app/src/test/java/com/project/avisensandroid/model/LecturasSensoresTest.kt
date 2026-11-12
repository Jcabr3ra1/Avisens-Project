package com.project.avisensandroid.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Vigencia de lecturas (GET /v1/mediciones/ultimas) y sensores sin
 * identificar. Los registros imitan los del backend: seed del ESP32,
 * catálogo de la web y relés por canal.
 */
class LecturasSensoresTest {

    private fun sensor(
        id: Int,
        codigo: String,
        tipo: String,
        unidad: String,
        modelo: String? = null,
        canal: String? = null,
        estado: String = "activo"
    ) = SensorResponse(
        id = id,
        codigo = codigo,
        tipo = tipo,
        canal = canal,
        unidad_medida = unidad,
        modelo = modelo,
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

    private fun lectura(antiguedad: Long?, valor: Double? = 21.9, calidad: String? = "ok") =
        UltimaLecturaResponse(
            valor = valor,
            fecha_hora = "2026-10-22T15:00:00.000Z",
            calidad = calidad,
            antiguedad_segundos = antiguedad
        )

    private val temperatura = sensor(1, "TEMP-G1-01", "Temperatura", "°C", "DHT22")

    // --- Vigencia ---------------------------------------------------------

    @Test
    fun antiguedadHastaElUmbralEsReciente() {
        assertEquals(VigenciaLectura.RECIENTE, LecturasSensores.vigenciaDe(lectura(119)))
        assertEquals(VigenciaLectura.RECIENTE, LecturasSensores.vigenciaDe(lectura(120)))
    }

    @Test
    fun antiguedadSobreElUmbralEsObsoleta() {
        assertEquals(VigenciaLectura.OBSOLETA, LecturasSensores.vigenciaDe(lectura(121)))
        // La lectura del 10/09 vista en el galpón GAL-000006: semanas de antigüedad.
        assertEquals(VigenciaLectura.OBSOLETA, LecturasSensores.vigenciaDe(lectura(3_600_000)))
    }

    @Test
    fun sinMedicionEsSinLecturas() {
        assertEquals(VigenciaLectura.SIN_LECTURAS, LecturasSensores.vigenciaDe(null))
        assertEquals(VigenciaLectura.SIN_LECTURAS, LecturasSensores.vigenciaDe(lectura(10, valor = null)))
    }

    @Test
    fun antiguedadDesconocidaNoEsRecienteNiObsoleta() {
        assertEquals(VigenciaLectura.ANTIGUEDAD_DESCONOCIDA, LecturasSensores.vigenciaDe(lectura(null)))
    }

    @Test
    fun antiguedadNegativaEsHoraInconsistente() {
        assertEquals(VigenciaLectura.HORA_INCONSISTENTE, LecturasSensores.vigenciaDe(lectura(-1)))
        assertEquals(VigenciaLectura.HORA_INCONSISTENTE, LecturasSensores.vigenciaDe(lectura(-3_600)))
        assertEquals(VigenciaLectura.RECIENTE, LecturasSensores.vigenciaDe(lectura(0)))
    }

    @Test
    fun cadaEstadoNoRecienteTieneSuEtiqueta() {
        assertEquals("Sin lecturas recientes", LecturasSensores.etiquetaNoReciente(VigenciaLectura.OBSOLETA))
        assertEquals("Hora inconsistente", LecturasSensores.etiquetaNoReciente(VigenciaLectura.HORA_INCONSISTENTE))
        assertEquals("Antigüedad desconocida", LecturasSensores.etiquetaNoReciente(VigenciaLectura.ANTIGUEDAD_DESCONOCIDA))
        assertNull(LecturasSensores.etiquetaNoReciente(VigenciaLectura.RECIENTE))
        assertNull(LecturasSensores.etiquetaNoReciente(VigenciaLectura.SIN_LECTURAS))
    }

    @Test
    fun laVigenciaNoCambiaLaCalidadDelBackend() {
        val sinCalibrar = LecturaDeSensor(temperatura, lectura(30, calidad = "sospechosa"))
        assertEquals(VigenciaLectura.RECIENTE, sinCalibrar.vigencia)
        assertEquals("sospechosa", sinCalibrar.lectura?.calidad)
    }

    // --- Cruce con /v1/mediciones/ultimas ---------------------------------

    @Test
    fun cruzaPorSensorId() {
        val humedad = sensor(2, "HUM-G1-01", "Humedad", "%", "DHT22")
        val respuesta = UltimasLecturasResponse(
            generado_en = "2026-10-22T15:02:00.000Z",
            sensores = listOf(
                SensorUltimaLecturaResponse(2, 6, "HUM-G1-01", "Humedad", "%", "activo", lectura(30, valor = 62.0)),
                SensorUltimaLecturaResponse(1, 6, "TEMP-G1-01", "Temperatura", "°C", "activo", null)
            )
        )
        val cruzadas = LecturasSensores.cruzar(listOf(temperatura, humedad), respuesta)

        assertNull(cruzadas.first { it.sensor.id == 1 }.lectura)
        assertEquals(62.0, cruzadas.first { it.sensor.id == 2 }.lectura?.valor)
        assertFalse(cruzadas.any { it.errorConsulta })
    }

    @Test
    fun sensorAusenteDeLaRespuestaQuedaSinLecturas() {
        val cruzadas = LecturasSensores.cruzar(listOf(temperatura), UltimasLecturasResponse(null, emptyList()))
        assertEquals(VigenciaLectura.SIN_LECTURAS, cruzadas.single().vigencia)
    }

    @Test
    fun errorDeConsultaMarcaTodosLosSensores() {
        assertTrue(LecturasSensores.conError(listOf(temperatura)).single().errorConsulta)
    }

    @Test
    fun respuestaSinListaDeSensoresNoInventaLecturas() {
        val cruzadas = LecturasSensores.cruzar(listOf(temperatura), UltimasLecturasResponse("2026-10-22T15:00:00.000Z", null))
        assertNull(cruzadas.single().lectura)
        assertEquals(VigenciaLectura.SIN_LECTURAS, cruzadas.single().vigencia)
    }

    @Test
    fun separaActuadoresDeSensoresPorId() {
        val rele = sensor(20, "REL-K1-G1-01", "Bombillos de calefacción", "estado")
        val todas = listOf(LecturaDeSensor(temperatura, lectura(10)), LecturaDeSensor(rele, lectura(10, valor = 1.0)))

        val separadas = LecturasSensores.separar(todas, listOf(rele))

        assertEquals(listOf(temperatura), separadas.sensores.map { it.sensor })
        assertEquals(listOf(rele), separadas.actuadores.map { it.sensor })
    }

    @Test
    fun prefiereObsoletaAntesQueHoraInconsistente() {
        val otraTemperatura = sensor(3, "TEMP-G1-02", "Temperatura", "°C", "DHT22")
        val lecturas = listOf(
            LecturaDeSensor(temperatura, lectura(-30)),
            LecturaDeSensor(otraTemperatura, lectura(500))
        )
        assertSame(otraTemperatura, LecturasSensores.elegir(lecturas, VariableSensor.TEMPERATURA)?.sensor)
    }

    // --- Elección por variable --------------------------------------------

    @Test
    fun prefiereLaLecturaRecienteSobreLaObsoleta() {
        val otraTemperatura = sensor(3, "TEMP-G1-02", "Temperatura", "°C", "DHT22")
        val lecturas = listOf(
            LecturaDeSensor(temperatura, lectura(5_000)),
            LecturaDeSensor(otraTemperatura, lectura(40))
        )
        assertSame(otraTemperatura, LecturasSensores.elegir(lecturas, VariableSensor.TEMPERATURA)?.sensor)
    }

    @Test
    fun sinSensorDeLaVariableNoHayLectura() {
        assertNull(LecturasSensores.elegir(listOf(LecturaDeSensor(temperatura, lectura(10))), VariableSensor.PESO))
    }

    // --- Sensores sin identificar -----------------------------------------

    @Test
    fun amoniacoYCo2DelCatalogoSinModeloNoSeIdentifican() {
        val amoniaco = sensor(10, "AMONIACO-G6-ABC123", "amoniaco", "ppm")
        val co2 = sensor(11, "CO2-G6-DEF456", "co2", "ppm")

        assertEquals(
            listOf(amoniaco, co2),
            LecturasSensores.sensoresSinIdentificar(listOf(temperatura, amoniaco, co2))
        )
    }

    @Test
    fun mq135IdentificadoNoApareceEnElAviso() {
        val mq135 = sensor(12, "GAS-G1-01", "Calidad del aire (ADC)", "adc", "MQ-135")
        assertTrue(LecturasSensores.sensoresSinIdentificar(listOf(mq135)).isEmpty())
    }

    @Test
    fun relesYMotoresNoSonSensoresSinIdentificar() {
        val rele = sensor(20, "REL-K1-G1-01", "Bombillos de calefacción", "estado", canal = "rele:k1")
        val motor = sensor(21, "MOT-ALIM-G1-01", "Motor alimentador", "estado", "L293D canal B")
        assertTrue(LecturasSensores.sensoresSinIdentificar(listOf(rele, motor)).isEmpty())
    }

    @Test
    fun sensoresInactivosNoEntranEnElAviso() {
        val inactivo = sensor(13, "AMONIACO-G6-XYZ", "amoniaco", "ppm", estado = "inactivo")
        assertTrue(LecturasSensores.sensoresSinIdentificar(listOf(inactivo)).isEmpty())
    }

    @Test
    fun elAvisoListaLosDatosParaCorregirlo() {
        val amoniaco = sensor(10, "AMONIACO-G6-ABC123", "amoniaco", "ppm")
        val aviso = LecturasSensores.avisoSinIdentificar(listOf(amoniaco))!!

        assertTrue(aviso.startsWith("1 sensor registrado no se pudo identificar"))
        assertTrue(aviso.contains("AMONIACO-G6-ABC123 · tipo: amoniaco · modelo: no registrado · unidad: ppm"))
        assertNull(LecturasSensores.avisoSinIdentificar(emptyList()))
    }
}
