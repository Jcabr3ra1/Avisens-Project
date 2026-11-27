package com.project.avisensandroid.model

/** Umbrales vigentes entregados por GET /v1/umbrales. */
data class UmbralAmbientalResponse(
    val id: Int,
    val galpon_id: Int,
    val variable: String,
    val semana_vida: Int,
    val valor_minimo: Double,
    val valor_maximo: Double,
    val unidad: String,
    val criticidad: String,
    val vigente: Boolean
)
