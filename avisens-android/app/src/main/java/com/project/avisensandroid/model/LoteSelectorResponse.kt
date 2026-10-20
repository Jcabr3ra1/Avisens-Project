package com.project.avisensandroid.model

/**
 * Respuesta usada por los Spinners de lotes.
 * Incluye la granja para respetar la granja seleccionada por el usuario.
 */
data class LoteSelectorResponse(
    val id: Int = 0,
    val codigo: String = "",
    val galpon: GalponLoteSelectorResponse? = null
)

data class GalponLoteSelectorResponse(
    val id: Int = 0,
    val nombre: String = "",
    val granja: GranjaLoteSelectorResponse? = null
)

data class GranjaLoteSelectorResponse(
    val id: Int = 0
)
