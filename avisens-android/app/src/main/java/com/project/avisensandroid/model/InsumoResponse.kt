package com.project.avisensandroid.model

data class InsumoResponse(
    val id: Int,
    val nombre: String,
    val tipo: String?,
    val unidad_medida: String,
    val stock_actual: Double?,
    val stock_minimo: Double?,
    val precio_unitario_cop: Double?,
    val proveedor_habitual_id: Int?,
    val ubicacion_almacen: String?,
    val fecha_vencimiento: String?,
    val activo: Boolean
)