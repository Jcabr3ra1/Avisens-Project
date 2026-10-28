package com.project.avisensandroid.model

data class LoginResponse(
    val access_token: String,
    val refresh_token: String,
    val usuario: UsuarioLoginResponse
)

data class UsuarioLoginResponse(
    val id: Int,
    val nombre: String,
    val email: String,
    val rol: String
)