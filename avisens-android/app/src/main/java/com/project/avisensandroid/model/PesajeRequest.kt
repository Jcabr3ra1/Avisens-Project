package com.project.avisensandroid.model

data class PesajeRequest(
    val lote_id: Int,
    val fecha: String,
    val peso_promedio_g: Double,
    val cantidad_aves_pesadas: Int?,
    val peso_minimo_g: Double? = null,
    val peso_maximo_g: Double? = null,
    val peso_objetivo_g: Double? = null,
    val observaciones: String? = null,
    val metodo_registro: String = "manual"
)

data class PuntoPesoObjetivo(val dia: Int, val peso_esperado_g: Double?)
