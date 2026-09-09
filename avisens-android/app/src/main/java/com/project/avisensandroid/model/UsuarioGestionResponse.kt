package com.project.avisensandroid.model

data class UsuarioGestionResponse(
    val id: Int,
    val nombre_completo: String,
    val email: String,
    val cedula: String,
    val telefono: String?,
    val activo: Boolean,
    val fecha_creacion: String?,
    val organizacion_id: Int?,
    val rol: RolUsuarioResponse,
    val organizacion: OrganizacionUsuarioResponse?
)

data class RolUsuarioResponse(
    val id: Int,
    val nombre: String
)

data class OrganizacionUsuarioResponse(
    val id: Int,
    val nombre: String
)