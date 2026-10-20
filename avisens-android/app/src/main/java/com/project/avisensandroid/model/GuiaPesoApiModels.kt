package com.project.avisensandroid.model

/** Contratos del backend para el plan de peso y las curvas genéticas publicadas. */
data class CrearPlanLoteRequest(
    val peso_objetivo_g: Double,
    val motivo: String? = null
)

data class RecalcularPlanLoteRequest(
    val motivo: String? = null
)

data class CrearEstimacionAlimentoRequest(
    val motivo: String? = null
)

data class LineaGeneticaApiResumen(
    val id: Int = 0,
    val codigo: String = "",
    val nombre: String = ""
)

data class CurvaPlanApiResumen(
    val version_id: Int = 0,
    val linea_genetica: LineaGeneticaApiResumen? = null,
    val sexo: String? = null,
    val version: Int? = null,
    val fuente: String? = null
)

data class ResultadoPlanLoteApi(
    val dia_objetivo: Int? = null,
    val dia_objetivo_interpolado: Double? = null,
    val fecha_salida_calculada: String? = null
)

data class TiempoPlanLoteApi(
    val plan_version: Int? = null,
    val situacion: String? = null,
    val dia_actual: Int? = null,
    val dia_objetivo: Int? = null,
    val fecha_estimada: String? = null,
    val dias_restantes: Int? = null,
    val dias_sobre_objetivo: Int? = null
)

data class PlanLoteApiResponse(
    val id: Int = 0,
    val lote_id: Int = 0,
    val version: Int = 0,
    val vigente: Boolean = false,
    val peso_objetivo_g: Double? = null,
    val estado_dia: String? = null,
    val motivo: String? = null,
    val fecha_creacion: String? = null,
    val snapshot: SnapshotPlanLoteApi? = null,
    val curva: CurvaPlanApiResumen? = null,
    val resultado: ResultadoPlanLoteApi? = null,
    val desactualizado: Boolean = false,
    val tiempo: TiempoPlanLoteApi? = null
)

data class SnapshotPlanLoteApi(
    val linea_genetica: LineaGeneticaApiResumen? = null,
    val sexo_curva: String? = null,
    val fecha_ingreso: String? = null
)

data class PuntoCurvaGeneticaApi(
    val id: Int = 0,
    val dia: Int = 0,
    val peso_esperado_g: Double? = null,
    val consumo_diario_g: Double? = null,
    val consumo_acumulado_g: Double? = null,
    val fcr_objetivo: Double? = null
)

data class CurvaGeneticaApiResponse(
    val id: Int = 0,
    val linea_genetica_id: Int = 0,
    val sexo: String? = null,
    val version: Int? = null,
    val estado: String? = null,
    val vigente: Boolean = false,
    val fuente: String? = null,
    val puntos: List<PuntoCurvaGeneticaApi> = emptyList()
)

data class ResultadoEstimacionAlimentoApi(
    val consumo_por_ave_g: Double? = null,
    val consumo_total_kg: Double? = null
)

data class AlimentoEstimadoApi(
    val disponible: Boolean = false,
    val motivo_no_disponible: String? = null,
    val total_kg: String? = null,
    val hasta_corte_kg: String? = null,
    val pendiente_tras_corte_kg: String? = null,
    val pendiente_desde_hoy_kg: String? = null,
    val requiere_recalculo: Boolean = false,
    val motivos_recalculo: List<String> = emptyList()
)

data class PlanVigenteAlimentoApi(
    val id: Int = 0,
    val version: Int = 0,
    val dia_objetivo: Int? = null,
    val desactualizado: Boolean = false,
    val es_el_mismo: Boolean = false,
    val tiempo: TiempoPlanLoteApi? = null
)

data class EstimacionAlimentoApiResponse(
    val id: Int = 0,
    val version: Int = 0,
    val vigente: Boolean = false,
    val estado_alimento: String? = null,
    val fecha_creacion: String? = null,
    val plan: PlanEstimacionAlimentoApi? = null,
    val resultado: ResultadoEstimacionAlimentoApi? = null,
    val plan_vigente: PlanVigenteAlimentoApi? = null,
    val desactualizado: Boolean = false,
    val motivos_desactualizacion: List<String> = emptyList(),
    val alimento_estimado: AlimentoEstimadoApi? = null
)

data class PlanEstimacionAlimentoApi(
    val id: Int = 0,
    val version: Int = 0,
    val dia_objetivo: Int? = null,
    val fecha_salida_calculada: String? = null,
    val curva: CurvaPlanApiResumen? = null
)

/** Curva interpolada de manera lineal solo dentro del rango publicado. */
fun List<PuntoCurvaGeneticaApi>.valorCurvaEnDia(
    dia: Double,
    selector: (PuntoCurvaGeneticaApi) -> Double?
): Double? {
    val puntosOrdenados = this.sortedBy { it.dia }
    if (puntosOrdenados.isEmpty() || dia < puntosOrdenados.first().dia || dia > puntosOrdenados.last().dia) {
        return null
    }
    val exacto = puntosOrdenados.firstOrNull { it.dia.toDouble() == dia }
    if (exacto != null) return selector(exacto)
    val inferior = puntosOrdenados.lastOrNull { it.dia < dia } ?: return null
    val superior = puntosOrdenados.firstOrNull { it.dia > dia } ?: return null
    val valorInferior = selector(inferior) ?: return null
    val valorSuperior = selector(superior) ?: return null
    val proporcion = (dia - inferior.dia) / (superior.dia - inferior.dia)
    return valorInferior + ((valorSuperior - valorInferior) * proporcion)
}
