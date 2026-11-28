package com.project.avisensandroid.ui.fragments

import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import com.project.avisensandroid.ui.estiloCancelar
import android.content.Intent
import android.content.ClipData
import android.graphics.Paint
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.RectF
import android.text.SpannableStringBuilder
import android.text.style.ForegroundColorSpan
import android.text.Spanned
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import java.io.File
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

    private val leyendaPeso: LinearLayout = crearLeyendaPeso()

    private fun crearLeyendaPeso(): LinearLayout {
        val detalle = text(R.id.detalleCurva)
        val contexto = detalle.context
        fun dp(valor: Int) = (valor * contexto.resources.displayMetrics.density + 0.5f).toInt()
        val contenedor = LinearLayout(contexto).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            visibility = View.GONE
            setPadding(0, dp(8), 0, dp(4))
        }
        val columnas = listOf(
            listOf(0, 2, 4),
            listOf(1, 3)
        )
        val nombres = listOf("Peso real", "Proyección", "Estándar genético", "Curva de marca", "Meta de peso")
        columnas.forEach { indices ->
            val columna = LinearLayout(contexto).apply {
                orientation = LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
            }
            indices.forEach { indice ->
                val etiqueta = TextView(contexto).apply {
                    setTextColor(detalle.textColors)
                    setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, detalle.textSize)
                    typeface = detalle.typeface
                    gravity = android.view.Gravity.CENTER
                    text = leyendaColores(listOf(nombres[indice]), colorInicial = indice)
                }
                columna.addView(etiqueta, LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = dp(4); bottomMargin = dp(4) })
            }
            contenedor.addView(columna, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        }
        val padre = detalle.parent as LinearLayout
        padre.addView(contenedor, padre.indexOfChild(detalle), LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
        ))
        return contenedor
    }

    private fun configurarSelector(selector: Spinner) {
        val ctx = selector.context
        val opciones = listOf("Peso (kg)", "Consumo acumulado (kg)", "Mortalidad acumulada (%)", "FCR")
        val color = ContextCompat.getColor(ctx, R.color.text_primary)
        selector.setBackgroundResource(R.drawable.bg_spinner_avisens)
        selector.setPopupBackgroundResource(R.drawable.bg_dialog_redondeado)
        selector.adapter = object : ArrayAdapter<String>(ctx, R.layout.spinner_item, opciones) {
            override fun getView(position: Int, convertView: View?, parent: android.view.ViewGroup): View {
                return (super.getView(position, convertView, parent) as TextView).apply {
                    setTextColor(color)
                    setCompoundDrawablesRelativeWithIntrinsicBounds(0, 0, R.drawable.ic_spinner_flecha_granja, 0)
                    compoundDrawablesRelative[2]?.mutate()?.setTint(color)
                }
            }
            override fun getDropDownView(position: Int, convertView: View?, parent: android.view.ViewGroup): View {
                return TextView(ctx).apply {
                    text = opciones[position]
                    textSize = 13f
                    typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
                    setTextColor(color)
                    gravity = android.view.Gravity.CENTER_VERTICAL
                    minimumHeight = (48 * resources.displayMetrics.density).toInt()
                    setBackgroundResource(R.drawable.bg_spinner_dropdown_avisens)
                    isActivated = position == selector.selectedItemPosition
                }
            }
        }
    }

    private fun mostrarDialogo(builder: AlertDialog.Builder): AlertDialog {
        return builder.create().apply {
            show()
            window?.setBackgroundDrawableResource(R.drawable.bg_dialog_redondeado)
            estiloCancelar()
        }
    }

    init {
        configurarSelector(metric)
        metric.minimumHeight = (48 * root.resources.displayMetrics.density).toInt()
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
        root.findViewById<View>(R.id.comparar).apply {
            visibility = if (UserSession.role(root.context)?.apiValue.equals("PROPIETARIO", true)) View.VISIBLE else View.GONE
            setOnClickListener { comparar() }
        }
        root.findViewById<View>(R.id.pdfReporte).setOnClickListener { exportarPdf() }
        root.findViewById<View>(R.id.csv).setOnClickListener { exportar(false) }
        root.findViewById<View>(R.id.csvAlimento).setOnClickListener { exportar(true) }
    }

    fun limpiar() {
        leyendaPeso.visibility = View.GONE
        job?.cancel(); lote = null; plan = null; alimento = null; clave = ""; curva = null; indicadores = emptyList(); pesos =
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
        job?.cancel()
        job = fragment.viewLifecycleOwner.lifecycleScope.launch {
            suspend fun consultar(cache: Boolean) = supervisorScope {
                val api = if (cache) RetrofitClient.apiCache else RetrofitClient.api
                val ind = async {
                    try { api.listarIndicadoresLote(id).body() }
                    catch (e: CancellationException) { throw e }
                    catch (_: Exception) { null }
                }
                try {
                    val r = api.curvaCrecimiento(id)
                    if (lote?.id != id) return@supervisorScope
                    if (r.isSuccessful) { curva = r.body(); text(R.id.estadoCurva).text = "" }
                    else if (!cache) { curva = null; text(R.id.estadoCurva).text = error(r) }
                } catch (e: CancellationException) { throw e }
                catch (_: Exception) {
                    if (!cache && curva == null) text(R.id.estadoCurva).text = "Predicción no disponible. Puedes consultar los registros reales."
                }
                val datos = ind.await()
                if (lote?.id == id) {
                    if (datos != null) indicadores = datos
                    pintar()
                }
            }
            consultar(true)
            if (com.project.avisensandroid.controller.OfflineCache.hayInternet(root.context)) consultar(false)
        }
    }

    fun refrescarConsultas() { cargar() }

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

            else -> listOf(real(), if (real().size >= 3) puntos("proyectado_g") else emptyList(), puntos("estandar_g"), puntos("marca_g"))
        }
        chart.unidadPeso = metric.selectedItemPosition == 0
        chart.diaHoy = if (chart.unidadPeso) curva?.num("dia_actual")?.toInt() ?: plan?.tiempo?.dia_actual else null
        chart.nombreGenetica = curva?.obj("referencias")?.obj("genetica")?.str("linea") ?: lote?.linea_genetica?.nombre.orEmpty()
        chart.nombreMarca = curva?.obj("referencias")?.obj("marca")?.str("marca").orEmpty()
        chart.mostrar(
            lineas,
            if (metric.selectedItemPosition == 0 && real().size >= 3) puntos("min_g") else emptyList(),
            if (metric.selectedItemPosition == 0 && real().size >= 3) puntos("max_g") else emptyList(),
            if (metric.selectedItemPosition == 0) plan?.peso_objetivo_g else null
        )
        val resumen = curva?.obj("resumen")
        val mostrarPeso = metric.selectedItemPosition == 0
        leyendaPeso.visibility = if (mostrarPeso) View.VISIBLE else View.GONE
        text(R.id.detalleCurva).text = if (mostrarPeso) {
            if (real().size < 3) "Las proyecciones aparecen después de registrar tres pesajes en días distintos." else "Peso final proyectado: " + (resumen?.num("peso_final_g")?.let { "${n(it / 1000)} kg" } ?: "No disponible")
        } else ""
    }

    private fun leyendaColores(nombres: List<String>, dosColumnas: Boolean = false, colorInicial: Int = 0): SpannableStringBuilder {
        val colores = intArrayOf(Color.rgb(48, 150, 96), Color.rgb(70, 140, 220), Color.GRAY,
            Color.rgb(220, 145, 50), Color.rgb(220, 75, 75))
        return SpannableStringBuilder().apply {
            nombres.forEachIndexed { i, nombre ->
                if (i > 0) append(if (!dosColumnas || i % 2 == 0) "\n" else "     ")
                val inicio = length
                append("●")
                setSpan(ForegroundColorSpan(colores[(i + colorInicial) % colores.size]), inicio, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                append("  $nombre")
            }
        }
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
                    aviso("No hay otros lotes"); return@launch
                }
                seleccionarLote(otros) { i ->
                        fragment.viewLifecycleOwner.lifecycleScope.launch {
                            try {
                                val r = RetrofitClient.api.compararLotesGuia(
                                    id,
                                    otros[i].id
                                ); if (lote?.id != id) return@launch;
                                val b = r.body(); if (!r.isSuccessful || b == null) {
                                    aviso(error(r)); return@launch
                                };
                                mostrarComparacion(b, lote?.codigo.orEmpty(), otros[i].codigo)
                            } catch (e: CancellationException) {
                                throw e
                            } catch (e: Exception) {
                                aviso("Comparación no disponible")
                            }
                        }
                    }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                aviso("No se pudieron consultar los lotes")
            }
        }
    }

    private fun JsonObject.str(k: String): String = runCatching { get(k).asString }.getOrDefault("—")

    private fun bloqueDialogo(): LinearLayout = LinearLayout(root.context).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(20), dp(20), dp(20), dp(20))
    }
    private fun dp(v: Int) = (v * root.resources.displayMetrics.density + .5f).toInt()
    private fun etiqueta(t: String, fuerte: Boolean = false) = TextView(root.context).apply {
        text = t; textSize = if (fuerte) 16f else 13f
        setTextColor(ContextCompat.getColor(context, R.color.text_primary))
        typeface = Typeface.create("sans-serif", if (fuerte) Typeface.BOLD else Typeface.NORMAL)
        setPadding(dp(4), dp(6), dp(4), dp(6))
    }
    private fun botonDialogo(t: String, principal: Boolean, accion: () -> Unit): TextView = etiqueta(t, true).apply {
        gravity = android.view.Gravity.CENTER
        minimumHeight = dp(48)
        background = android.graphics.drawable.GradientDrawable().apply {
            cornerRadius = dp(10).toFloat()
            setColor(if (principal) Color.rgb(40,123,83) else Color.TRANSPARENT)
            setStroke(dp(1), Color.rgb(40,123,83))
        }
        if (principal) setTextColor(Color.WHITE)
        setOnClickListener { accion() }
        isFocusable = true
    }
    private fun superficie(color: Int, borde: Int, radio: Int = 12) = android.graphics.drawable.GradientDrawable().apply {
        cornerRadius = dp(radio).toFloat()
        setColor(color)
        setStroke(dp(1), borde)
    }

    private fun seleccionarLote(otros: List<LoteResponse>, elegir: (Int) -> Unit) {
        val ctx = root.context
        val verde = Color.rgb(47, 143, 101)
        val panel = bloqueDialogo()
        val dialog = AlertDialog.Builder(ctx).setView(panel).create()
        panel.addView(etiqueta("⇄", true).apply {
            textSize = 28f
            gravity = android.view.Gravity.CENTER
            setTextColor(verde)
            background = superficie(0x22309865, verde, 28)
        }, LinearLayout.LayoutParams(dp(56), dp(56)).apply { gravity = android.view.Gravity.CENTER_HORIZONTAL })
        panel.addView(etiqueta("Comparar con otro lote", true).apply { gravity = android.view.Gravity.CENTER })
        panel.addView(etiqueta("Selecciona el lote para consultar su rendimiento.").apply { gravity = android.view.Gravity.CENTER })
        val lista = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        otros.forEachIndexed { i, item ->
            lista.addView(botonDialogo(item.codigo + "   ›", false) { dialog.dismiss(); elegir(i) },
                LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(8) })
        }
        panel.addView(ScrollView(ctx).apply { addView(lista) }, LinearLayout.LayoutParams(-1, -2).apply { height = dp(minOf(otros.size * 56, 280)) })
        panel.addView(botonDialogo("Cancelar", false) { dialog.dismiss() }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(16) })
        dialog.show()
        dialog.window?.setBackgroundDrawableResource(R.drawable.bg_dialog_redondeado)
    }

    private fun mostrarComparacion(b: JsonObject, primero: String, segundo: String) {
        val ctx = root.context
        val contenido = bloqueDialogo()
        val verde = Color.rgb(47, 143, 101)
        val azul = Color.rgb(76, 157, 199)
        val tinta = ContextCompat.getColor(ctx, R.color.text_primary)
        val panel = bloqueDialogo()
        panel.addView(etiqueta("Comparativa histórica de lotes", true).apply { gravity = android.view.Gravity.CENTER })
        panel.addView(etiqueta("Rendimiento por ciclo productivo").apply { gravity = android.view.Gravity.CENTER })
        contenido.setPadding(0, dp(8), 0, dp(8))
        val resumen = listOf("lote_1", "lote_2").mapIndexed { i, k ->
            val o = b.obj(k)
            listOf(if (i == 0) primero else segundo, o?.str("estado") ?: "—",
                o?.str("granja") ?: "—", o?.str("galpon") ?: "—",
                o?.str("duracion_dias") ?: "—", o?.str("cantidad_inicial") ?: "—",
                o?.str("cantidad_aves_vendidas") ?: "—", o?.str("peso_promedio_final_g") ?: "—",
                o?.str("mortalidad_acumulada_final_pct") ?: "—", o?.str("fcr_final") ?: "—")
        }
        val labels = listOf("Lote", "Estado", "Granja", "Galpón", "Duración (días)", "Aves iniciales", "Aves vendidas", "Peso final (g)", "Mortalidad final (%)", "FCR final")
        resumen.forEachIndexed { i, valores ->
            val acento = if (i == 0) verde else azul
            val tarjeta = bloqueDialogo().apply {
                background = superficie((acento and 0x00ffffff) or 0x11000000, acento)
                setPadding(dp(12), dp(10), dp(12), dp(10))
            }
            tarjeta.addView(etiqueta(if (i == 0) "● Lote base" else "● Lote comparado", true).apply { setTextColor(acento) })
            tarjeta.addView(etiqueta(valores[0], true))
            tarjeta.addView(etiqueta("${valores[2]} · ${valores[3]} · ${valores[1]}"))
            (4..9).chunked(2).forEach { indices ->
                val fila = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
                indices.forEach { j ->
                    val celda = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
                    celda.addView(etiqueta(labels[j]).apply { textSize = 12f; alpha = .8f })
                    celda.addView(etiqueta(valores[j], true))
                    fila.addView(celda, LinearLayout.LayoutParams(0, -2, 1f))
                }
                tarjeta.addView(fila)
            }
            contenido.addView(tarjeta, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(12) })
        }
        val claves = listOf("peso_promedio_g", "mortalidad_acumulada_pct", "alimento_acumulado_kg", "fcr")
        val headers = listOf("Día", "Peso 1 (g)", "Peso 2 (g)", "Mort. 1 (%)", "Mort. 2 (%)", "Alim. 1 (kg)", "Alim. 2 (kg)", "FCR 1", "FCR 2")
        val filas = b.rows("serie").map { o -> listOf(o.str("dia")) + claves.flatMap { k ->
            listOf(o.obj("lote_1")?.num(k), o.obj("lote_2")?.num(k)).map { it?.let { v -> String.format(Locale("es","CO"), "%.2f", v) } ?: "—" }
        } }
        contenido.addView(etiqueta("Evolución diaria · ${filas.size} días", true))
        contenido.addView(etiqueta("● Lote 1: $primero").apply { setTextColor(verde) })
        contenido.addView(etiqueta("● Lote 2: $segundo").apply { setTextColor(azul) })
        contenido.addView(etiqueta("Desliza horizontalmente para ver todas las métricas."))
        val tabla = TableLayout(ctx)
        (listOf(headers) + filas).forEachIndexed { i, fila ->
            val row = TableRow(ctx)
            fila.forEachIndexed { j, v ->
                row.addView(etiqueta(v, i == 0).apply {
                    gravity = android.view.Gravity.CENTER
                    textSize = 12f
                    setTextColor(if (i == 0) Color.WHITE else if (j == 0) tinta else if (j % 2 == 1) verde else azul)
                    background = superficie(if (i == 0) Color.rgb(38, 105, 76) else if (i % 2 == 0) 0x10309865 else Color.TRANSPARENT, 0x224D8268, 0)
                }, TableRow.LayoutParams(dp(if (j == 0) 52 else 100), dp(42)))
            }
            tabla.addView(row)
        }
        contenido.addView(HorizontalScrollView(ctx).apply { addView(tabla) })
        panel.addView(ScrollView(ctx).apply { addView(contenido) }, LinearLayout.LayoutParams(-1, 0, 1f))
        val dialog = AlertDialog.Builder(ctx).setView(panel).create()
        val acciones = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
        acciones.addView(botonDialogo("Cerrar", false) { dialog.dismiss() }, LinearLayout.LayoutParams(0, -2, 1f).apply { marginEnd = dp(8) })
        acciones.addView(botonDialogo("Guardar PDF", true) {
            dialog.dismiss()
            generarArchivo(primero, "comparacion.pdf", "application/pdf") { archivo ->
                val pdf = PdfDocument()
                try {
                    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
                    val lineas = listOf("Comparativa histórica de lotes", "$primero / $segundo") + labels.indices.map { j -> "${labels[j]}: ${resumen[0][j]} / ${resumen[1][j]}" }
                    val grupos = filas.chunked(23).ifEmpty { listOf(emptyList()) }
                    grupos.forEachIndexed { i, grupo ->
                        val page = pdf.startPage(PdfDocument.PageInfo.Builder(842, 595, i+1).create())
                        paint.color = Color.rgb(37,105,75); paint.textSize = 17f
                        page.canvas.drawText("AVISENS · Comparativa histórica", 24f, 30f, paint)
                        paint.textSize = 9f; paint.color = Color.DKGRAY
                        val info = if (i == 0) lineas else lineas.take(2)
                        info.forEachIndexed { j, s -> page.canvas.drawText(s,24f,48f+j*11f,paint) }
                        val top = 190f
                        (listOf(headers)+grupo).forEachIndexed { j, row ->
                            if (j % 2 == 0) { paint.color = Color.rgb(235,245,239); page.canvas.drawRect(24f,top+j*15f,818f,top+j*15f+15f,paint) }
                            paint.color = Color.DKGRAY
                            row.forEachIndexed { k,v -> page.canvas.drawText(v,28f+k*88f,top+j*15f+11f,paint) }
                        }
                        page.canvas.drawText("Página ${i+1}", 750f, 580f, paint)
                        pdf.finishPage(page)
                    }
                    archivo.outputStream().use { pdf.writeTo(it) }
                } finally { pdf.close() }
            }
        }, LinearLayout.LayoutParams(0, -2, 2f))
        panel.addView(acciones, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(12) })
        dialog.show()
        dialog.window?.setBackgroundDrawableResource(R.drawable.bg_dialog_redondeado)
        dialog.window?.setLayout(-1, (root.resources.displayMetrics.heightPixels * .85f).toInt())
    }

    private fun csvFila(vararg valores: Any?): String = valores.joinToString(",") {
        "\"" + (it?.toString() ?: "").replace("\"", "\"\"") + "\""
    }

    private fun exportar(esAlimento: Boolean) {
        val l = lote ?: return
        val contenido = if (esAlimento) {
            val filas = alimento?.desglose?.renglones.orEmpty()
            if (filas.isEmpty()) { aviso("No hay estimación de alimento disponible."); return }
            listOf("etapa,dia_inicio,dia_fin,consumo_estimado_kg") + filas.map {
                csvFila(it.tipo_alimento_nombre_snapshot ?: it.etapa, it.dia_inicio, it.dia_fin, it.consumo_total_kg)
            }
        } else {
            val serie = curva?.rows("serie").orEmpty().associateBy { it.num("dia")?.toInt() }
            val reales = real().toMap()
            val dias = (serie.keys.filterNotNull() + reales.keys).distinct().sorted()
            if (dias.isEmpty()) { aviso("No hay datos de crecimiento disponibles."); return }
            listOf("dia,peso_real_g,peso_proyectado_g,estandar_g,marca_g,min_g,max_g") + dias.map { d ->
                val p = serie[d]
                csvFila(d, reales[d] ?: p?.num("real_g"), p?.num("proyectado_g"), p?.num("estandar_g"), p?.num("marca_g"), p?.num("min_g"), p?.num("max_g"))
            }
        }
        generarArchivo(l.codigo, if (esAlimento) "alimentacion.csv" else "crecimiento.csv", "text/csv") { archivo ->
            archivo.writeText("\uFEFF" + contenido.joinToString("\r\n"), Charsets.UTF_8)
        }
    }

    private fun exportarPdf() {
        val l = lote ?: return
        val ps = real().toMap()
        val inds = indicadores.filter { it.dia_vida != null }.groupBy { it.dia_vida!! }
            .mapValues { (_, v) -> v.maxByOrNull { it.fecha }!! }
        val dias = (ps.keys + inds.keys).distinct().sorted()
        val historial = dias.map { d ->
            val i = inds[d]
            val peso = ps[d] ?: i?.peso_promedio_g
            listOf(d.toString(), i?.fecha?.take(10) ?: pesos.firstOrNull { dia(it.fecha) == d }?.fecha?.take(10) ?: "—",
                peso?.let { n(it) } ?: "—", peso?.let { n(it / 453.59237) } ?: "—",
                i?.consumo_acumulado_g?.let { n(it) } ?: "—", i?.fcr?.let { n(it) } ?: "—")
        }
        val muertos = muertes.sumOf { it.cantidad_aves }
        val ultimo = inds.maxByOrNull { it.key }?.value
        val ultimoPeso = ps.maxByOrNull { it.key }?.value
        val etapas = alimento?.desglose?.renglones.orEmpty().map {
            listOf(it.tipo_alimento_nombre_snapshot ?: it.etapa ?: "Alimento", "${it.dia_inicio}–${it.dia_fin}", n(it.consumo_total_kg))
        }
        val meta = plan?.peso_objetivo_g?.div(1000)
        val estimado = alimento?.resultado?.consumo_total_kg
        val registrado = consumos.mapNotNull { it.alimento_kg }.takeIf { it.isNotEmpty() }?.sum()
        val agua = consumos.mapNotNull { it.agua_litros }.takeIf { it.isNotEmpty() }?.sum()
        val fechaInforme = SimpleDateFormat("dd/MM/yyyy", Locale("es", "CO")).format(Date())
        generarArchivo(l.codigo, "reporte.pdf", "application/pdf") { archivo ->
            val pdf = PdfDocument()
            try {
                val verde = Color.rgb(37, 105, 75)
                val tinta = Color.rgb(28, 49, 40)
                val suave = Color.rgb(235, 245, 239)
                val paint = Paint(Paint.ANTI_ALIAS_FLAG)
                var pagina = pdf.startPage(PdfDocument.PageInfo.Builder(595, 842, 1).create())
                var numero = 1
                var y = 0f
                fun texto(t: String, x: Float, base: Float, tam: Float = 10f, color: Int = tinta, negrita: Boolean = false, ancho: Float = 523f) {
                    paint.color = color; paint.textSize = tam
                    paint.typeface = Typeface.create("sans-serif", if (negrita) Typeface.BOLD else Typeface.NORMAL)
                    val limite = paint.breakText(t, true, ancho, null)
                    val visible = if (limite < t.length) t.take((limite - 1).coerceAtLeast(0)) + "…" else t
                    pagina.canvas.drawText(visible, x, base, paint)
                }
                fun caja(x: Float, top: Float, w: Float, h: Float, color: Int) {
                    paint.color = color
                    pagina.canvas.drawRoundRect(RectF(x, top, x + w, top + h), 7f, 7f, paint)
                }
                fun encabezado() {
                    caja(36f, 30f, 523f, 62f, verde)
                    texto("AVISENS", 49f, 52f, 13f, Color.WHITE, true)
                    texto("Informe de desempeño del lote", 49f, 76f, 19f, Color.WHITE, true, 490f)
                    texto(l.codigo, 36f, 112f, 13f, verde, true)
                    texto("Informe: $fechaInforme", 405f, 112f, 10f, tinta, false, 154f)
                    y = 132f
                }
                fun cerrarPagina() {
                    texto("Avisens · Reporte productivo", 36f, 815f, 9f, verde)
                    texto("Página $numero", 490f, 815f, 9f, verde, false, 69f)
                    pdf.finishPage(pagina)
                }
                fun nuevaPagina() {
                    cerrarPagina(); numero++
                    pagina = pdf.startPage(PdfDocument.PageInfo.Builder(595, 842, numero).create())
                    encabezado()
                }
                fun titulo(t: String) {
                    if (y + 55f > 780f) nuevaPagina()
                    texto(t, 36f, y + 16f, 14f, verde, true); y += 29f
                }
                fun tabla(headers: List<String>, widths: List<Float>, rows: List<List<String>>) {
                    fun cabecera() {
                        caja(36f, y, 523f, 25f, verde)
                        var x = 36f
                        headers.forEachIndexed { j, h -> texto(h, x + 6f, y + 16f, 9f, Color.WHITE, true, widths[j] - 12f); x += widths[j] }
                        y += 25f
                    }
                    cabecera()
                    if (rows.isEmpty()) { texto("Sin datos disponibles", 42f, y + 17f); y += 28f }
                    rows.forEachIndexed { index, row ->
                        if (y + 25f > 780f) { nuevaPagina(); cabecera() }
                        caja(36f, y, 523f, 24f, if (index % 2 == 0) suave else Color.WHITE)
                        var x = 36f
                        row.forEachIndexed { j, v -> texto(v, x + 6f, y + 16f, 9f, tinta, false, widths[j] - 12f); x += widths[j] }
                        y += 25f
                    }
                    y += 12f
                }
                encabezado()
                texto("Galpón: ${l.galpon.nombre} · Granja #${l.galpon.granja.id}", 36f, y, 11f); y += 18f
                texto("Genética: ${l.linea_genetica?.nombre ?: l.raza ?: "—"} · Sexo: ${l.sexo ?: "—"}", 36f, y, 11f); y += 18f
                texto("Ingreso: ${l.fecha_ingreso.take(10)} · Estado: ${l.estado}", 36f, y, 11f); y += 16f
                titulo("1. Indicadores zootécnicos clave")
                val tarjetas = listOf("Aves encasetadas" to l.cantidad_inicial.toString(),
                    "Último peso real" to (ultimoPeso?.let { "${n(it)} g" } ?: "—"),
                    "FCR registrado" to (ultimo?.fcr?.let { n(it) } ?: "—"),
                    "Mortalidad registrada" to "${n(100.0 * muertos / l.cantidad_inicial.coerceAtLeast(1))}%")
                tarjetas.forEachIndexed { j, (label, valor) ->
                    val x = 36f + (j % 2) * 265f; val top = y + (j / 2) * 64f
                    caja(x, top, 258f, 57f, suave)
                    texto(label, x + 12f, top + 19f, 10f, verde, true)
                    texto(valor, x + 12f, top + 43f, 19f, tinta, true, 234f)
                }
                y += 135f
                titulo("2. Resumen de alimentación y meta")
                tabla(listOf("Indicador", "Valor"), listOf(323f, 200f), listOf(
                    listOf("Alimento registrado", registrado?.let { "${n(it)} kg" } ?: "—"),
                    listOf("Agua registrada", agua?.let { "${n(it)} L" } ?: "—"),
                    listOf("Alimento estimado", estimado?.let { "${n(it)} kg" } ?: "—"),
                    listOf("Meta de peso", meta?.let { "${n(it)} kg" } ?: "—")))
                titulo("3. Historial de crecimiento y consumo")
                tabla(listOf("Día", "Fecha", "Peso (g)", "Peso (lb)", "Cons. (g/ave)", "FCR"),
                    listOf(40f, 88f, 92f, 85f, 135f, 83f), historial)
                titulo("4. Estimación de alimento por etapa")
                tabla(listOf("Etapa", "Días", "Estimación (kg)"), listOf(245f, 100f, 178f), etapas)
                if (y + 20f > 780f) nuevaPagina()
                texto("— = dato no disponible. Informe basado en los registros consultados por la aplicación.", 36f, y + 12f, 9f, verde)
                cerrarPagina()
                archivo.outputStream().use { salida -> pdf.writeTo(salida) }
            } finally {
                pdf.close()
            }
        }
    }

    private fun aviso(mensaje: String) {
        if (!fragment.isAdded || fragment.view == null) return
        mostrarDialogo(AlertDialog.Builder(root.context).setTitle("Avisens")
            .setMessage(mensaje).setNegativeButton("Cerrar", null))
    }

    private fun generarArchivo(codigo: String, nombre: String, mime: String, escribir: (File) -> Unit) {
        val ctx = root.context
        val usuario = UserSession.userId(ctx) ?: return
        fragment.viewLifecycleOwner.lifecycleScope.launch {
            try {
                val archivo = withContext(Dispatchers.IO) {
                    val carpeta = File(ctx.cacheDir, "reportes/$usuario").apply { mkdirs() }
                    File(carpeta, "${codigo.replace(Regex("[^A-Za-z0-9_-]"), "_")}_${System.currentTimeMillis()}_$nombre").also(escribir)
                }
                if (UserSession.userId(ctx) != usuario) return@launch
                val uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", archivo)
                val compartir = Intent(Intent.ACTION_SEND).apply {
                    type = mime
                    putExtra(Intent.EXTRA_STREAM, uri)
                    clipData = ClipData.newRawUri(nombre, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                if (mime == "application/pdf") {
                    val panel = bloqueDialogo()
                    panel.addView(etiqueta("Reporte generado", true).apply { gravity = android.view.Gravity.CENTER })
                    panel.addView(etiqueta("El informe se ha generado correctamente.").apply { gravity = android.view.Gravity.CENTER })
                    val dialog = AlertDialog.Builder(ctx).setView(panel).create()
                    panel.addView(botonDialogo("Abrir PDF", true) {
                        dialog.dismiss()
                        val abrir = Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        try { fragment.startActivity(abrir) } catch (_: android.content.ActivityNotFoundException) { aviso("No hay visor PDF instalado.") }
                    })
                    panel.addView(botonDialogo("Compartir PDF", false) {
                        dialog.dismiss(); fragment.startActivity(Intent.createChooser(compartir, "Compartir reporte"))
                    }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(10) })
                    panel.addView(botonDialogo("Cerrar", false) { dialog.dismiss() }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(10) })
                    dialog.show()
                    dialog.window?.setBackgroundDrawableResource(R.drawable.bg_dialog_redondeado)
                } else {
                    fragment.startActivity(Intent.createChooser(compartir, "Compartir CSV"))
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                aviso("No se pudo generar el archivo.")
            }
        }
    }
}
