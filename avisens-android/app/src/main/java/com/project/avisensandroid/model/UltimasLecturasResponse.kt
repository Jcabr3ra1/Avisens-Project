package com.project.avisensandroid.model

/**
 * Respuesta de GET /v1/mediciones/ultimas?galpon_id=X: la última medición
 * de cada sensor vigente del galpón, dentro del alcance del usuario.
 *
 * No incluye modelo ni canal: la clasificación del sensor sale de
 * /v1/sensores y se cruza por sensor_id.
 */
data class UltimasLecturasResponse(
    val generado_en: String?,
    val sensores: List<SensorUltimaLecturaResponse>?
)

data class SensorUltimaLecturaResponse(
    val sensor_id: Int,
    val galpon_id: Int?,
    val codigo: String?,
    val tipo: String?,
    val unidad_medida: String?,
    val estado_sensor: String?,
    // Null si el sensor nunca ha reportado una medición.
    val ultima_lectura: UltimaLecturaResponse?
)

data class UltimaLecturaResponse(
    val valor: Double?,
    val fecha_hora: String?,
    // "ok", "sospechosa" o "error", tal como la guardó el backend.
    val calidad: String?,
    // Calculada por el servidor al responder (generado_en - fecha_hora).
    val antiguedad_segundos: Long?
)
