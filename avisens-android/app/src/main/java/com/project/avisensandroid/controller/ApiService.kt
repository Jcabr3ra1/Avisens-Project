package com.project.avisensandroid.controller

import com.google.gson.JsonObject
import com.project.avisensandroid.model.ActualizarEstadoUsuarioRequest
import com.project.avisensandroid.model.AlertaResponse
import com.project.avisensandroid.model.AsignarGalponRequest
import com.project.avisensandroid.model.CerrarAlertaRequest
import com.project.avisensandroid.model.ComparacionIndicadorResponse
import com.project.avisensandroid.model.ConsumoDiarioResponse
import com.project.avisensandroid.model.ContadorNotificacionesResponse
import com.project.avisensandroid.model.CrearEstimacionAlimentoRequest
import com.project.avisensandroid.model.CrearPlanLoteRequest
import com.project.avisensandroid.model.CreateConsumoDiarioRequest
import com.project.avisensandroid.model.CreateUsuarioRequest
import com.project.avisensandroid.model.CurvaGeneticaApiResponse
import com.project.avisensandroid.model.EstimacionAlimentoApiResponse
import com.project.avisensandroid.model.EventoSanitarioRequest
import com.project.avisensandroid.model.EventoSanitarioResponse
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.GranjaResponse
import com.project.avisensandroid.model.IndicadorLoteResponse
import com.project.avisensandroid.model.InsumoRequest
import com.project.avisensandroid.model.InsumoResponse
import com.project.avisensandroid.model.InterpretarComandoVozRequest
import com.project.avisensandroid.model.LoginRequest
import com.project.avisensandroid.model.LoginResponse
import com.project.avisensandroid.model.LoteResponse
import com.project.avisensandroid.model.LoteSelectorResponse
import com.project.avisensandroid.model.MedicionResponse
import com.project.avisensandroid.model.MovimientoAutonomiaResponse
import com.project.avisensandroid.model.NotificacionResponse
import com.project.avisensandroid.model.PaginatedResponse
import com.project.avisensandroid.model.PesajeResponse
import com.project.avisensandroid.model.PlanLoteApiResponse
import com.project.avisensandroid.model.RecalcularPlanLoteRequest
import com.project.avisensandroid.model.RefreshTokenRequest
import com.project.avisensandroid.model.RefreshTokenResponse
import com.project.avisensandroid.model.RegistrarMovimientoRequest
import com.project.avisensandroid.model.RegistroMortalidadRequest
import com.project.avisensandroid.model.RegistroMortalidadResponse
import com.project.avisensandroid.model.RespuestaComandoVoz
import com.project.avisensandroid.model.RolCatalogoResponse
import com.project.avisensandroid.model.SensorResponse
import com.project.avisensandroid.model.SolicitudRecuperacionRequest
import com.project.avisensandroid.model.SolicitudRecuperacionResponse
import com.project.avisensandroid.model.TipoAlimentoResponse
import com.project.avisensandroid.model.UltimasLecturasResponse
import com.project.avisensandroid.model.UmbralAmbientalResponse
import com.project.avisensandroid.model.UserResponse
import com.project.avisensandroid.model.UsuarioGalponResponse
import com.project.avisensandroid.model.UsuarioGestionResponse
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

internal const val RUTA_SOLICITUD_RECUPERACION = "v1/recuperaciones-password/solicitudes"

interface ApiService {

    @GET("v1/predicciones/lote/{id}/curva-crecimiento")
    suspend fun curvaCrecimiento(@Path("id") id: Int): Response<JsonObject>

    @GET("v1/predicciones/lote/{id}/simulacion")
    suspend fun simularSalida(
        @Path("id") id: Int,
        @Query("dia_faena") dia: Int
    ): Response<JsonObject>

    @GET("v1/indicadores/comparar-lotes")
    suspend fun compararLotesGuia(
        @Query("lote1Id") primero: Int,
        @Query("lote2Id") segundo: Int
    ): Response<JsonObject>


    // =========================================================
    // PERFIL
    // =========================================================

    @GET("v1/auth/perfil")
    suspend fun consultarPerfil(): Response<JsonObject>

    @GET("v1/auth/perfil/foto")
    suspend fun consultarFotoPerfil(): Response<ResponseBody>

    @PUT("v1/auth/perfil/foto")
    suspend fun subirFotoPerfil(
        @Body foto: RequestBody
    ): Response<JsonObject>

    @DELETE("v1/auth/perfil/foto")
    suspend fun eliminarFotoPerfil(): Response<JsonObject>

    // =========================================================
    // NOTIFICACIONES
    // =========================================================

    @GET("v1/notificaciones")
    suspend fun listarMisNotificaciones(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<NotificacionResponse>>

    @GET("v1/notificaciones/no-leidas")
    suspend fun contarNotificacionesNoLeidas(): Response<ContadorNotificacionesResponse>

    @PATCH("v1/notificaciones/{id}/leer")
    suspend fun marcarNotificacionLeida(
        @Path("id") id: Int
    ): Response<NotificacionResponse>

    @PATCH("v1/notificaciones/leer-todas")
    suspend fun marcarTodasNotificacionesLeidas(): Response<ResponseBody>

    @DELETE("v1/notificaciones/{id}")
    suspend fun eliminarMiNotificacion(
        @Path("id") id: Int
    ): Response<ResponseBody>

    // =========================================================
    // AUTENTICACIÓN
    // =========================================================

    @POST("v1/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    @POST(RUTA_SOLICITUD_RECUPERACION)
    suspend fun solicitarRecuperacion(
        @Body request: SolicitudRecuperacionRequest
    ): Response<SolicitudRecuperacionResponse>

    // La renovación automática la hace RetrofitClient
    // con su propio cliente.
    @POST("v1/auth/refresh")
    suspend fun refreshToken(
        @Body request: RefreshTokenRequest
    ): Response<RefreshTokenResponse>

    @GET("v1/auth/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): Response<UserResponse>

    // =========================================================
    // ASISTENTE DE VOZ
    // =========================================================

    @POST("v1/comandos-voz/interpretar")
    suspend fun interpretarComandoVoz(
        @Body request: InterpretarComandoVozRequest
    ): Response<RespuestaComandoVoz>

    // =========================================================
    // USUARIOS / GESTIÓN DE OPERARIOS
    // =========================================================

    @PATCH("v1/usuarios/{id}")
    suspend fun editarDatosOperario(
        @Path("id") id: Int,
        @Body datos: JsonObject
    ): Response<UsuarioGestionResponse>

    @POST("v1/usuarios/{id}/restablecer-password")
    suspend fun restablecerPasswordOperario(
        @Path("id") id: Int,
        @Body datos: JsonObject
    ): Response<JsonObject>

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

    @DELETE("v1/usuarios/{id}")
    suspend fun eliminarOperario(
        @Path("id") usuarioId: Int
    ): Response<Unit>

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

    @GET("v1/insumos/{id}/movimientos")
    suspend fun listarMovimientosInsumo(
        @Path("id") insumoId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<MovimientoAutonomiaResponse>>

    // Registrar entrada de insumos.
    // BodegaFragment convierte primero la cantidad
    // a la unidad original del inventario.
    @POST("v1/insumos/{id}/movimientos")
    suspend fun registrarMovimientoInsumo(
        @Path("id") insumoId: Int,
        @Body request: RegistrarMovimientoRequest
    ): Response<Unit>

    // =========================================================
    // TIPOS DE ALIMENTO
    // =========================================================

    @GET("v1/tipos-alimento")
    suspend fun listarTiposAlimento(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<TipoAlimentoResponse>>

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

    @POST("v1/pesajes")
    suspend fun crearPesaje(@Body request: com.project.avisensandroid.model.PesajeRequest): Response<PesajeResponse>

    @PATCH("v1/pesajes/{id}")
    suspend fun editarPesaje(
        @Path("id") id: Int,
        @Body request: com.project.avisensandroid.model.PesajeRequest
    ): Response<PesajeResponse>

    @DELETE("v1/pesajes/{id}")
    suspend fun eliminarPesaje(@Path("id") id: Int): Response<okhttp3.ResponseBody>

    @GET("v1/curvas-objetivo")
    suspend fun curvaObjetivo(
        @Query("marca") marca: String, @Query("sexo") sexo: String,
        @Query("page") page: Int = 1, @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<com.project.avisensandroid.model.PuntoPesoObjetivo>>

    @POST("v1/consumos-diarios")
    suspend fun crearConsumoDiario(
        @Body request: CreateConsumoDiarioRequest
    ): Response<ConsumoDiarioResponse>

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

    // =========================================================
    // VARIABLES AMBIENTALES
    // =========================================================

    @GET("v1/umbrales")
    suspend fun listarUmbralesAmbientales(
        @Query("galpon_id") galponId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<UmbralAmbientalResponse>>

    @POST("v1/umbrales")
    suspend fun crearUmbralAmbiental(
        @Body datos: Map<String, @JvmSuppressWildcards Any>
    ): Response<UmbralAmbientalResponse>

    @PATCH("v1/umbrales/{id}/revisar")
    suspend fun revisarUmbralAmbiental(
        @Path("id") id: Int,
        @Body datos: Map<String, @JvmSuppressWildcards Any>
    ): Response<UmbralAmbientalResponse>

    @GET("v1/mediciones/ultimas")
    suspend fun listarUltimasLecturas(
        @Query("galpon_id") galponId: Int
    ): Response<UltimasLecturasResponse>

    // =========================================================
    // ALERTAS
    // =========================================================

    @GET("v1/alertas/{id}")
    suspend fun consultarAlertaNotificacion(
        @Path("id") id: Int
    ): Response<AlertaResponse>

    @GET("v1/alertas/galpon/{galponId}")
    suspend fun listarAlertasDeGalpon(
        @Path("galponId") galponId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<AlertaResponse>>

    @PATCH("v1/alertas/{id}/aceptar")
    suspend fun aceptarAlerta(
        @Path("id") alertaId: Int
    ): Response<AlertaResponse>

    @PATCH("v1/alertas/{id}/cerrar")
    suspend fun cerrarAlerta(
        @Path("id") alertaId: Int,
        @Body request: CerrarAlertaRequest
    ): Response<AlertaResponse>

    @PATCH("v1/alertas/{id}/escalar/{usuarioId}")
    suspend fun escalarAlerta(
        @Path("id") alertaId: Int,
        @Path("usuarioId") usuarioId: Int
    ): Response<AlertaResponse>

    // =========================================================
    // INDICADORES
    // =========================================================

    @GET("v1/indicadores/{loteId}")
    suspend fun listarIndicadoresLote(
        @Path("loteId") loteId: Int
    ): Response<List<IndicadorLoteResponse>>

    @GET("v1/indicadores/{loteId}/comparacion")
    suspend fun compararIndicadorLote(
        @Path("loteId") loteId: Int
    ): Response<ComparacionIndicadorResponse>

    // =========================================================
    // GUÍA DE PESO
    // =========================================================

    @POST("v1/lotes/{id}/plan")
    suspend fun crearPlanLote(
        @Path("id") loteId: Int,
        @Body request: CrearPlanLoteRequest
    ): Response<PlanLoteApiResponse>

    @GET("v1/lotes/{id}/plan")
    suspend fun obtenerPlanLote(
        @Path("id") loteId: Int
    ): Response<PlanLoteApiResponse>

    @POST("v1/lotes/{id}/plan/recalcular")
    suspend fun recalcularPlanLote(
        @Path("id") loteId: Int,
        @Body request: RecalcularPlanLoteRequest =
            RecalcularPlanLoteRequest()
    ): Response<PlanLoteApiResponse>

    @GET("v1/curvas-geneticas")
    suspend fun listarCurvasGeneticas(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100
    ): Response<PaginatedResponse<CurvaGeneticaApiResponse>>

    @GET("v1/curvas-geneticas/{id}")
    suspend fun obtenerCurvaGenetica(
        @Path("id") curvaId: Int
    ): Response<CurvaGeneticaApiResponse>

    @GET("v1/lotes/{id}/plan/alimento")
    suspend fun obtenerEstimacionAlimento(
        @Path("id") loteId: Int
    ): Response<EstimacionAlimentoApiResponse>

    @POST("v1/lotes/{id}/plan/alimento")
    suspend fun crearEstimacionAlimento(
        @Path("id") loteId: Int,
        @Body request: CrearEstimacionAlimentoRequest =
            CrearEstimacionAlimentoRequest()
    ): Response<EstimacionAlimentoApiResponse>

    // =========================================================
    // REGISTROS DE MORTALIDAD
    // =========================================================

    @POST("v1/registros-mortalidad")
    suspend fun crearRegistroMortalidad(
        @Body request: RegistroMortalidadRequest
    ): Response<RegistroMortalidadResponse>

    @PUT("v1/registros-mortalidad/{id}/foto")
    suspend fun subirFotoMortalidad(
        @Path("id") id: Int,
        @Body foto: RequestBody
    ): Response<ResponseBody>

    @GET("v1/registros-mortalidad/{id}/foto")
    suspend fun obtenerFotoMortalidad(
        @Path("id") id: Int
    ): Response<ResponseBody>

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
