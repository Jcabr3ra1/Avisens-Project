package com.project.avisensandroid.model

data class ConsumoDiarioResponse(
    val id: Int,
    val lote_id: Int,
    val tipo_alimento_id: Int?,
    val usuario_id: Int,
    val fecha: String,
    val alimento_kg: Double?,
    val agua_litros: Double?,
    val alerta_agua_baja: Boolean,
    val metodo_registro: String?,
    val fecha_registro: String?,
    val lote: LoteConsumoResponse?,
    val tipo_alimento: TipoAlimentoConsumoResponse?
)

data class LoteConsumoResponse(
    val id: Int,
    val codigo: String
)

data class TipoAlimentoConsumoResponse(
    val id: Int,
    val nombre: String
)
