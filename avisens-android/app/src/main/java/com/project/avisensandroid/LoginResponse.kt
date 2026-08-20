package com.project.avisensandroid

data class LoginResponse(
    val id: Int,
    val username: String,
    val email: String,
    val firstName: String,
    val accessToken: String,   // el token vive aquí
    val refreshToken: String
)
