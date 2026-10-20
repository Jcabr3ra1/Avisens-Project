package com.project.avisensandroid.model

data class PesajeResponse(
    val id: Int,
    val lote_id: Int,
    val fecha: String,
    val peso_promedio_g: Double,
    val cantidad_aves_pesadas: Int?,
    val peso_minimo_g: Double?,
    val peso_maximo_g: Double?,
    val peso_objetivo_g: Double?,
    val alerta_generada: Boolean,
    val usuario_id: Int,
    val metodo_registro: String?,
    val observaciones: String?,
    val fecha_registro: String?,
    val lote: LotePesajeResponse?
)

data class LotePesajeResponse(
    val id: Int,
    val codigo: String
)
