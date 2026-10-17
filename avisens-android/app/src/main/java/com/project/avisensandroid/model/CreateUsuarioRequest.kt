package com.project.avisensandroid.model

data class CreateUsuarioRequest(
    val nombre_completo: String,
    val cedula: String,
    val email: String,
    val password: String,
    val telefono: String?,
    val rol_id: Int
)
