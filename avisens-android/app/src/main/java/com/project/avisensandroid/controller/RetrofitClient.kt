package com.project.avisensandroid.controller

import android.content.Context
import com.google.gson.Gson
import com.project.avisensandroid.model.RefreshTokenResponse
import com.project.avisensandroid.model.UserSession
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {

    private const val BASE_URL =
        "https://avisens-project-production.up.railway.app/"

    private lateinit var appContext: Context

    private val refreshLock = Any()

    // =========================================================
    // INICIALIZAR
    // =========================================================

    fun inicializar(context: Context) {
        appContext = context.applicationContext
    }

    // =========================================================
    // LOGGING
    // =========================================================

    private val loggingInterceptor =
        HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
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
                UserSession.clear(appContext)
                return@Authenticator null
            }

            val nuevosTokens = renovarAccessToken(refreshToken)

            if (nuevosTokens == null) {
                // El refresh también expiró/revocó: la sesión ya no es válida.
                UserSession.clear(appContext)
                return@Authenticator null
            }

            UserSession.updateTokens(
                context = appContext,
                accessToken = nuevosTokens.access_token,
                refreshToken = nuevosTokens.refresh_token
            )

            response.request.newBuilder()
                .header(
                    "Authorization",
                    "Bearer ${nuevosTokens.access_token}"
                )
                .build()
        }
    }

    /**
     * Hace el refresh con un cliente OkHttp independiente para que la propia
     * petición de refresh no dispare el Authenticator ni el interceptor de
     * access token.
     *
     * El backend usa jwt-refresh, por lo que espera el refresh token en:
     * Authorization: Bearer <refresh_token>
     */
    private fun renovarAccessToken(refreshToken: String): RefreshTokenResponse? {
        val request = Request.Builder()
            .url("${BASE_URL}v1/auth/refresh")
            .post(okhttp3.RequestBody.create(null, ByteArray(0)))
            .header("Authorization", "Bearer $refreshToken")
            .header("Accept", "application/json")
            .build()

        val refreshClient = OkHttpClient.Builder()
            .build()

        return try {
            refreshClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return null
                }

                val body = response.body?.string()
                    ?: return null

                Gson().fromJson(
                    body,
                    RefreshTokenResponse::class.java
                )
            }
        } catch (_: Exception) {
            null
        } finally {
            refreshClient.dispatcher.executorService.shutdown()
            refreshClient.connectionPool.evictAll()
        }
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

    private val client =
        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .authenticator(tokenAuthenticator)
            .addInterceptor(loggingInterceptor)
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