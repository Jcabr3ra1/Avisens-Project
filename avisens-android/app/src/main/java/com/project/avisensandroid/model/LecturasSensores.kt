package com.project.avisensandroid.model

/**
 * Si la última medición de un sensor sirve como estado actual. Solo
 * RECIENTE lo es: el resto tiene (o no) un valor que no se puede presentar
 * como estado actual ni usar para decir "Normal" o una alarma.
 */
enum class VigenciaLectura {
    /** Antigüedad entre 0 y 120 s: se muestra como estado actual. */
    RECIENTE,

    /** Hay un valor, pero tiene más de 120 s. */
    OBSOLETA,

    /**
     * Antigüedad negativa: la fecha de la lectura es posterior a la del
     * servidor (reloj del dispositivo adelantado). No se puede confiar.
     */
    HORA_INCONSISTENTE,

    /** Hay un valor, pero el backend no informó su antigüedad. */
    ANTIGUEDAD_DESCONOCIDA,

    /** El sensor nunca ha reportado una medición. */
    SIN_LECTURAS
}

/**
 * Última lectura de un sensor físico ya clasificado. [errorConsulta]
 * distingue "no se pudo consultar" de "nunca ha reportado".
 */
data class LecturaDeSensor(
    val sensor: SensorResponse,
    val lectura: UltimaLecturaResponse?,
    val errorConsulta: Boolean = false
) {
    val vigencia: VigenciaLectura
        get() = LecturasSensores.vigenciaDe(lectura)
}

/**
 * Lecturas de un galpón obtenidas en una sola consulta, separadas en
 * sensores físicos y actuadores (relés y motores).
 */
data class LecturasGalpon(
    val sensores: List<LecturaDeSensor>,
    val actuadores: List<LecturaDeSensor>
) {
    companion object {
        val VACIAS = LecturasGalpon(emptyList(), emptyList())
    }
}

object LecturasSensores {

    /**
     * Separa el resultado de una consulta conjunta según qué sensores son
     * actuadores. Cada lectura conserva su sensor_id.
     */
    fun separar(todas: List<LecturaDeSensor>, actuadores: List<SensorResponse>): LecturasGalpon {
        val idsActuadores = actuadores.map { it.id }.toSet()
        val (deActuadores, deSensores) = todas.partition { it.sensor.id in idsActuadores }
        return LecturasGalpon(sensores = deSensores, actuadores = deActuadores)
    }

    /**
     * Mismo umbral que la web (useMonitoreoAmbiental en develop): más de
     * esto sin una lectura nueva ya no es confiable como estado actual,
     * aunque el valor esté "en rango".
     */
    const val UMBRAL_LECTURA_OBSOLETA_SEG = 120L

    fun vigenciaDe(lectura: UltimaLecturaResponse?): VigenciaLectura {
        if (lectura == null || lectura.valor == null) return VigenciaLectura.SIN_LECTURAS
        // El backend siempre calcula la antigüedad cuando hay lectura; si no
        // llega, no se afirma que sea reciente ni que sea vieja.
        val antiguedad = lectura.antiguedad_segundos
            ?: return VigenciaLectura.ANTIGUEDAD_DESCONOCIDA
        return when {
            antiguedad < 0 -> VigenciaLectura.HORA_INCONSISTENTE
            antiguedad <= UMBRAL_LECTURA_OBSOLETA_SEG -> VigenciaLectura.RECIENTE
            else -> VigenciaLectura.OBSOLETA
        }
    }

    /**
     * Texto del estado de una lectura con valor que no es reciente. Null
     * para RECIENTE y SIN_LECTURAS, que se muestran de otra forma.
     */
    fun etiquetaNoReciente(vigencia: VigenciaLectura): String? = when (vigencia) {
        VigenciaLectura.OBSOLETA -> "Sin lecturas recientes"
        VigenciaLectura.HORA_INCONSISTENTE -> "Hora inconsistente"
        VigenciaLectura.ANTIGUEDAD_DESCONOCIDA -> "Antigüedad desconocida"
        VigenciaLectura.RECIENTE, VigenciaLectura.SIN_LECTURAS -> null
    }

    /**
     * Cruza los sensores clasificados con /v1/mediciones/ultimas por
     * sensor_id. Un sensor que no aparece en la respuesta queda sin lectura.
     */
    fun cruzar(
        sensores: List<SensorResponse>,
        respuesta: UltimasLecturasResponse
    ): List<LecturaDeSensor> {
        val porSensor = respuesta.sensores.orEmpty().associateBy { it.sensor_id }
        return sensores.map { sensor ->
            LecturaDeSensor(sensor, porSensor[sensor.id]?.ultima_lectura)
        }
    }

    /** La consulta falló: ningún sensor tiene un dato confiable. */
    fun conError(sensores: List<SensorResponse>): List<LecturaDeSensor> =
        sensores.map { LecturaDeSensor(it, null, errorConsulta = true) }

    /**
     * Lectura que representa una variable cuando hay varios sensores de la
     * misma: primero la reciente más nueva, después la obsoleta más nueva,
     * después una con hora inconsistente o antigüedad desconocida, después
     * un error de consulta y por último un sensor sin lecturas. Null si la
     * variable no tiene sensor configurado.
     */
    fun elegir(lecturas: List<LecturaDeSensor>, variable: VariableSensor): LecturaDeSensor? {
        val deLaVariable = lecturas.filter { ClasificadorSensores.variableDe(it.sensor) == variable }

        fun masNueva(vigencia: VigenciaLectura) = deLaVariable
            .filter { !it.errorConsulta && it.vigencia == vigencia }
            .minByOrNull { it.lectura?.antiguedad_segundos ?: Long.MAX_VALUE }

        return masNueva(VigenciaLectura.RECIENTE)
            ?: masNueva(VigenciaLectura.OBSOLETA)
            ?: masNueva(VigenciaLectura.HORA_INCONSISTENTE)
            ?: masNueva(VigenciaLectura.ANTIGUEDAD_DESCONOCIDA)
            ?: deLaVariable.firstOrNull { it.errorConsulta }
            ?: deLaVariable.firstOrNull()
    }

    /**
     * Sensores físicos activos que no se pueden asociar sin ambigüedad a una
     * variable conocida (por ejemplo "amoniaco" en ppm sin modelo). Excluye
     * relés, motores y demás actuadores.
     */
    fun sensoresSinIdentificar(sensores: List<SensorResponse>): List<SensorResponse> =
        sensores.filter {
            it.estado.equals("activo", ignoreCase = true) &&
                    !ClasificadorSensores.esActuador(it) &&
                    ClasificadorSensores.variableDe(it) == null
        }

    /**
     * Aviso para corregir la configuración de los sensores sin identificar,
     * con los datos que el backend tiene de cada uno. Null si no hay ninguno.
     */
    fun avisoSinIdentificar(sensores: List<SensorResponse>): String? {
        if (sensores.isEmpty()) return null
        val encabezado = if (sensores.size == 1) {
            "1 sensor registrado no se pudo identificar"
        } else {
            "${sensores.size} sensores registrados no se pudieron identificar"
        }
        return buildString {
            append(encabezado)
            append(". Sus valores no se muestran hasta corregir su tipo, modelo o unidad en la web:")
            sensores.sortedBy { it.id }.forEach { sensor ->
                append("\n• ${sensor.codigo}")
                append(" · tipo: ${sensor.tipo.trim().ifBlank { "no registrado" }}")
                append(" · modelo: ${sensor.modelo?.trim()?.takeIf { it.isNotEmpty() } ?: "no registrado"}")
                append(" · unidad: ${sensor.unidad_medida.trim().ifBlank { "no registrada" }}")
            }
        }
    }
}
