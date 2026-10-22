package com.project.avisensandroid.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Casos tomados de los registros que crea el backend para el ESP32
 * (prisma/seeds/sensores-esp32.ts y modules/sensores/reles.ts).
 */
class ClasificadorSensoresTest {

    private fun variable(tipo: String, modelo: String?, unidad: String, canal: String? = null) =
        ClasificadorSensores.variableDe(tipo, modelo, unidad, canal)

    @Test
    fun reconoceLosSensoresQueEnviaElFirmware() {
        assertEquals(VariableSensor.TEMPERATURA, variable("Temperatura", "DHT22", "°C"))
        assertEquals(VariableSensor.HUMEDAD, variable("Humedad", "DHT22", "%"))
        assertEquals(VariableSensor.CALIDAD_AIRE, variable("Calidad del aire (ADC)", "MQ-135", "adc"))
        assertEquals(VariableSensor.PESO, variable("Peso de alimento", "HX711", "g"))
        assertEquals(VariableSensor.NIVEL_AGUA, variable("Nivel de agua", "HC-SR04", "cm"))
    }

    @Test
    fun reconoceLosDht22RegistradosPorGpio() {
        // El backend normaliza el tipo de un DHT22 con canal: minúsculas y sin tildes.
        assertEquals(VariableSensor.TEMPERATURA, variable("temperatura", "DHT22", "°C", "gpio:4"))
        assertEquals(VariableSensor.HUMEDAD, variable("humedad", "DHT22", "%", "gpio:4"))
    }

    @Test
    fun losRelesNoSonSensores() {
        // El tipo de un relé es su nombre visible y puede ser cualquier texto.
        assertNull(variable("Bombillos de calefacción", null, "estado", "rele:k1"))
        assertNull(variable("Temperatura", null, "estado", "rele:k1"))
        assertTrue(ClasificadorSensores.esActuador("estado", "rele:k2"))
        // Registro antiguo de relé, sin canal: lo delata la unidad "estado".
        assertTrue(ClasificadorSensores.esActuador("estado", null))
    }

    @Test
    fun losMotoresNoSonSensores() {
        assertNull(variable("Motor alimentador", "L293D canal B", "estado"))
        assertNull(variable("Motor persiana", "L293D canal A", "estado"))
    }

    @Test
    fun co2YAmoniacoSinMq135NoSeMuestran() {
        assertNull(variable("co2", null, "ppm"))
        assertNull(variable("amoniaco", "Genérico", "ppm"))
    }

    @Test
    fun unMq135RegistradoComoGasSigueSiendoAdcCrudo() {
        assertEquals(VariableSensor.CALIDAD_AIRE, variable("co2", "MQ135", "ppm"))
    }

    @Test
    fun unSensorDeGpioNoEsActuador() {
        assertFalse(ClasificadorSensores.esActuador("°C", "gpio:4"))
        assertFalse(ClasificadorSensores.esActuador("adc", null))
    }

    @Test
    fun soloSospechosaEsLecturaSinCalibrar() {
        assertTrue(ClasificadorSensores.esLecturaSinCalibrar("sospechosa"))
        assertFalse(ClasificadorSensores.esLecturaSinCalibrar("ok"))
        assertFalse(ClasificadorSensores.esLecturaSinCalibrar(null))
    }
}
