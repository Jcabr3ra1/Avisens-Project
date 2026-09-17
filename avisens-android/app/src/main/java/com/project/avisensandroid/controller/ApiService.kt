package com.project.avisensandroid.controller

import com.project.avisensandroid.model.EventoSanitarioRequest
import com.project.avisensandroid.model.EventoSanitarioResponse
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.GranjaResponse
import com.project.avisensandroid.model.InsumoRequest
import com.project.avisensandroid.model.InsumoResponse
import com.project.avisensandroid.model.RegistrarMovimientoRequest
import com.project.avisensandroid.model.TipoAlimentoResponse
import com.project.avisensandroid.model.LoginRequest
import com.project.avisensandroid.model.LoginResponse
import com.project.avisensandroid.model.LoteSelectorResponse
import com.project.avisensandroid.model.PaginatedResponse
import com.project.avisensandroid.model.ProveedorResponse
import com.project.avisensandroid.model.RegistroMortalidadRequest
import com.project.avisensandroid.model.RegistroMortalidadResponse
import com.project.avisensandroid.model.CreateUsuarioRequest
import com.project.avisensandroid.model.UsuarioGestionResponse
import com.project.avisensandroid.model.RolCatalogoResponse
import com.project.avisensandroid.model.AsignarGalponRequest
import com.project.avisensandroid.model.ActualizarEstadoUsuarioRequest
import com.project.avisensandroid.model.UsuarioGalponResponse
import com.project.avisensandroid.model.UserResponse
import com.project.avisensandroid.model.PesajeResponse
import com.project.avisensandroid.model.ConsumoDiarioResponse
import com.project.avisensandroid.model.SensorResponse
import com.project.avisensandroid.model.MedicionResponse
import com.project.avisensandroid.model.AlertaResponse
import com.project.avisensandroid.model.IndicadorLoteResponse
import com.project.avisensandroid.model.ComparacionIndicadorResponse
import com.project.avisensandroid.model.LoteResponse
import com.project.avisensandroid.model.RefreshTokenResponse

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

    @POST("v1/auth/refresh")
    suspend fun refreshToken(
        @Header("Authorization") refreshAuthorization: String
    ): Response<RefreshTokenResponse>

    @GET("v1/auth/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): Response<UserResponse>


    // =========================================================
    // USUARIOS / GESTIÓN DE OPERARIOS
    // =========================================================

    @POST("v1/usuarios")
    suspend fun crearUsuario(
        @Body request: CreateUsuarioRequest
    ): Response<UsuarioGestionResponse>

    @GET("v1/usuarios")
    suspend fun listarUsuarios(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<UsuarioGestionResponse>>

    @GET("v1/usuarios/catalogos/roles")
    suspend fun listarRolesUsuarios(): Response<List<RolCatalogoResponse>>

    @PATCH("v1/usuarios/{id}")
    suspend fun actualizarEstadoUsuario(
        @Path("id") usuarioId: Int,
        @Body request: ActualizarEstadoUsuarioRequest
    ): Response<UsuarioGestionResponse>

    @POST("v1/usuarios/{id}/galpones")
    suspend fun asignarGalpon(
        @Path("id") usuarioId: Int,
        @Body request: AsignarGalponRequest
    ): Response<UsuarioGalponResponse>

    @GET("v1/usuarios/{id}/galpones")
    suspend fun listarGalponesAsignados(
        @Path("id") usuarioId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<UsuarioGalponResponse>>

    @DELETE("v1/usuarios/{id}/galpones/{galponId}")
    suspend fun desasignarGalpon(
        @Path("id") usuarioId: Int,
        @Path("galponId") galponId: Int
    ): Response<Unit>


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

    @POST("v1/insumos/{id}/movimientos")
    suspend fun registrarMovimientoInsumo(
        @Path("id") insumoId: Int,
        @Body request: RegistrarMovimientoRequest
    ): Response<Any>


    // =========================================================
    // TIPOS DE ALIMENTO
    // =========================================================

    @GET("v1/tipos-alimento")
    suspend fun listarTiposAlimento(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<TipoAlimentoResponse>>


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
    ): Response<PaginatedResponse<LoteSelectorResponse>>


    // =========================================================
    // DATOS DEL DASHBOARD DE INICIO
    // =========================================================

    @GET("v1/lotes")
    suspend fun listarLotesCompletos(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<LoteResponse>>

    @GET("v1/pesajes")
    suspend fun listarPesajes(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<PesajeResponse>>

    @GET("v1/consumos-diarios")
    suspend fun listarConsumosDiarios(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<ConsumoDiarioResponse>>

    @GET("v1/sensores")
    suspend fun listarSensores(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<SensorResponse>>

    @GET("v1/mediciones")
    suspend fun listarMediciones(
        @Query("sensor_id") sensorId: Int? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<MedicionResponse>>

    @GET("v1/alertas/galpon/{galponId}")
    suspend fun listarAlertasDeGalpon(
        @Path("galponId") galponId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<AlertaResponse>>

    @GET("v1/indicadores/{loteId}")
    suspend fun listarIndicadoresLote(
        @Path("loteId") loteId: Int
    ): Response<List<IndicadorLoteResponse>>

    @GET("v1/indicadores/{loteId}/comparacion")
    suspend fun compararIndicadorLote(
        @Path("loteId") loteId: Int
    ): Response<ComparacionIndicadorResponse>


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