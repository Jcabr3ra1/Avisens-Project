package com.project.avisensandroid.model

data class RegistroMortalidadResponse(
    val id: Int,
    val lote_id: Int,
    val fecha: String,
    val cantidad_aves: Int,
    val causa_presuntiva: String?,
    val disposicion: String?,
    val alerta_generada: Boolean,
    val usuario_id: Int,
    val metodo_registro: String?,
    val observaciones: String?,
    val fecha_registro: String,
    val lote: LoteMortalidadResponse
)

data class LoteMortalidadResponse(
    val id: Int,
    val codigo: String,
    val galpon: GalponMortalidadResponse
)

data class GalponMortalidadResponse(
    val granja: GranjaMortalidadResponse
)

data class GranjaMortalidadResponse(
    val propietario_id: Int
)