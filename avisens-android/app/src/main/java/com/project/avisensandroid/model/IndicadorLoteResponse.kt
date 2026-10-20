package com.project.avisensandroid.model

data class IndicadorLoteResponse(
    val id: Int,
    val lote_id: Int,
    val fecha: String,
    val dia_vida: Int?,
    val peso_promedio_g: Double?,
    val fcr: Double?,
    val epef: Double?,
    val mortalidad_acumulada_pct: Double?,
    val consumo_acumulado_g: Double?
)

data class ComparacionIndicadorResponse(
    val dia_vida: Int,
    val dia_curva: Int?,
    val veredicto: String,
    val real: ComparacionRealResponse,
    val objetivo: ComparacionObjetivoResponse?,
    val desvio_peso_pct: Double?,
    val desvio_fcr: Double?
)

data class ComparacionRealResponse(
    val peso_promedio_g: Double?,
    val fcr: Double?
)

data class ComparacionObjetivoResponse(
    val peso_esperado_g: Double?,
    val fcr_objetivo: Double?
)
