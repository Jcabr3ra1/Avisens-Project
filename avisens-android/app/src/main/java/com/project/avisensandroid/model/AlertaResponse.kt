package com.project.avisensandroid.model

data class AlertaResponse(
    val id: Int,
    val galpon_id: Int,
    val lote_id: Int?,
    val sensor_id: Int?,
    val tipo: String,
    val criticidad: String,
    val valor_detectado: Double?,
    val valor_umbral: Double?,
    val mensaje: String?,
    val estado: String,
    val responsable_id: Int?,
    val escalado_a_id: Int?,
    val accion_correctiva: String?,
    val fecha_creacion: String?,
    val fecha_aceptacion: String?,
    val fecha_cierre: String?,
    val galpon: GalponAlertaResponse?,
    val lote: LoteAlertaResponse?,
    val sensor: SensorAlertaResponse?,
    val responsable: UsuarioAlertaResponse?,
    val escalado_a: UsuarioAlertaResponse?
)

data class GalponAlertaResponse(
    val id: Int,
    val nombre: String,
    val codigo: String,
    val granja: GranjaAlertaResponse
)

data class GranjaAlertaResponse(
    val id: Int,
    val nombre: String,
    val propietario_id: Int
)

data class LoteAlertaResponse(
    val id: Int,
    val codigo: String,
    val estado: String
)

data class SensorAlertaResponse(
    val id: Int,
    val codigo: String,
    val tipo: String
)

data class UsuarioAlertaResponse(
    val id: Int,
    val nombre_completo: String,
    val email: String
)
