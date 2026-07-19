package com.project.avisens.data.repository

import com.project.avisens.core.network.ApiResultado
import com.project.avisens.core.network.ejecutar
import com.project.avisens.data.local.TokenStorage
import com.project.avisens.data.remote.AvisensApi
import com.project.avisens.data.remote.dto.LoginRequest
import com.project.avisens.data.remote.dto.UsuarioResumen

// La UI habla con el repositorio, no con la API directamente.
class AuthRepository(
    private val api: AvisensApi,
    private val storage: TokenStorage,
) {
    suspend fun login(email: String, password: String): ApiResultado<UsuarioResumen> =
        ejecutar {
            val res = api.login(LoginRequest(email, password))
            storage.save(res.accessToken, res.refreshToken) // sesión iniciada
            res.usuario
        }

    suspend fun logout() {
        storage.getRefresh()?.let { runCatching { api.logout(it) } } // revoca en el backend
        storage.clear()
    }
}
