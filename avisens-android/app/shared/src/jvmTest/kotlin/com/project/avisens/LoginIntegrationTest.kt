package com.project.avisens

import com.project.avisens.data.auth.AuthRepository
import com.project.avisens.data.auth.TokenStorageEnMemoria
import com.project.avisens.data.remote.ApiResultado
import com.project.avisens.data.remote.AvisensApi
import com.project.avisens.data.remote.crearHttpClient
import kotlinx.coroutines.runBlocking
import kotlin.test.Ignore
import kotlin.test.Test
import kotlin.test.assertTrue

// Prueba de integración: ejercita el login REAL contra el backend NestJS.
// Marcada @Ignore para no romper la suite normal (necesita el backend en
// http://localhost:3000). Para correrla, quita @Ignore y levanta el backend:
//   ./gradlew :app:shared:jvmTest --tests "com.project.avisens.LoginIntegrationTest"
class LoginIntegrationTest {

    @Ignore
    @Test
    fun loginContraBackendLocal() = runBlocking {
        val storage = TokenStorageEnMemoria()
        val client = crearHttpClient(storage, "http://localhost:3000/")
        val repo = AuthRepository(AvisensApi(client), storage)

        val resultado = repo.login("admin@avisens.com", "Admin1234!")

        when (resultado) {
            is ApiResultado.Exito -> {
                println(">>> LOGIN OK -> usuario: ${resultado.dato}")
                println(">>> access token: ${storage.getAccess()?.take(24)}...")
            }
            is ApiResultado.Error -> println(">>> LOGIN FALLO -> ${resultado.error}")
        }
        client.close()

        assertTrue(resultado is ApiResultado.Exito, "El login debía ser exitoso")
    }
}
