package com.project.avisensandroid.controller

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.project.avisensandroid.model.UserSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.io.File

object FotosMortalidad {
    fun pendiente(context: Context, id: Int): File? {
        val usuario = UserSession.userId(context) ?: return null
        return File(context.filesDir, "evidencias_mortalidad/registro_${id}_usuario_${usuario}.jpg")
            .takeIf { it.isFile }
    }

    private fun copia(context: Context, id: Int): File? {
        val usuario = UserSession.userId(context) ?: return null
        return File(context.filesDir, "fotos_mortalidad/usuario_${usuario}/registro_${id}.jpg")
    }

    private suspend fun guardarCopia(context: Context, id: Int, bytes: ByteArray) = withContext(Dispatchers.IO) {
        val archivo = copia(context, id) ?: return@withContext
        archivo.parentFile?.mkdirs()
        val temporal = File.createTempFile("foto_", ".tmp", archivo.parentFile)
        try {
            temporal.writeBytes(bytes)
            check(temporal.renameTo(archivo)) { "No se pudo guardar la fotografía local" }
        } finally { temporal.delete() }
    }

    suspend fun obtener(context: Context, id: Int): Bitmap? = withContext(Dispatchers.IO) {
        val local = pendiente(context, id) ?: copia(context, id)?.takeIf { it.isFile }
        local?.let { BitmapFactory.decodeFile(it.path) }?.let { return@withContext it }
        if (!OfflineCache.hayInternet(context)) return@withContext null
        val respuesta = RetrofitClient.api.obtenerFotoMortalidad(id)
        if (!respuesta.isSuccessful) {
            respuesta.errorBody()?.close()
            return@withContext null
        }
        val bytes = respuesta.body()?.use { it.bytes() } ?: return@withContext null
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return@withContext null
        guardarCopia(context, id, bytes)
        bitmap
    }

    suspend fun precargar(context: Context, id: Int) {
        val existe = withContext(Dispatchers.IO) { pendiente(context, id) != null || copia(context, id)?.isFile == true }
        if (!existe) obtener(context, id)?.recycle()
    }

    suspend fun preparar(archivo: File): ByteArray = withContext(Dispatchers.IO) {
        val limites = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(archivo.path, limites)
        require(limites.outWidth > 0 && limites.outHeight > 0)
        var muestra = 1
        while (maxOf(limites.outWidth, limites.outHeight) / muestra > 1600) muestra *= 2
        val bitmap = BitmapFactory.decodeFile(archivo.path, BitmapFactory.Options().apply { inSampleSize = muestra })
            ?: error("Imagen no válida")
        try {
            for (calidad in listOf(90, 75, 60, 45, 30)) {
                val salida = ByteArrayOutputStream()
                check(bitmap.compress(Bitmap.CompressFormat.JPEG, calidad, salida))
                if (salida.size() <= 3 * 1024 * 1024) return@withContext salida.toByteArray()
            }
            error("La fotografía supera 3 MB")
        } finally { bitmap.recycle() }
    }

    suspend fun subir(context: Context, id: Int, bytes: ByteArray): Boolean {
        val usuario = UserSession.userId(context) ?: return false
        val archivo = File(context.filesDir, "evidencias_mortalidad/registro_${id}_usuario_${usuario}.jpg")
        withContext(Dispatchers.IO) { archivo.parentFile?.mkdirs(); archivo.writeBytes(bytes) }
        val respuesta = RetrofitClient.api.subirFotoMortalidad(id, bytes.toRequestBody("image/jpeg".toMediaType()))
        respuesta.body()?.close()
        respuesta.errorBody()?.close()
        if (respuesta.isSuccessful) {
            guardarCopia(context, id, bytes)
            withContext(Dispatchers.IO) { archivo.delete() }
        }
        return respuesta.isSuccessful
    }
}
