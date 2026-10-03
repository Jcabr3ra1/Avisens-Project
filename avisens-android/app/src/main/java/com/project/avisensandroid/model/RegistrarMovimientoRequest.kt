package com.project.avisensandroid.model

data class RegistrarMovimientoRequest(
    val tipo_movimiento: String,
    val cantidad: Double,
    val motivo: String? = null,
    val lote_id: Int? = null,
    val comprobante_url: String? = null
)
