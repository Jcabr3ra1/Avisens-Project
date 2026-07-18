package com.project.avisens.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class LoginResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    val usuario: UsuarioResumen,
)

@Serializable
data class UsuarioResumen(
    val id: Int,
    val nombre: String,
    val email: String,
    val rol: String,
)

@Serializable
data class RefreshRequest(@SerialName("refresh_token") val refreshToken: String)

@Serializable
data class TokensResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
)

// La forma paginada del backend { data, meta }, genérica para cualquier listado.
@Serializable
data class PaginatedResponse<T>(val data: List<T>, val meta: PageMeta)

@Serializable
data class PageMeta(
    val total: Int,
    val page: Int,
    val limit: Int,
    val totalPages: Int,
)
