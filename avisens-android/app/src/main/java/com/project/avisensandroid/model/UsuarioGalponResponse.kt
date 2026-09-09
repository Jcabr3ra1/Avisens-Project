package com.project.avisensandroid.model

data class UsuarioGalponResponse(
    val id: Int,
    val usuario_id: Int,
    val galpon_id: Int,
    val rol_asignacion: String?,
    val fecha_asignacion: String?,
    val activa: Boolean,
    val galpon: GalponAsignadoResponse
)

data class GalponAsignadoResponse(
    val id: Int,
    val codigo: String,
    val nombre: String,
    val activo: Boolean,
    val granja: GranjaAsignadaResponse
)

data class GranjaAsignadaResponse(
    val id: Int,
    val nombre: String,
    val propietario_id: Int,
    val organizacion_id: Int?
)
