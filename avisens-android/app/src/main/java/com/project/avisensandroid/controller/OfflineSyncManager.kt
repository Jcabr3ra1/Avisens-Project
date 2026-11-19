package com.project.avisensandroid.controller

import android.content.Context
import androidx.work.*
import com.google.gson.Gson
import com.project.avisensandroid.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** Cola local por usuario. No reintenta respuestas ambiguas: el backend no ofrece clave idempotente. */
object Hu56OfflineQueue {
    private const val PREF = "hu56_operaciones_v1"
    private const val KEY = "pendientes"
    private val lock = Any()
    private fun prefs(c: Context) = c.getSharedPreferences(PREF, Context.MODE_PRIVATE)

    fun guardar(c: Context, tipo: String, request: Any): Boolean = synchronized(lock) {
        val usuario = UserSession.userId(c) ?: return@synchronized false
        val lista = JSONArray(prefs(c).getString(KEY, "[]"))
        val item = JSONObject().put("id", UUID.randomUUID().toString())
            .put("usuario", usuario).put("tipo", tipo)
            .put("payload", Gson().toJson(request)).put("estado", "PENDIENTE")
        lista.put(item)
        val ok = prefs(c).edit().putString(KEY, lista.toString()).commit()
        if (ok) programar(c)
        ok
    }

    fun programar(c: Context) {
        val trabajo = OneTimeWorkRequestBuilder<Hu56SyncWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(c).enqueueUniqueWork("hu56_sync", ExistingWorkPolicy.KEEP, trabajo)
    }

    fun pendientes(c: Context): Int = synchronized(lock) {
        val lista = JSONArray(prefs(c).getString(KEY, "[]"))
        (0 until lista.length()).count { lista.getJSONObject(it).optString("estado") != "SINCRONIZADO" }
    }

    internal fun siguiente(c: Context): JSONObject? = synchronized(lock) {
        val lista = JSONArray(prefs(c).getString(KEY, "[]"))
        val usuario = UserSession.userId(c)
        (0 until lista.length()).map { lista.getJSONObject(it) }
            .firstOrNull { it.optInt("usuario") == usuario && it.optString("estado") == "PENDIENTE" }
            ?.let { JSONObject(it.toString()) }
    }

    internal fun cambiarEstado(c: Context, id: String, estado: String): Boolean = synchronized(lock) {
        val lista = JSONArray(prefs(c).getString(KEY, "[]"))
        for (i in 0 until lista.length()) {
            val item = lista.getJSONObject(i)
            if (item.optString("id") == id) {
                item.put("estado", estado)
                return@synchronized prefs(c).edit().putString(KEY, lista.toString()).commit()
            }
        }
        false
    }
}

class Hu56SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        RetrofitClient.inicializar(applicationContext)
        if (!UserSession.isLoggedIn(applicationContext)) return@withContext Result.success()
        while (true) {
            val item = Hu56OfflineQueue.siguiente(applicationContext) ?: break
            val id = item.getString("id")
            // Persistir ENVIANDO antes del POST. Ante caída o respuesta incierta,
            // se requiere revisión manual: no repetir un POST potencialmente confirmado.
            if (!Hu56OfflineQueue.cambiarEstado(applicationContext, id, "REVISAR")) break
            try {
                val gson = Gson()
                val payload = item.getString("payload")
                val response = when (item.getString("tipo")) {
                    "mortalidad" -> RetrofitClient.api.crearRegistroMortalidad(gson.fromJson(payload, RegistroMortalidadRequest::class.java))
                    "sanitario" -> RetrofitClient.api.crearEventoSanitario(gson.fromJson(payload, EventoSanitarioRequest::class.java))
                    "consumo" -> RetrofitClient.api.crearConsumoDiario(gson.fromJson(payload, CreateConsumoDiarioRequest::class.java))
                    else -> null
                }
                if (response?.isSuccessful == true) {
                    Hu56OfflineQueue.cambiarEstado(applicationContext, id, "SINCRONIZADO")
                } else {
                    // Error 4xx/5xx o resultado desconocido: no reintentar a ciegas.
                    break
                }
            } catch (_: Exception) {
                break
            }
        }
        Result.success()
    }
}
