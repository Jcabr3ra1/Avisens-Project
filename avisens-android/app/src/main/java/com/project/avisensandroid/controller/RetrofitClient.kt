package com.project.avisensandroid.controller

import android.content.Context
import com.google.gson.Gson
import com.project.avisensandroid.BuildConfig
import com.project.avisensandroid.model.RefreshTokenRequest
import com.project.avisensandroid.model.RefreshTokenResponse
import com.project.avisensandroid.model.UserSession
import okhttp3.Authenticator
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private const val BASE_URL =
        "https://avisens-project-production.up.railway.app/"

    private val JSON = "application/json; charset=utf-8".toMediaType()

    private lateinit var appContext: Context

    private val refreshLock = Any()

    private val gson = Gson()

    // =========================================================
    // INICIALIZAR
    // =========================================================

    fun inicializar(context: Context) {
        appContext = context.applicationContext
    }

    // =========================================================
    // LOGGING
    // =========================================================

    /**
     * Solo en compilaciones de depuración (BuildConfig.DEBUG, que Gradle
     * genera según el buildType). En release no se registra nada.
     *
     * Aun en depuración, la cabecera Authorization se oculta y las rutas con
     * contraseñas o tokens se registran sin cuerpo (ver RegistroHttp).
     */
    private fun interceptorDeRegistro(): Interceptor? {
        if (!BuildConfig.DEBUG) return null

        val conCuerpo = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
            redactHeader("Authorization")
        }
        val soloCabeceras = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.HEADERS
            redactHeader("Authorization")
        }

        return Interceptor { chain ->
            if (RegistroHttp.registraCuerpo(chain.request().url.encodedPath)) {
                conCuerpo.intercept(chain)
            } else {
                soloCabeceras.intercept(chain)
            }
        }
    }

    // =========================================================
    // AUTENTICACIÓN
    // =========================================================

    private val authInterceptor = Interceptor { chain ->
        val requestOriginal = chain.request()
        val path = requestOriginal.url.encodedPath
        val requestBuilder = requestOriginal.newBuilder()

        // El access token NO se agrega a login ni a refresh.
        if (
            !path.endsWith("/v1/auth/login") &&
            !path.endsWith("/v1/auth/refresh")
        ) {
            if (::appContext.isInitialized) {
                val token = UserSession.accessToken(appContext)

                if (!token.isNullOrBlank()) {
                    requestBuilder.header(
                        "Authorization",
                        "Bearer $token"
                    )
                }
            }
        }

        chain.proceed(requestBuilder.build())
    }

    // =========================================================
    // REFRESH TOKEN AUTOMÁTICO
    // =========================================================

    private val tokenAuthenticator = Authenticator { _: Route?, response: Response ->
        if (!::appContext.isInitialized) {
            return@Authenticator null
        }

        val requestPath = response.request.url.encodedPath

        // Login, refresh y logout no deben intentar refrescar credenciales.
        if (
            requestPath.endsWith("/v1/auth/login") ||
            requestPath.endsWith("/v1/auth/refresh") ||
            requestPath.endsWith("/v1/auth/logout")
        ) {
            return@Authenticator null
        }

        // Evita entrar en un bucle infinito de 401 -> refresh -> 401.
        if (responseCount(response) >= 2) {
            return@Authenticator null
        }

        val failedAccessToken =
            response.request.header("Authorization")
                ?.removePrefix("Bearer ")
                ?.trim()

        synchronized(refreshLock) {
            // Puede que otra petición ya haya renovado los tokens mientras
            // esta petición estaba esperando el lock.
            val currentAccessToken = UserSession.accessToken(appContext)

            if (
                !failedAccessToken.isNullOrBlank() &&
                !currentAccessToken.isNullOrBlank() &&
                currentAccessToken != failedAccessToken
            ) {
                return@Authenticator response.request.newBuilder()
                    .header(
                        "Authorization",
                        "Bearer $currentAccessToken"
                    )
                    .build()
            }

            val refreshToken = UserSession.refreshToken(appContext)

            if (refreshToken.isNullOrBlank()) {
                SesionExpirada.notificar(appContext)
                return@Authenticator null
            }

            when (val resultado = renovarAccessToken(refreshToken)) {
                is ResultadoRenovacion.Renovada -> {
                    UserSession.updateTokens(
                        context = appContext,
                        accessToken = resultado.accessToken,
                        refreshToken = resultado.refreshToken
                    )

                    response.request.newBuilder()
                        .header(
                            "Authorization",
                            "Bearer ${resultado.accessToken}"
                        )
                        .build()
                }

                ResultadoRenovacion.Rechazada -> {
                    // El refresh también expiró/revocó: la sesión ya no es válida.
                    SesionExpirada.notificar(appContext)
                    null
                }

                // Sin red o servidor caído: se conserva la sesión y esta
                // petición devuelve su 401; la siguiente vuelve a intentar.
                ResultadoRenovacion.ErrorTransitorio -> null
            }
        }
    }

    /**
     * Hace el refresh con un cliente OkHttp independiente para que la propia
     * petición de refresh no dispare el Authenticator ni el interceptor de
     * access token.
     *
     * El backend usa jwt-refresh con ExtractJwt.fromBodyField('refresh_token'):
     * espera {"refresh_token": "..."} en el body, no en Authorization.
     */
    private fun renovarAccessToken(refreshToken: String): ResultadoRenovacion {
        val request = Request.Builder()
            .url("${BASE_URL}v1/auth/refresh")
            .post(gson.toJson(RefreshTokenRequest(refreshToken)).toRequestBody(JSON))
            .header("Accept", "application/json")
            .build()

        return try {
            clienteAutenticacion.newCall(request).execute().use { response ->
                val cuerpo = if (response.isSuccessful) {
                    response.body?.string()?.let { texto ->
                        runCatching {
                            gson.fromJson(texto, RefreshTokenResponse::class.java)
                        }.getOrNull()
                    }
                } else {
                    null
                }
                RenovacionToken.clasificar(response.code, cuerpo)
            }
        } catch (_: Exception) {
            // Red caída, timeout o fallo local: no prueba que la sesión
            // sea inválida, así que no se borra.
            ResultadoRenovacion.ErrorTransitorio
        }
    }

    // =========================================================
    // CIERRE DE SESIÓN REMOTO
    // =========================================================

    /**
     * Revoca la sesión en el backend (POST /v1/auth/logout, 204). Es de mejor
     * esfuerzo y asíncrono: la sesión local ya se borró antes de llamarlo,
     * así que un fallo de red no impide cerrar sesión en el teléfono. Si la
     * petición no llega, el refresh token caduca solo en el servidor.
     */
    fun cerrarSesionRemota(refreshToken: String) {
        val request = Request.Builder()
            .url("${BASE_URL}v1/auth/logout")
            .post(gson.toJson(RefreshTokenRequest(refreshToken)).toRequestBody(JSON))
            .build()

        clienteAutenticacion.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) = Unit

            override fun onResponse(call: Call, response: Response) {
                response.close()
            }
        })
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse

        while (prior != null) {
            count++
            prior = prior.priorResponse
        }

        return count
    }

    // =========================================================
    // OKHTTP
    // =========================================================

    // Sin interceptores ni Authenticator: refresh y logout nunca se
    // registran ni disparan otra renovación.
    private val clienteAutenticacion: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    private val client =
        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .authenticator(tokenAuthenticator)
            .apply { interceptorDeRegistro()?.let { addInterceptor(it) } }
            .build()

    // =========================================================
    // RETROFIT
    // =========================================================

    val api: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(
                GsonConverterFactory.create()
            )
            .build()
            .create(ApiService::class.java)
    }
}
