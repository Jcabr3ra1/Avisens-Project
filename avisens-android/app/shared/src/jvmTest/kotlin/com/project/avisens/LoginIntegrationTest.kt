package com.project.avisens

import com.project.avisens.core.network.ApiResultado
import com.project.avisens.di.ServiceLocator
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
        val repo = ServiceLocator.authRepository("http://localhost:3000/")

        val resultado = repo.login("admin@avisens.com", "Admin1234!")

        when (resultado) {
            is ApiResultado.Exito -> println(">>> LOGIN OK -> usuario: ${resultado.dato}")
            is ApiResultado.Error -> println(">>> LOGIN FALLO -> ${resultado.error}")
        }

        assertTrue(resultado is ApiResultado.Exito, "El login debía ser exitoso")
    }
}
