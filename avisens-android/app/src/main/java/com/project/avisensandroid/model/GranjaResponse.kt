package com.project.avisensandroid.model

data class GranjaResponse(
    val id: Int,
    val nombre: String,
    val direccion: String?,
    val municipio: String?,
    val departamento: String?,
    val latitud: Double?,
    val longitud: Double?,
    val area_total_m2: Double?,
    val activa: Boolean,
    val fecha_creacion: String?,
    val propietario: PropietarioResponse?
)

data class PropietarioResponse(
    val id: Int,
    val nombre_completo: String
)