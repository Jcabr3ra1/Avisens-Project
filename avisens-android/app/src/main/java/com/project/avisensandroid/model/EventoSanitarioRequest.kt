package com.project.avisensandroid.model

data class EventoSanitarioRequest(
    val lote_id: Int,
    val tipo: String,
    val fecha: String,
    val insumo_id: Int? = null,
    val diagnostico: String? = null,
    val producto: String? = null,
    val dosis: String? = null,
    val via_aplicacion: String? = null,
    val cantidad_aves: Int? = null,
    val observaciones: String? = null,
    val evento_padre_id: Int? = null,
    val cantidad_insumo: Double? = null,
    val metodo_registro: String? = "manual"
)