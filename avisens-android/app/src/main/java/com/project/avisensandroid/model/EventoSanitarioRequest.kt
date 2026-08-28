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
    val metodo_registro: String? = null,
    val observaciones: String? = null
)