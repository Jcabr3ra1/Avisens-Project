package com.project.avisensandroid.model

import java.text.Normalizer
import java.util.Locale

/**
 * Magnitudes que el firmware del ESP32 envía al backend por POST /ingest
 * (CODIGO_SENSOR_* en esp32-firmware/include/config.example.h).
 *
 * No hay sensores de CO₂ ni de NH₃ en ppm: el MQ-135 llega como ADC crudo
 * (0-4095) y no se convierte a una concentración sin calibración.
 */
enum class VariableSensor {
    /** DHT22, °C. */
    TEMPERATURA,

    /** DHT22, humedad relativa en %. */
    HUMEDAD,

    /** MQ-135, lectura ADC cruda filtrada (0-4095). No es ppm. */
    CALIDAD_AIRE,

    /** HX711, gramos en la tolva. Llega "sospechosa" mientras no esté calibrado. */
    PESO,

    /** HC-SR04, distancia del sensor al agua en cm: más distancia = menos agua. */
    NIVEL_AGUA
}

/**
 * Separa los sensores físicos de los actuadores. El backend registra en
 * `/v1/sensores` también los relés K1-K4 (canal "rele:k1".."rele:k4") y los
 * motores del L293D (MOT-*), todos con unidad "estado" (1 encendido, 0
 * apagado). Esos registros son salidas, no mediciones, y no se muestran
 * como sensores.
 */
object ClasificadorSensores {

    const val UNIDAD_ESTADO = "estado"
    private const val PREFIJO_CANAL_RELE = "rele:"

    /** Valor máximo del ADC de 12 bits del ESP32 (escala del MQ-135). */
    const val ADC_MAXIMO = 4095f

    fun esActuador(sensor: SensorResponse): Boolean =
        esActuador(sensor.unidad_medida, sensor.canal)

    fun esActuador(unidad: String?, canal: String?): Boolean =
        unidad?.trim().equals(UNIDAD_ESTADO, ignoreCase = true) ||
                canal?.trim()?.lowercase(Locale.ROOT)?.startsWith(PREFIJO_CANAL_RELE) == true

    fun variableDe(sensor: SensorResponse): VariableSensor? =
        variableDe(sensor.tipo, sensor.modelo, sensor.unidad_medida, sensor.canal)

    /**
     * Identifica la magnitud por el tipo y el modelo que registra el backend
     * (prisma/seeds/sensores-esp32.ts). Devuelve null para actuadores y para
     * tipos que el firmware no envía (por ejemplo CO₂ o NH₃ en ppm sin un
     * MQ-135 detrás).
     */
    fun variableDe(tipo: String?, modelo: String?, unidad: String?, canal: String?): VariableSensor? {
        if (esActuador(unidad, canal)) return null
        val t = normalizar(tipo)
        val m = normalizar(modelo)
        val u = normalizar(unidad)
        return when {
            "temperatura" in t -> VariableSensor.TEMPERATURA
            "humedad" in t -> VariableSensor.HUMEDAD
            "mq135" in m || "calidaddelaire" in t || u == "adc" -> VariableSensor.CALIDAD_AIRE
            "hx711" in m || "peso" in t -> VariableSensor.PESO
            "hcsr04" in m || "niveldeagua" in t || "nivelagua" in t -> VariableSensor.NIVEL_AGUA
            else -> null
        }
    }

    /**
     * El ESP32 marca "sospechosa" una lectura que no es una medida física
     * confirmada (hoy, el peso del HX711 sin calibrar). El backend la
     * guarda tal cual; sin calidad, guarda "ok".
     */
    fun esLecturaSinCalibrar(calidad: String?): Boolean =
        calidad?.trim().equals("sospechosa", ignoreCase = true)

    private fun normalizar(texto: String?): String =
        Normalizer.normalize(texto.orEmpty(), Normalizer.Form.NFD)
            .replace("\\p{Mn}+".toRegex(), "")
            .lowercase(Locale.ROOT)
            .replace(" ", "")
            .replace("_", "")
            .replace("-", "")
}
