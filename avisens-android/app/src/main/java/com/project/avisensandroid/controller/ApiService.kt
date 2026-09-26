package com.project.avisensandroid.controller

import com.project.avisensandroid.model.LoginRequest
import com.project.avisensandroid.model.LoginResponse
import com.project.avisensandroid.model.UserResponse
import com.project.avisensandroid.model.GalponesResponse
import com.project.avisensandroid.model.InterpretarComandoVozRequest
import com.project.avisensandroid.model.RespuestaComandoVoz
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Query

interface ApiService {

    @POST("v1/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("v1/auth/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): Response<UserResponse>

    @GET("v1/galpones")
    suspend fun listarGalpones(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50,
    ): Response<GalponesResponse>

    @POST("v1/comandos-voz/interpretar")
    suspend fun interpretarComandoVoz(
        @Header("Authorization") token: String,
        @Body request: InterpretarComandoVozRequest,
    ): Response<RespuestaComandoVoz>
}
