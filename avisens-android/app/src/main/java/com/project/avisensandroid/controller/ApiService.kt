package com.project.avisensandroid.controller

import com.project.avisensandroid.model.EventoSanitarioRequest
import com.project.avisensandroid.model.EventoSanitarioResponse
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.GranjaResponse
import com.project.avisensandroid.model.InsumoRequest
import com.project.avisensandroid.model.InsumoResponse
import com.project.avisensandroid.model.LoginRequest
import com.project.avisensandroid.model.LoginResponse
import com.project.avisensandroid.model.LoteResponse
import com.project.avisensandroid.model.PaginatedResponse
import com.project.avisensandroid.model.ProveedorResponse
import com.project.avisensandroid.model.RegistroMortalidadRequest
import com.project.avisensandroid.model.RegistroMortalidadResponse
import com.project.avisensandroid.model.UserResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

    // =========================================================
    // AUTENTICACIÓN
    // =========================================================

    @POST("v1/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    @GET("v1/auth/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): Response<UserResponse>


    // =========================================================
    // INSUMOS
    // =========================================================

    @POST("v1/insumos")
    suspend fun crearInsumo(
        @Body request: InsumoRequest
    ): Response<InsumoResponse>

    @GET("v1/insumos")
    suspend fun listarInsumos(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<InsumoResponse>>


    // =========================================================
    // PROVEEDORES
    // =========================================================

    @GET("v1/proveedores")
    suspend fun listarProveedores(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<ProveedorResponse>>


    // =========================================================
    // GRANJAS
    // =========================================================

    @GET("v1/granjas")
    suspend fun listarGranjas(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<GranjaResponse>>


    // =========================================================
    // GALPONES
    // =========================================================

    @GET("v1/galpones")
    suspend fun listarGalpones(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<GalponResponse>>


    // =========================================================
    // LOTES
    // =========================================================

    @GET("v1/lotes")
    suspend fun listarLotes(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<LoteResponse>>


    // =========================================================
    // REGISTROS DE MORTALIDAD
    // =========================================================

    @POST("v1/registros-mortalidad")
    suspend fun crearRegistroMortalidad(
        @Body request: RegistroMortalidadRequest
    ): Response<RegistroMortalidadResponse>

    @GET("v1/registros-mortalidad")
    suspend fun listarRegistrosMortalidad(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<RegistroMortalidadResponse>>


    // =========================================================
    // EVENTOS SANITARIOS
    // =========================================================

    @POST("v1/eventos-sanitarios")
    suspend fun crearEventoSanitario(
        @Body request: EventoSanitarioRequest
    ): Response<EventoSanitarioResponse>

    @GET("v1/eventos-sanitarios")
    suspend fun listarEventosSanitarios(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<EventoSanitarioResponse>>

    @GET("v1/eventos-sanitarios/{id}")
    suspend fun obtenerEventoSanitario(
        @Path("id") id: Int
    ): Response<EventoSanitarioResponse>

    @PATCH("v1/eventos-sanitarios/{id}")
    suspend fun actualizarEventoSanitario(
        @Path("id") id: Int,
        @Body request: EventoSanitarioRequest
    ): Response<EventoSanitarioResponse>

    @DELETE("v1/eventos-sanitarios/{id}")
    suspend fun eliminarEventoSanitario(
        @Path("id") id: Int
    ): Response<Unit>
}