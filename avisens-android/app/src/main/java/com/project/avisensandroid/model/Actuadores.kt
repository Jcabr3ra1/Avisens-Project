package com.project.avisensandroid.model

import java.util.Locale

/**
 * Salida que el ESP32 reportó para un actuador. El firmware envía 1
 * (encendida) o 0 (apagada) como medición del registro con unidad "estado".
 * No hay sensor de realimentación: no confirma que el relé conmutó ni que la
 * carga funciona.
 */
enum class SalidaActuador {
    ENCENDIDA,
    APAGADA,

    /** Llegó un valor distinto de 0 o 1: no se interpreta. */
    VALOR_NO_RECONOCIDO,

    /** Nunca ha reportado su salida. */
    SIN_REPORTE
}

/** Actuador del galpón con su último reporte, listo para mostrarse. */
data class ActuadorVista(
    val sensor: SensorResponse,
    val nombre: String,
    /** "Relé K2" si se puede deducir el canal; null para motores u otros. */
    val rele: String?,
    val salida: SalidaActuador,
    val vigencia: VigenciaLectura,
    val valor: Double?,
    val fechaHora: String?,
    val errorConsulta: Boolean
)

/**
 * Relés K1-K4 y motores del ESP32. El backend de producción los registra
 * como sensores con unidad "estado" y guarda su salida como medición; no
 * informa el modo (automático/manual) ni admite órdenes remotas.
 */
object Actuadores {

    private val PATRON_CANAL_RELE = Regex("^rele:k([1-4])$", RegexOption.IGNORE_CASE)

    // Registros antiguos sin canal: el firmware reporta los relés con
    // códigos "REL-K<n>-..." (CODIGO_RELE_K* en config.example.h).
    private val PATRON_CODIGO_RELE = Regex("^REL-K([1-4])-", RegexOption.IGNORE_CASE)

    /** Actuadores activos de una lista de sensores (ya filtrada por galpón). */
    fun activos(sensores: List<SensorResponse>): List<SensorResponse> =
        sensores
            .filter { it.estado.equals("activo", ignoreCase = true) && ClasificadorSensores.esActuador(it) }
            .sortedWith(compareBy({ numeroRele(it) ?: Int.MAX_VALUE }, { it.id }))

    /** Número de relé (1-4) por canal o, en registros antiguos, por código. */
    fun numeroRele(sensor: SensorResponse): Int? {
        sensor.canal?.trim()?.let { canal ->
            PATRON_CANAL_RELE.find(canal)?.let { return it.groupValues[1].toInt() }
            // Con otro canal (un GPIO) nunca es un relé, aunque el código lo parezca.
            return null
        }
        return PATRON_CODIGO_RELE.find(sensor.codigo.trim())?.groupValues?.get(1)?.toInt()
    }

    /** Solo 1 y 0 tienen significado; cualquier otro valor no se interpreta. */
    fun salidaDe(valor: Double?): SalidaActuador = when (valor) {
        null -> SalidaActuador.SIN_REPORTE
        1.0 -> SalidaActuador.ENCENDIDA
        0.0 -> SalidaActuador.APAGADA
        else -> SalidaActuador.VALOR_NO_RECONOCIDO
    }

    fun vista(lectura: LecturaDeSensor): ActuadorVista {
        val ultima = if (lectura.errorConsulta) null else lectura.lectura
        val valor = ultima?.valor
        return ActuadorVista(
            sensor = lectura.sensor,
            nombre = lectura.sensor.tipo.trim().ifBlank { lectura.sensor.codigo },
            rele = numeroRele(lectura.sensor)?.let { "Relé K$it" },
            salida = salidaDe(valor),
            vigencia = if (lectura.errorConsulta) VigenciaLectura.SIN_LECTURAS else lectura.vigencia,
            valor = valor,
            fechaHora = ultima?.fecha_hora,
            errorConsulta = lectura.errorConsulta
        )
    }

    /** Texto de la salida reportada; no afirma que el equipo esté funcionando. */
    fun textoSalida(vista: ActuadorVista): String = when (vista.salida) {
        SalidaActuador.ENCENDIDA -> "Salida encendida"
        SalidaActuador.APAGADA -> "Salida apagada"
        SalidaActuador.VALOR_NO_RECONOCIDO ->
            "Valor no reconocido (${String.format(Locale.ROOT, "%s", vista.valor)})"
        SalidaActuador.SIN_REPORTE -> "Sin reportes"
    }
}
