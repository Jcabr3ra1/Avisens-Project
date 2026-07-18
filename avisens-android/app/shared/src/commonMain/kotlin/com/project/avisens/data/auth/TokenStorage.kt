package com.project.avisens.data.auth

// Contrato para guardar los JWT. La implementación real debe usar almacenamiento
// seguro por plataforma (EncryptedSharedPreferences en Android, Keychain en iOS).
interface TokenStorage {
    suspend fun getAccess(): String?
    suspend fun getRefresh(): String?
    suspend fun save(access: String, refresh: String)
    suspend fun clear()
}

// Implementación mínima en memoria para el prototipo.
// NO usar en producción: se pierde al cerrar la app y no es segura.
class TokenStorageEnMemoria : TokenStorage {
    private var access: String? = null
    private var refresh: String? = null

    override suspend fun getAccess(): String? = access
    override suspend fun getRefresh(): String? = refresh
    override suspend fun save(access: String, refresh: String) {
        this.access = access
        this.refresh = refresh
    }
    override suspend fun clear() {
        access = null
        refresh = null
    }
}
