package com.project.avisensandroid.model

data class ProveedorResponse(
    val id: Int,
    val nombre: String,
    val nit: String?,
    val tipo_proveedor: String?,
    val contacto_persona: String?,
    val telefono: String?,
    val email: String?,
    val direccion: String?,
    val activo: Boolean
)