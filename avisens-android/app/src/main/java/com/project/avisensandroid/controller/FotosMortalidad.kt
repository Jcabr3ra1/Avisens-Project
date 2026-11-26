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
        if (respuesta.isSuccessful) withContext(Dispatchers.IO) { archivo.delete() }
        return respuesta.isSuccessful
    }
}
