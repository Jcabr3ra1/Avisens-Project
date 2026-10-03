package com.project.avisensandroid.model

data class InterpretarComandoVozRequest(
    val galpon_id: Int,
    val comando_texto: String,
    val modo_conexion: String = "online",
)

data class SensorResumen(
    val tipo: String?,
    val unidad_medida: String?,
)

data class LecturaAmbiental(
    val valor: String?,
    val sensor: SensorResumen?,
)

data class RespuestaComandoVoz(
    val mensaje: String?,
    val requiere_clarificacion: Boolean?,
    val lecturas: List<LecturaAmbiental> = emptyList(),
)