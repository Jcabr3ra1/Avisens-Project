package com.project.avisensandroid.model

/**
 * Cuerpo de POST /v1/auth/refresh y POST /v1/auth/logout. El backend lee el
 * refresh token del body (ExtractJwt.fromBodyField('refresh_token')), no de
 * la cabecera Authorization.
 */
data class RefreshTokenRequest(
    val refresh_token: String
)

// Nullable: Gson no respeta la nulabilidad de Kotlin, así que una respuesta
// incompleta se valida explícitamente en RenovacionToken.
data class RefreshTokenResponse(
    val access_token: String?,
    val refresh_token: String?
)
