package com.project.avisens.di

import com.project.avisens.core.network.crearHttpClient
import com.project.avisens.data.local.TokenStorageEnMemoria
import com.project.avisens.data.remote.AvisensApi
import com.project.avisens.data.repository.AuthRepository

// Punto único de construcción de dependencias (DI manual). Mantiene el cliente
// HTTP y los repositorios como una sola instancia, y saca esa lógica de la UI.
// Cuando el proyecto crezca, se puede reemplazar por Koin sin tocar las pantallas.
object ServiceLocator {
    private var authRepo: AuthRepository? = null

    fun authRepository(baseUrl: String): AuthRepository =
        authRepo ?: run {
            val storage = TokenStorageEnMemoria()
            AuthRepository(AvisensApi(crearHttpClient(storage, baseUrl)), storage)
                .also { authRepo = it }
        }
}
