package com.project.avisensandroid.model

data class MedicionResponse(
    val id: Int,
    val sensor_id: Int,
    val fecha_hora: String,
    val valor: Double,
    val calidad: String?
)
