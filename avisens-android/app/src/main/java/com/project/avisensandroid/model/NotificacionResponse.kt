package com.project.avisensandroid.model

data class NotificacionResponse(
    val id: Int,
    val usuario_id: Int,
    val tipo: String?,
    val titulo: String?,
    val mensaje: String?,
    val leida: Boolean,
    val referencia_tipo: String?,
    val referencia_id: Int?,
    val fecha_creacion: String?
)

data class ContadorNotificacionesResponse(val no_leidas: Int)
