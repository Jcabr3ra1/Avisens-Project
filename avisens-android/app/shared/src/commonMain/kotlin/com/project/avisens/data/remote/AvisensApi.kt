package com.project.avisens.data.remote

import com.project.avisens.data.remote.dto.LoginRequest
import com.project.avisens.data.remote.dto.LoginResponse
import com.project.avisens.data.remote.dto.PaginatedResponse
import com.project.avisens.data.remote.dto.RefreshRequest
import com.project.avisens.data.remote.dto.UsuarioResumen
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody

// Endpoints tipados del backend. Un método por operación de la API.
class AvisensApi(private val client: HttpClient) {

    suspend fun login(req: LoginRequest): LoginResponse =
        client.post("auth/login") { setBody(req) }.body()

    suspend fun listarUsuarios(page: Int = 1, limit: Int = 20): PaginatedResponse<UsuarioResumen> =
        client.get("usuarios") {
            parameter("page", page)
            parameter("limit", limit)
        }.body()

    suspend fun logout(refreshToken: String) {
        client.post("auth/logout") { setBody(RefreshRequest(refreshToken)) }
    }
}
