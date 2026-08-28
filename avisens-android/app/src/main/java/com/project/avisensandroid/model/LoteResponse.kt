package com.project.avisensandroid.model

data class LoteResponse(
    val id: Int,
    val codigo: String,
    val fecha_ingreso: String,
    val cantidad_inicial: Int,
    val raza: String?,
    val sexo: String?,
    val marca_alimento: String?,
    val costo_pollito_unitario: Double?,
    val presupuesto_total_cop: Double?,
    val fecha_salida_estimada: String?,
    val fecha_salida_real: String?,
    val estado: String,
    val galpon: GalponLoteResponse,
    val proveedor: ProveedorLoteResponse
)

data class GalponLoteResponse(
    val id: Int,
    val nombre: String,
    val granja: GranjaLoteResponse
)

data class GranjaLoteResponse(
    val id: Int,
    val propietario_id: Int
)

data class ProveedorLoteResponse(
    val id: Int,
    val nombre: String
)