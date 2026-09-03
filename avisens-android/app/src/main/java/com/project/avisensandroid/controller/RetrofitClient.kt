package com.project.avisensandroid.controller

import android.content.Context
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {

    private const val BASE_URL =
        "https://avisens-project-production.up.railway.app/"

    private lateinit var appContext: Context

    // =========================================================
    // INICIALIZAR
    // =========================================================

    fun inicializar(context: Context) {

        appContext =
            context.applicationContext
    }

    // =========================================================
    // LOGGING
    // =========================================================

    private val loggingInterceptor =
        HttpLoggingInterceptor().apply {

            level =
                HttpLoggingInterceptor.Level.BODY
        }

    // =========================================================
    // AUTENTICACIÓN
    // =========================================================

    private val authInterceptor =
        Interceptor { chain ->

            val requestOriginal =
                chain.request()

            val path =
                requestOriginal.url.encodedPath

            val requestBuilder =
                requestOriginal.newBuilder()

            if (
                !path.endsWith(
                    "/v1/auth/login"
                )
            ) {

                if (::appContext.isInitialized) {

                    val prefs =
                        appContext.getSharedPreferences(
                            "app_prefs",
                            Context.MODE_PRIVATE
                        )

                    val token =
                        prefs.getString(
                            "token",
                            null
                        )

                    if (!token.isNullOrBlank()) {

                        requestBuilder.header(
                            "Authorization",
                            "Bearer $token"
                        )
                    }
                }
            }

            chain.proceed(
                requestBuilder.build()
            )
        }

    // =========================================================
    // OKHTTP
    // =========================================================

    private val client =
        OkHttpClient.Builder()
            .addInterceptor(
                authInterceptor
            )
            .addInterceptor(
                loggingInterceptor
            )
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
            .create(
                ApiService::class.java
            )
    }
}