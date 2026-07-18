package com.project.avisens.data.remote

import com.project.avisens.data.auth.TokenStorage
import com.project.avisens.data.remote.dto.RefreshRequest
import com.project.avisens.data.remote.dto.TokensResponse
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.auth.Auth
import io.ktor.client.plugins.auth.providers.BearerTokens
import io.ktor.client.plugins.auth.providers.bearer
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.request.url
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

// Motor HTTP: no se especifica; cada plataforma aporta el suyo por dependencia
// (OkHttp en Android/escritorio, Darwin en iOS) y Ktor lo detecta solo.
fun crearHttpClient(storage: TokenStorage, baseUrl: String): HttpClient = HttpClient {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }

    defaultRequest {
        url(baseUrl) // p.ej. "https://api.avisens.com/" (+ /api/v1 cuando se versione)
        contentType(ContentType.Application.Json)
    }

    install(Auth) {
        bearer {
            // Adjunta el access token a cada petición.
            loadTokens {
                val access = storage.getAccess()
                val refresh = storage.getRefresh()
                if (access != null && refresh != null) BearerTokens(access, refresh) else null
            }
            // Se dispara SOLO cuando el backend responde 401.
            refreshTokens {
                val refresh = storage.getRefresh() ?: return@refreshTokens null
                // Nota producción: marcar esta petición como refresh (o usar un
                // cliente sin Auth) para evitar bucles si el refresh token expira.
                val nuevos = client.post("auth/refresh") {
                    setBody(RefreshRequest(refresh))      // el backend lo lee del body
                }.body<TokensResponse>()
                storage.save(nuevos.accessToken, nuevos.refreshToken)
                BearerTokens(nuevos.accessToken, nuevos.refreshToken)
            }
        }
    }
}
