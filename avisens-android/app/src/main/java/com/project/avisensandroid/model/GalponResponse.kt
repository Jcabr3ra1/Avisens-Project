package com.project.avisensandroid.model

data class GalponResponse(
    val id: Int,
    val codigo: String,
    val nombre: String,
    val capacidad_aves: Int?,
    val ancho_metros: Double?,
    val largo_metros: Double?,
    val orientacion: String?,
    val tipo_techo: String?,
    val plano_url: String?,
    val activo: Boolean,
    val fecha_construccion: String?,
    val granja: GranjaGalponResponse
)

data class GranjaGalponResponse(
    val id: Int,
    val nombre: String,
    val propietario_id: Int
)