package com.project.avisensandroid.model

data class EventoSanitarioResponse(
    val id: Int,
    val lote_id: Int,
    val insumo_id: Int?,
    val tipo: String,
    val diagnostico: String?,
    val producto: String?,
    val dosis: String?,
    val via_aplicacion: String?,
    val cantidad_aves: Int?,
    val fecha: String,
    val usuario_id: Int,
    val metodo_registro: String?,
    val observaciones: String?,
    val fecha_registro: String,
    val lote: LoteEventoSanitarioResponse,
    val insumo: InsumoEventoSanitarioResponse?
)

data class LoteEventoSanitarioResponse(
    val id: Int,
    val codigo: String,
    val galpon: GalponEventoSanitarioResponse
)

data class GalponEventoSanitarioResponse(
    val granja: GranjaEventoSanitarioResponse
)

data class GranjaEventoSanitarioResponse(
    val id: Int,
    val propietario_id: Int
)

data class InsumoEventoSanitarioResponse(
    val id: Int,
    val nombre: String
)