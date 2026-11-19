package com.project.avisensandroid.model

data class CreateConsumoDiarioRequest(
    val lote_id: Int,
    val fecha: String,
    val tipo_alimento_id: Int? = null,
    val alimento_kg: Double? = null,
    val agua_litros: Double? = null,
    val metodo_registro: String? = "manual"
)
