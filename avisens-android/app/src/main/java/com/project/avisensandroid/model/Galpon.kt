package com.project.avisensandroid.model

data class Galpon(
    val id: Int,
    val codigo: String,
    val nombre: String,
)

data class GalponesResponse(
    val data: List<Galpon>,
)