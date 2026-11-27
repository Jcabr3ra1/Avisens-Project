package com.project.avisensandroid.ui.fragments

import android.app.AlertDialog
import android.content.Intent
import android.view.View
import android.widget.*
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.gson.JsonObject
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.model.*
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.*

internal class PanelCrecimiento(private val fragment: Fragment, private val root: View) {
    private fun text(id: Int) = root.findViewById<TextView>(id)
    private val chart = root.findViewById<GraficaCrecimiento>(R.id.grafica)
    private val metric = root.findViewById<Spinner>(R.id.metrica)
    private var lote: LoteResponse? = null
    private var plan: PlanLoteApiResponse? = null
    private var alimento: EstimacionAlimentoApiResponse? = null
    private var pesos = emptyList<PesajeResponse>()
    private var consumos = emptyList<ConsumoDiarioResponse>()
    private var muertes = emptyList<RegistroMortalidadResponse>()
    private var indicadores = emptyList<IndicadorLoteResponse>()
    private var curva: JsonObject? = null
    private var job: Job? = null
    private var clave = ""
    private fun JsonObject.num(k: String): Double? =
        runCatching { get(k).asDouble }.getOrNull()?.takeIf { it.isFinite() }

    private fun JsonObject.obj(k: String): JsonObject? =
        runCatching { getAsJsonObject(k) }.getOrNull()

    private fun JsonObject.rows(k: String): List<JsonObject> =
        runCatching { getAsJsonArray(k).map { it.asJsonObject } }.getOrDefault(emptyList())

    private fun n(v: Double?) =
        v?.let { String.format(Locale("es", "CO"), "%,.1f", it) } ?: "No disponible"

    private fun dia(fecha: String): Int? = runCatching {
        val f = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        ((f.parse(fecha.take(10))!!.time - f.parse(lote!!.fecha_ingreso.take(10))!!.time) / 86400000L).toInt() + 1
    }.getOrNull()?.takeIf { it > 0 }

    init {
        metric.adapter = ArrayAdapter(
            root.context,
            android.R.layout.simple_spinner_dropdown_item,
            listOf("Peso (kg)", "Consumo acumulado (kg)", "Mortalidad acumulada (%)", "FCR")
        )
        metric.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            override fun onItemSelected(
                parent: AdapterView<*>?,
                view: View?,
                position: Int,
                id: Long
            ) = pintar()
        }
        root.findViewById<View>(R.id.reintentar).setOnClickListener { cargar() }
        root.findViewById<View>(R.id.simular).setOnClickListener { simular() }
        root.findViewById<View>(R.id.comparar).setOnClickListener { comparar() }
        root.findViewById<View>(R.id.csv).setOnClickListener { exportar(false) }
        root.findViewById<View>(R.id.csvAlimento).setOnClickListener { exportar(true) }
    }

    fun limpiar() {
        job?.cancel(); lote = null; clave = ""; curva = null; indicadores = emptyList(); pesos =
            emptyList(); consumos = emptyList(); muertes =
            emptyList(); chart.mostrar(emptyList()); text(R.id.estadoCurva).text =
            "Consultando lote…"; text(R.id.resultadoSim).text = ""; text(R.id.detalleCurva).text =
            ""; text(R.id.etapas).text = ""
    }

    fun actualizar(
        l: LoteResponse,
        p: PlanLoteApiResponse?,
        a: EstimacionAlimentoApiResponse?,
        ps: List<PesajeResponse>,
        cs: List<ConsumoDiarioResponse>,
        ms: List<RegistroMortalidadResponse>
    ) {
        lote = l; plan = p; alimento = a; pesos = ps; consumos = cs; muertes = ms
        text(R.id.ciclo).text =
            "Ciclo de crianza · Día ${p?.tiempo?.dia_actual ?: "—"} / ${p?.resultado?.dia_objetivo ?: "—"}"
        text(R.id.etapas).text = a?.desglose?.renglones.orEmpty().joinToString("\n") {
            "${it.tipo_alimento_nombre_snapshot ?: it.etapa ?: "Alimento"} · días ${it.dia_inicio}–${it.dia_fin}: ${
                n(it.consumo_total_kg)
            } kg"
        }.ifBlank { "Desglose de alimento no disponible" }
        val dias = real().size
        val habilitado = dias >= 3 && p?.estado_dia == "calculado" && p.desactualizado != true
        root.findViewById<View>(R.id.simular).isEnabled = habilitado
        root.findViewById<View>(R.id.diaSimulado).visibility =
            if (habilitado) View.VISIBLE else View.GONE
        text(R.id.avisoSimGuia).text =
            if (dias < 3) "Se necesitan al menos tres pesajes en días distintos. ($dias de 3)" else if (!habilitado) "Se necesita un plan vigente calculado." else "Selecciona un día posterior al último pesaje."
        val k = "${l.id}:${p?.id}:${ps.hashCode()}"
        if (clave != k) {
            clave = k; cargar()
        } else pintar()
    }

    private fun cargar() {
        val id = lote?.id ?: return
        job?.cancel(); curva = null; text(R.id.estadoCurva).text =
            "Consultando predicción…"; pintar()
        job = fragment.viewLifecycleOwner.lifecycleScope.launch {
            supervisorScope {
                val ind = async {
                    runCatching {
                        RetrofitClient.api.listarIndicadoresLote(id).body().orEmpty()
                    }.getOrDefault(emptyList())
                }
                try {
                    val r = RetrofitClient.api.curvaCrecimiento(id)
                    if (lote?.id != id) return@supervisorScope
                    curva = r.body().takeIf { r.isSuccessful }
                    text(R.id.estadoCurva).text = if (curva != null) "" else error(r)
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    text(R.id.estadoCurva).text =
                        "Predicción no disponible. Puedes consultar los registros reales."
                }
                indicadores = ind.await(); pintar()
            }
        }
    }

    private fun error(r: retrofit2.Response<*>): String = runCatching {
        com.google.gson.JsonParser.parseString(
            r.errorBody()?.string() ?: "{}"
        ).asJsonObject.get("message").asString
    }.getOrDefault("Consulta no disponible (HTTP ${r.code()})")

    private fun real(): List<Pair<Int, Double>> =
        pesos.mapNotNull { p -> dia(p.fecha)?.let { it to p.peso_promedio_g } }.groupBy { it.first }
            .map { (d, ps) -> d to ps.map { it.second }.average() }.sortedBy { it.first }

    private fun acumulado(datos: List<Pair<Int, Double>>): List<Pair<Int, Double>> {
        var total = 0.0; return datos.groupBy { it.first }.toSortedMap()
            .map { (d, v) -> total += v.sumOf { it.second }; d to total }
    }

    private fun pintar() {
        val serie = curva?.rows("serie").orEmpty()
        fun puntos(k: String) =
            serie.mapNotNull { p -> p.num("dia")?.toInt()?.let { d -> p.num(k)?.let { d to it } } }

        val lineas = when (metric.selectedItemPosition) {
            1 -> listOf(acumulado(consumos.mapNotNull { c -> dia(c.fecha)?.let { d -> c.alimento_kg?.let { d to it } } }))
            2 -> listOf(acumulado(muertes.mapNotNull { m ->
                dia(m.fecha)?.let { d ->
                    d to (100.0 * m.cantidad_aves / (lote?.cantidad_inicial ?: 1).coerceAtLeast(1))
                }
            }))

            3 -> listOf(indicadores.mapNotNull { i -> i.dia_vida?.let { d -> i.fcr?.let { d to it } } }
                .sortedBy { it.first })

            else -> listOf(real(), puntos("proyectado_g"), puntos("estandar_g"), puntos("marca_g"))
        }
        chart.unidadPeso = metric.selectedItemPosition == 0
        chart.mostrar(
            lineas,
            if (metric.selectedItemPosition == 0) puntos("min_g") else emptyList(),
            if (metric.selectedItemPosition == 0) puntos("max_g") else emptyList(),
            if (metric.selectedItemPosition == 0) plan?.peso_objetivo_g else null
        )
        val resumen = curva?.obj("resumen")
        text(R.id.detalleCurva).text =
            if (metric.selectedItemPosition == 0) "Real: verde · Proyección: azul · Estándar: gris · Marca: naranja\nPeso final proyectado: ${
                n(resumen?.num("peso_final_g")?.div(1000))
            } kg" else ""
    }

    private fun simular() {
        val id = lote?.id ?: return
        val d = root.findViewById<EditText>(R.id.diaSimulado).text.toString().toIntOrNull()
        if (d == null || d !in 1..100 || d <= (real().maxOfOrNull { it.first }
                ?: 0) || real().size < 3 || plan?.estado_dia != "calculado" || plan?.desactualizado == true) {
            text(R.id.resultadoSim).text =
                "Necesitas un plan actualizado, tres días de pesaje y un día posterior al último pesaje (máximo 100)."; return
        }
        fragment.viewLifecycleOwner.lifecycleScope.launch {
            text(R.id.resultadoSim).text = "Simulando…"
            try {
                val r = RetrofitClient.api.simularSalida(id, d); if (lote?.id != id) return@launch;
                val b = r.body(); text(R.id.resultadoSim).text =
                    if (r.isSuccessful && b != null) "Peso: ${n(b.num("peso_proyectado_faena_g"))} g\nConsumo: ${
                        n(b.num("consumo_proyectado_kg"))
                    } kg\nMortalidad: ${n(b.num("mortalidad_proyectada_pct"))}%\nFCR: ${n(b.num("fcr_proyectado"))}" else error(
                        r
                    )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                text(R.id.resultadoSim).text = "No se pudo simular."
            }
        }
    }

    private fun comparar() {
        val id = lote?.id ?: return
        fragment.viewLifecycleOwner.lifecycleScope.launch {
            try {
                val otros = mutableListOf<LoteResponse>();
                var page = 1
                while (true) {
                    val r = RetrofitClient.api.listarLotesCompletos(
                        page,
                        100
                    ); if (!r.isSuccessful) throw IllegalStateException(error(r));
                    val data =
                        r.body()?.data.orEmpty(); otros.addAll(data.filter { it.id != id }); if (data.size < 100) break; page++
                }
                if (lote?.id != id) return@launch
                if (otros.isEmpty()) {
                    Toast.makeText(root.context, "No hay otros lotes", Toast.LENGTH_SHORT)
                        .show(); return@launch
                }
                AlertDialog.Builder(root.context).setTitle("Comparar con otro lote")
                    .setItems(otros.map { it.codigo }.toTypedArray()) { _, i ->
                        fragment.viewLifecycleOwner.lifecycleScope.launch {
                            try {
                                val r = RetrofitClient.api.compararLotesGuia(
                                    id,
                                    otros[i].id
                                ); if (lote?.id != id) return@launch;
                                val b = r.body(); if (!r.isSuccessful || b == null) {
                                    text(R.id.detalleCurva).text = error(r); return@launch
                                };
                                val rows = b.rows("serie");
                                val key = when (metric.selectedItemPosition) {
                                    1 -> "alimento_acumulado_kg"; 2 -> "mortalidad_acumulada_pct"; 3 -> "fcr"; else -> "peso_promedio_g"
                                }; chart.unidadPeso =
                                    metric.selectedItemPosition == 0; chart.mostrar(
                                    listOf(
                                        "lote_1",
                                        "lote_2"
                                    ).map { k ->
                                        rows.mapNotNull { p ->
                                            p.num("dia")?.toInt()
                                                ?.let { d -> p.obj(k)?.num(key)?.let { d to it } }
                                        }
                                    }); text(R.id.detalleCurva).text =
                                    "Verde: ${lote?.codigo} · Azul: ${otros[i].codigo}"
                            } catch (e: CancellationException) {
                                throw e
                            } catch (e: Exception) {
                                text(R.id.detalleCurva).text = "Comparación no disponible"
                            }
                        }
                    }.show()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Toast.makeText(
                    root.context,
                    "No se pudieron consultar los lotes",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    private fun exportar(esAlimento: Boolean) {
        val l = lote ?: return
        val contenido =
            if (esAlimento) "dia_inicio,dia_fin,consumo_total_kg\n" + alimento?.desglose?.renglones.orEmpty()
                .joinToString("\n") { "${it.dia_inicio},${it.dia_fin},${it.consumo_total_kg ?: ""}" } else "dia,peso_real_g,peso_proyectado_g,estandar_g\n" + (curva?.rows(
                "serie"
            )?.takeIf { it.isNotEmpty() }?.joinToString("\n") {
                "${it.num("dia")},${it.num("real_g") ?: ""},${it.num("proyectado_g") ?: ""},${
                    it.num("estandar_g") ?: ""
                }"
            } ?: real().joinToString("\n") { "${it.first},${it.second},," })
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"; putExtra(
            Intent.EXTRA_SUBJECT,
            "${l.codigo}.csv"
        ); putExtra(Intent.EXTRA_TEXT, contenido)
        }
        fragment.startActivity(Intent.createChooser(intent, "Compartir datos CSV"))
    }
}
