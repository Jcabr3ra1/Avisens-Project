package com.project.avisensandroid.model

data class SensorResponse(
    val id: Int,
    val codigo: String,
    val tipo: String,
    val unidad_medida: String,
    val modelo: String?,
    val fabricante: String?,
    val coordenada_x: Double?,
    val coordenada_y: Double?,
    val altura_metros: Double?,
    val fecha_instalacion: String?,
    val ultima_calibracion: String?,
    val proxima_calibracion: String?,
    val estado: String,
    val galpon: GalponSensorResponse,
    val dispositivo: DispositivoSensorResponse?
)

data class GalponSensorResponse(
    val id: Int,
    val nombre: String,
    val granja: GranjaSensorResponse
)

data class GranjaSensorResponse(
    val id: Int,
    val propietario_id: Int
)

data class DispositivoSensorResponse(
    val id: Int,
    val nombre: String?,
    val codigo_topic: String?
)
