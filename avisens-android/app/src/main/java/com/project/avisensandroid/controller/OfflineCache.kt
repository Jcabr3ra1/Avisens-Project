package com.project.avisensandroid.controller

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.project.avisensandroid.model.UserSession
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import java.io.IOException
import java.security.MessageDigest

object OfflineCache {
    private const val PREFS = "avisens_offline_responses"
    private const val MAX_RESPONSE_CHARS = 750_000

    fun hayInternet(context: Context): Boolean {
        val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val red = manager.activeNetwork ?: return false
        val capacidades = manager.getNetworkCapabilities(red) ?: return false
        return capacidades.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                capacidades.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun clave(context: Context, url: String): String? {
        val usuarioId = UserSession.userId(context) ?: return null
        val raw = "$usuarioId|$url"
        val hash = MessageDigest.getInstance("SHA-256")
            .digest(raw.toByteArray())
            .joinToString("") { "%02x".format(it) }
        return "r_$hash"
    }

    fun ultimoGuardado(context: Context, url: String): Long? {
        val key = clave(context, url) ?: return null
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getLong("${key}_at", 0L).takeIf { it > 0L }
    }

    fun interceptor(context: Context, soloCache: Boolean = false): Interceptor = Interceptor { chain ->
        val request = chain.request()
        // Las fotos son binarias: no deben pasar por la caché de texto.
        val ruta = request.url.encodedPath
        if (ruta.endsWith("/foto")) {
            if (soloCache) throw IOException("Fotografía no disponible sin conexión")
            return@Interceptor chain.proceed(request)
        }
        val esConsulta = request.method == "GET" &&
                request.url.encodedPath.startsWith("/v1/") &&
                !request.url.encodedPath.startsWith("/v1/auth/")
        val key = if (esConsulta) clave(context, request.url.toString()) else null
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

        fun copiaGuardada(): Response? {
            if (key == null) return null
            val contenido = prefs.getString(key, null) ?: return null
            val tipo = prefs.getString("${key}_type", "application/json")
            return Response.Builder()
                .request(request)
                .protocol(Protocol.HTTP_1_1)
                .code(200)
                .message("Copia local sin conexión")
                .header("X-Avisens-Offline", "true")
                .header("X-Avisens-Cached-At", prefs.getLong("${key}_at", 0L).toString())
                .body(contenido.toResponseBody(tipo?.toMediaTypeOrNull()))
                .build()
        }

        if (soloCache) {
            return@Interceptor copiaGuardada() ?: throw IOException("Sin copia local")
        }

        // No hacer esperar al usuario a que venza el timeout si ya sabemos que no hay red.
        if (key != null && !hayInternet(context)) {
            copiaGuardada()?.let { return@Interceptor it }
        }

        try {
            val response = chain.proceed(request)
            if (key == null || !response.isSuccessful) return@Interceptor response
            val body = response.body ?: return@Interceptor response
            val tipo = body.contentType()
            // Solo almacenar JSON; nunca convertir una imagen u otro binario a String.
            if (tipo == null || (tipo.subtype != "json" && !tipo.subtype.endsWith("+json"))) {
                return@Interceptor response
            }
            val contenido = body.string()
            if (contenido.length <= MAX_RESPONSE_CHARS) {
                prefs.edit()
                    .putString(key, contenido)
                    .putString("${key}_type", tipo?.toString() ?: "application/json")
                    .putLong("${key}_at", System.currentTimeMillis())
                    .apply()
            }
            response.newBuilder().body(contenido.toResponseBody(tipo)).build()
        } catch (e: IOException) {
            if (key != null) copiaGuardada()?.let { return@Interceptor it }
            throw e
        }
    }
}