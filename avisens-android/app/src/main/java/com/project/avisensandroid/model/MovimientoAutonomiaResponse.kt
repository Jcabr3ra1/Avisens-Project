package com.project.avisensandroid.model

data class MovimientoAutonomiaResponse(
    val tipo_movimiento: String,
    val cantidad: Double,
    val unidad_medida: String?,
    val fecha_movimiento: String,
    val motivo: String? = null
)
