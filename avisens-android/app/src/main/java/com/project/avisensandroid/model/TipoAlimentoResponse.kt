package com.project.avisensandroid.model

data class TipoAlimentoResponse(
    val id: Int = 0,
    val nombre: String = "",
    val marca: String? = null,
    val etapa: String? = null,
    val presentacion: String? = null,
    val dia_inicio: Int? = null,
    val dia_fin: Int? = null,
    val consumo_total_esperado_g: Double? = null,
    val activo: Boolean = true
)
