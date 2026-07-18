package com.project.avisens.data.remote

import io.ktor.client.call.body
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.ServerResponseException
import io.ktor.client.statement.HttpResponse
import kotlinx.serialization.Serializable

// Espejo del envoltorio de error unificado del backend NestJS:
// { statusCode, message, errors?, timestamp, path }
@Serializable
data class ApiError(
    val statusCode: Int = 0,
    val message: String = "Error",
    val errors: List<String> = emptyList(),
)

// Error de dominio: la app razona sobre esto, no sobre códigos HTTP.
sealed interface AvisensError {
    data class Validacion(val mensajes: List<String>) : AvisensError
    data object NoAutorizado : AvisensError
    data object Prohibido : AvisensError
    data object NoEncontrado : AvisensError
    data class Conflicto(val mensaje: String) : AvisensError
    data object SinConexion : AvisensError
    data object Servidor : AvisensError
    data class Desconocido(val mensaje: String) : AvisensError
}

// Resultado explícito de cada llamada (mejor que lanzar excepciones por la app).
sealed interface ApiResultado<out T> {
    data class Exito<T>(val dato: T) : ApiResultado<T>
    data class Error(val error: AvisensError) : ApiResultado<Nothing>
}

// Único punto que traduce las excepciones de Ktor -> AvisensError.
suspend fun <T> ejecutar(bloque: suspend () -> T): ApiResultado<T> = try {
    ApiResultado.Exito(bloque())
} catch (e: ClientRequestException) {
    ApiResultado.Error(mapearHttp(e.response))
} catch (e: ServerResponseException) {
    ApiResultado.Error(AvisensError.Servidor)
} catch (e: Exception) {
    // Incluye fallos de red y de (de)serialización. Se puede refinar por
    // plataforma para distinguir SinConexion de otros fallos.
    ApiResultado.Error(AvisensError.Desconocido(e.message ?: "desconocido"))
}

private suspend fun mapearHttp(respuesta: HttpResponse): AvisensError {
    val cuerpo = runCatching { respuesta.body<ApiError>() }.getOrNull()
    return when (respuesta.status.value) {
        400 -> AvisensError.Validacion(
            cuerpo?.errors?.takeIf { it.isNotEmpty() }
                ?: listOf(cuerpo?.message ?: "Datos inválidos"),
        )
        401 -> AvisensError.NoAutorizado
        403 -> AvisensError.Prohibido
        404 -> AvisensError.NoEncontrado
        409 -> AvisensError.Conflicto(cuerpo?.message ?: "Conflicto")
        else -> AvisensError.Desconocido(cuerpo?.message ?: "Error ${respuesta.status.value}")
    }
}
