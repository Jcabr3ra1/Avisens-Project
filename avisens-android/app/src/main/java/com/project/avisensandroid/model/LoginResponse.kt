package com.project.avisensandroid.model

import com.google.gson.annotations.SerializedName

data class LoginResponse(
    @SerializedName("requiere_cambio_password") val requiereCambioPassword: Boolean,
    @SerializedName("access_token") val accessToken: String?,
    @SerializedName("refresh_token") val refreshToken: String?,
    @SerializedName("cambio_password_token") val cambioPasswordToken: String?
)
