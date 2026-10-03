package com.project.avisensandroid.model

data class UserResponse(
    val id: Int,
    val username: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val rol: String?
)