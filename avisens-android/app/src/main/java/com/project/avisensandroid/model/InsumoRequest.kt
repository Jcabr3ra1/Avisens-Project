package com.project.avisensandroid.model

data class InsumoRequest(
    val granja_id: Int,
    val nombre: String,
    val tipo: String? = null,
    val unidad_medida: String,
    val stock_actual: Double? = null,
    val stock_minimo: Double? = null,
    val precio_unitario_cop: Double? = null,
    val proveedor_habitual_id: Int? = null,
    val ubicacion_almacen: String? = null,
    val fecha_vencimiento: String? = null
)
