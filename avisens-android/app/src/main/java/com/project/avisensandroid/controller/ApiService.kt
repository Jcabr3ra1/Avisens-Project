package com.project.avisensandroid.controller

import com.project.avisensandroid.model.LoginRequest
import com.project.avisensandroid.model.LoginResponse
import com.project.avisensandroid.model.UserResponse
import com.project.avisensandroid.model.RecuperacionRequest
import com.project.avisensandroid.model.MensajeResponse
import com.project.avisensandroid.model.CambioPasswordRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface ApiService {

    @POST("v1/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("v1/recuperaciones-password/solicitudes")
    suspend fun solicitarRecuperacion(@Body request: RecuperacionRequest): Response<MensajeResponse>

    @POST("v1/recuperaciones-password/cambiar-password")
    suspend fun cambiarPassword(@Header("Authorization") token: String, @Body request: CambioPasswordRequest): Response<MensajeResponse>

    @GET("v1/auth/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): Response<UserResponse>
}