package com.project.avisensandroid.model

data class RegistroMortalidadRequest(
    val lote_id: Int,
    val fecha: String,
    val cantidad_aves: Int,
    val causa_presuntiva: String? = null,
    val disposicion: String? = null,
    val metodo_registro: String? = null,
    val observaciones: String? = null
)