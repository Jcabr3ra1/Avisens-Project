package com.project.avisensandroid.model

import android.content.Context

enum class UserRole(val apiValue: String, val displayName: String) {
    ADMINISTRADOR("administrador", "Administrador"),
    PROPIETARIO("propietario", "Propietario"),
    OPERARIO("operario", "Operario");

    companion object {
        fun fromApiValue(value: String?): UserRole? {
            val normalized = value
                ?.trim()
                ?.lowercase()
                ?.replace("á", "a")
                ?.replace("é", "e")
                ?.replace("í", "i")
                ?.replace("ó", "o")
                ?.replace("ú", "u")
                ?: return null

            return when (normalized) {
                "admin", "administrador" -> ADMINISTRADOR
                "propietario" -> PROPIETARIO
                "operario" -> OPERARIO
                else -> null
            }
        }
    }
}

object UserSession {
    private const val PREFS = "app_prefs"

    const val KEY_TOKEN = "token"
    const val KEY_REFRESH_TOKEN = "refresh_token"
    const val KEY_USER_ID = "usuario_id"
    const val KEY_USER_NAME = "usuario_nombre"
    const val KEY_USER_EMAIL = "usuario_email"
    const val KEY_USER_ROLE = "usuario_rol"
    const val KEY_SESSION_ACTIVE = "sesion_activa"

    fun save(
        context: Context,
        token: String,
        refreshToken: String,
        userId: Int,
        name: String,
        email: String,
        role: UserRole
    ) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putInt(KEY_USER_ID, userId)
            .putString(KEY_USER_NAME, name)
            .putString(KEY_USER_EMAIL, email)
            .putString(KEY_USER_ROLE, role.apiValue)
            .putBoolean(KEY_SESSION_ACTIVE, true)
            .apply()
    }

    fun role(context: Context): UserRole? =
        UserRole.fromApiValue(
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_USER_ROLE, null)
        )

    fun name(context: Context): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_USER_NAME, "Usuario")
            .orEmpty()
            .ifBlank { "Usuario" }

    fun email(context: Context): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_USER_EMAIL, "")
            .orEmpty()

    fun isLoggedIn(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_SESSION_ACTIVE, false) &&
            !context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_TOKEN, null)
                .isNullOrBlank()

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .apply()
    }
}
