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

    fun guardar(
        c: Context,
        tipo: String,
        request: Any,
        foto: ByteArray? = null,
        insumoId: Int? = null
    ): Boolean = synchronized(lock) {
        val usuario = UserSession.userId(c) ?: return@synchronized false
        val lista = JSONArray(prefs(c).getString(KEY, "[]"))
        val item = JSONObject().put("id", UUID.randomUUID().toString())
            .put("usuario", usuario).put("tipo", tipo)
            .put("payload", Gson().toJson(request)).put("estado", "PENDIENTE")
        if (insumoId != null) item.put("insumo_id", insumoId)
        if (foto != null) {
            val archivo = java.io.File(c.filesDir, "hu56_${item.getString("id")}.jpg")
            try {
                archivo.writeBytes(foto)
            } catch (_: Exception) {
                return@synchronized false
            }
            item.put("foto", archivo.name)
        }
        lista.put(item)
        val ok = prefs(c).edit().putString(KEY, lista.toString()).commit()
        if (ok) programar(c)
        ok
    }

    fun programar(c: Context) {
        val trabajo = OneTimeWorkRequestBuilder<Hu56SyncWorker>()
            .setConstraints(
                Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
            )
            .build()
        WorkManager.getInstance(c)
            .enqueueUniqueWork("hu56_sync", ExistingWorkPolicy.APPEND_OR_REPLACE, trabajo)
    }

    fun pendientes(c: Context): Int = synchronized(lock) {
        val lista = JSONArray(prefs(c).getString(KEY, "[]"))
        (0 until lista.length()).count {
            lista.getJSONObject(it)
                .let { item -> item.optInt("usuario") == UserSession.userId(c) && item.optString("estado") != "SINCRONIZADO" }
        }
    }

    internal fun siguiente(c: Context): JSONObject? = synchronized(lock) {
        val lista = JSONArray(prefs(c).getString(KEY, "[]"))
        val usuario = UserSession.userId(c)
        (0 until lista.length()).map { lista.getJSONObject(it) }
            .firstOrNull {
                it.optInt("usuario") == usuario && it.optString("estado") in listOf(
                    "PENDIENTE",
                    "FOTO",
                    "STOCK"
                )
            }
            ?.let { JSONObject(it.toString()) }
    }

    fun registros(c: Context): List<JSONObject> = synchronized(lock) {
        val lista = JSONArray(prefs(c).getString(KEY, "[]"))
        (0 until lista.length()).map { lista.getJSONObject(it) }
            .filter { it.optInt("usuario") == UserSession.userId(c) }
    }

    internal fun guardarIdFoto(c: Context, id: String, registro: Int): Boolean =
        synchronized(lock) {
            val lista = JSONArray(prefs(c).getString(KEY, "[]"))
            for (i in 0 until lista.length()) {
                val item = lista.getJSONObject(i)
                if (item.optString("id") == id) {
                    item.put("registro", registro).put("estado", "FOTO")
                    return@synchronized prefs(c).edit().putString(KEY, lista.toString()).commit()
                }
            }
            false
        }

    internal fun cambiarEstado(
        c: Context,
        id: String,
        estado: String,
        error: String? = null
    ): Boolean = synchronized(lock) {
        val lista = JSONArray(prefs(c).getString(KEY, "[]"))
        for (i in 0 until lista.length()) {
            val item = lista.getJSONObject(i)
            if (item.optString("id") == id) {
                item.put("estado", estado)
                if (error != null) item.put("error", error) else item.remove("error")
                return@synchronized prefs(c).edit().putString(KEY, lista.toString()).commit()
            }
        }
        false
    }
}

class Hu56SyncWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {
    private fun registrarFallo(id: String, response: retrofit2.Response<*>, stock: Boolean) {
        val codigo = response.code()
        val raw = runCatching { response.errorBody()?.string() }.getOrNull()
        val mensaje = runCatching { JSONObject(raw.orEmpty()).optString("message") }.getOrNull()
        val detalle = "HTTP $codigo: ${mensaje?.takeIf { it.isNotBlank() } ?: response.message()}"
        val rechazo = codigo in listOf(400, 401, 403, 404, 409, 422)
        Hu56OfflineQueue.cambiarEstado(
            applicationContext,
            id,
            if (rechazo) (if (stock) "ERROR_STOCK" else "ERROR") else (if (stock) "REVISAR_STOCK" else "REVISAR"),
            detalle
        )
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        RetrofitClient.inicializar(applicationContext)
        if (!UserSession.isLoggedIn(applicationContext)) return@withContext Result.success()
        // Un movimiento con el identificador local exacto confirma el descuento.
        for (item in Hu56OfflineQueue.registros(applicationContext)
            .filter { it.optString("estado") == "REVISAR_STOCK" }) {
            try {
                var pagina = 1
                do {
                    val r = RetrofitClient.api.listarMovimientosInsumo(
                        item.getInt("insumo_id"),
                        pagina,
                        100
                    )
                    val cuerpo = r.body() ?: break
                    if (!r.isSuccessful) break
                    if (cuerpo.data.any { it.motivo == "Consumo móvil ${item.getString("id")}" }) {
                        Hu56OfflineQueue.cambiarEstado(
                            applicationContext,
                            item.getString("id"),
                            "SINCRONIZADO"
                        )
                        break
                    }
                    pagina++
                } while (pagina <= cuerpo.meta.totalPages)
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (_: Exception) { /* Conservar para revisión. */
            }
        }
        while (true) {
            val item = Hu56OfflineQueue.siguiente(applicationContext) ?: break
            val id = item.getString("id")
            if (!OfflineCache.hayInternet(applicationContext)) return@withContext Result.retry()
            if (item.optString("estado") == "STOCK") {
                if (!Hu56OfflineQueue.cambiarEstado(applicationContext, id, "REVISAR_STOCK")) break
                try {
                    val consumo = Gson().fromJson(
                        item.getString("payload"),
                        CreateConsumoDiarioRequest::class.java
                    )
                    val r = RetrofitClient.api.registrarMovimientoInsumo(
                        item.getInt("insumo_id"),
                        RegistrarMovimientoRequest(
                            "salida",
                            requireNotNull(consumo.alimento_kg),
                            "Consumo móvil ${id}",
                            consumo.lote_id
                        )
                    )
                    if (r.isSuccessful) Hu56OfflineQueue.cambiarEstado(
                        applicationContext,
                        id,
                        "SINCRONIZADO"
                    )
                    else registrarFallo(id, r, true)
                } catch (e: kotlinx.coroutines.CancellationException) {
                    throw e
                } catch (e: Exception) {
                    Hu56OfflineQueue.cambiarEstado(
                        applicationContext,
                        id,
                        "REVISAR_STOCK",
                        e.message ?: "Respuesta incierta"
                    )
                }
                continue
            }
            if (item.optString("estado") == "FOTO") {
                try {
                    val archivo = java.io.File(applicationContext.filesDir, item.getString("foto"))
                    if (!FotosMortalidad.subir(
                            applicationContext,
                            item.getInt("registro"),
                            archivo.readBytes()
                        )
                    ) return@withContext Result.retry()
                    if (Hu56OfflineQueue.cambiarEstado(
                            applicationContext,
                            id,
                            "SINCRONIZADO"
                        )
                    ) archivo.delete()
                    else return@withContext Result.retry()
                } catch (e: kotlinx.coroutines.CancellationException) {
                    throw e
                } catch (_: Exception) {
                    return@withContext Result.retry()
                }
                continue
            }
            // Persistir ENVIANDO antes del POST. Ante caída o respuesta incierta,
            // se requiere revisión manual: no repetir un POST potencialmente confirmado.
            if (!Hu56OfflineQueue.cambiarEstado(applicationContext, id, "REVISAR")) break
            try {
                val gson = Gson()
                val payload = item.getString("payload")
                val response = when (item.getString("tipo")) {
                    "mortalidad" -> RetrofitClient.api.crearRegistroMortalidad(
                        gson.fromJson(
                            payload,
                            RegistroMortalidadRequest::class.java
                        )
                    )

                    "sanitario" -> RetrofitClient.api.crearEventoSanitario(
                        gson.fromJson(
                            payload,
                            EventoSanitarioRequest::class.java
                        )
                    )

                    "pesaje" -> RetrofitClient.api.crearPesaje(
                        gson.fromJson(
                            payload,
                            PesajeRequest::class.java
                        )
                    )

                    "consumo" -> RetrofitClient.api.crearConsumoDiario(
                        gson.fromJson(
                            payload,
                            CreateConsumoDiarioRequest::class.java
                        )
                    )

                    else -> null
                }
                if (response?.isSuccessful == true) {
                    val registro = response.body() as? RegistroMortalidadResponse
                    if (item.has("foto") && registro != null) {
                        if (!Hu56OfflineQueue.guardarIdFoto(
                                applicationContext,
                                id,
                                registro.id
                            )
                        ) break
                    } else if (!item.has("foto")) Hu56OfflineQueue.cambiarEstado(
                        applicationContext,
                        id,
                        if (item.has("insumo_id")) "STOCK" else "SINCRONIZADO"
                    )
                } else {
                    if (response != null) registrarFallo(id, response, false)
                    else Hu56OfflineQueue.cambiarEstado(
                        applicationContext,
                        id,
                        "ERROR",
                        "Tipo de registro no reconocido"
                    )
                }
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                Hu56OfflineQueue.cambiarEstado(
                    applicationContext,
                    id,
                    "REVISAR",
                    e.message ?: "Respuesta incierta"
                )
            }
        }
        Result.success()
    }
}
