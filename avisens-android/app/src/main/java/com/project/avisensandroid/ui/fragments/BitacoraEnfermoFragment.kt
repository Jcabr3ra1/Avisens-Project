package com.project.avisensandroid.ui.fragments

import android.app.DatePickerDialog
import android.os.Bundle
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.*
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.core.widget.doAfterTextChanged
import androidx.lifecycle.lifecycleScope
import com.google.android.material.chip.Chip
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.*
import com.project.avisensandroid.databinding.Po07BitacoraEnfermoOpBinding
import com.project.avisensandroid.model.*
import com.project.avisensandroid.ui.*
import kotlinx.coroutines.*
import retrofit2.Response
import java.text.SimpleDateFormat
import java.util.*

class BitacoraEnfermoFragment : BaseBottomNavFragment() {
    private var _binding: Po07BitacoraEnfermoOpBinding? = null
    private val b get() = _binding!!
    private val main get() = requireActivity() as MainActivity
    private val anim = AnimacionesTarjetas()
    private var lote: LoteResponse? = null
    private var casos = emptyList<EventoSanitarioResponse>()
    private var insumos = emptyList<InsumoResponse>()
    private var carga: Job? = null
    private var ocupado = false
    private var ultima = ""
    private var errorConsulta = false
    private var consultandoLote = true
    private val tipos =
        listOf("vacunacion", "medicacion", "tratamiento", "diagnostico", "revision", "seguimiento")
    private val nombres =
        listOf("Vacunación", "Medicación", "Tratamiento", "Diagnóstico", "Revisión", "Seguimiento")
    private val fechas = listOf(
        "Todas las fechas",
        "Hoy",
        "Ayer",
        "Últimos 7 días",
        "Últimos 30 días",
        "Personalizado"
    )
    private val estados = listOf("Todos los estados", "Activo", "Finalizado")
    private var fechaFiltro = 0
    private var estadoFiltro = 0
    private var tiposFiltro = setOf<Int>()
    private var inicio = ""
    private var fin = ""
    private val checks = mutableListOf<CheckBox>()
    private fun dp(n: Int) = (n * resources.displayMetrics.density + .5f).toInt()
    private fun fecha(dias: Int = 0): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(
        Calendar.getInstance().apply { add(Calendar.DATE, dias) }.time
    )

    private fun fechaLarga(s: String): String = try {
        val d = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(s.take(10))!!
        SimpleDateFormat("EEEE, d 'de' MMMM 'de' yyyy", Locale("es", "CO")).format(d)
            .replaceFirstChar { it.uppercase() }
    } catch (_: Exception) {
        s.take(10)
    }

    private fun estadoCaso(c: EventoSanitarioResponse): String =
        if (c.fecha_cierre != null || c.estado.equals("finalizado", true)) "finalizado"
        else c.estado?.trim()?.lowercase(Locale.ROOT)?.takeIf { it.isNotEmpty() } ?: "activo"

    private fun nombreTipo(s: String) = nombres.getOrElse(tipos.indexOf(s)) { s }
    private fun aviso(s: String) {
        if (isAdded) Toast.makeText(requireContext(), s, Toast.LENGTH_LONG).show()
    }

    private fun texto(s: String, bold: Boolean = false) = TextView(requireContext()).apply {
        text = s; textSize = if (bold) 16f else 14f
        setTextColor(ColoresAdaptativos.texto(context, "#183C2E"))
        if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
        setPadding(0, dp(4), 0, dp(4))
    }

    private fun columna() =
        LinearLayout(requireContext()).apply { orientation = LinearLayout.VERTICAL }

    private fun tarjeta() = columna().apply {
        background = GradientDrawable().apply {
            cornerRadius = dp(14).toFloat()
            setColor(ColoresAdaptativos.superficie(requireContext(), "#FFFFFF"))
            setStroke(dp(1), ColoresAdaptativos.superficie(requireContext(), "#DCE8DF"))
        }
        setPadding(dp(14), dp(12), dp(14), dp(12))
    }

    private fun boton(s: String, principal: Boolean = false, accion: () -> Unit) =
        TextView(requireContext()).apply {
            text = s; gravity = Gravity.CENTER; textSize = 14f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setTextColor(
                if (principal) Color.WHITE else ColoresAdaptativos.texto(
                    context,
                    "#285C40"
                )
            )
            setBackgroundResource(if (principal) R.drawable.bg_bitacora_button else R.drawable.bg_input_event)
            layoutParams = LinearLayout.LayoutParams(
                if (principal) -2 else -1,
                dp(if (principal) 40 else 44)
            ).apply {
                topMargin = dp(8)
                if (principal) gravity = Gravity.END
            }
            if (principal) setPadding(dp(14), 0, dp(14), 0)
            setOnClickListener { accion() }
        }

    private fun spinner(opciones: List<String>) = Spinner(requireContext()).apply {
        adapter = MainActivity.SpinnerAdapterEstilizado(requireContext(), opciones.toMutableList())
        setBackgroundResource(R.drawable.bg_spinner_bitacora)
        setPopupBackgroundResource(R.drawable.bg_spinner_dropdown)
        layoutParams = LinearLayout.LayoutParams(-1, dp(42))
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po07BitacoraEnfermoOpBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        anim.reiniciar(); ultima = ""
        configurarBottomNav(R.id.nav_bitacora)
        animarPestanaBitacora(b.tabsBitacora, 1)
        b.tbnEnfermo.setOnClickListener { abrirPestanaBitacora(BitacoraFragment(), 1) }
        b.tabPesajes.setOnClickListener { abrirPestanaBitacora(BitacoraPesajesFragment(), 1) }
        b.tbnConsumo.setOnClickListener { abrirPestanaBitacora(BitacoraConsumoFragment(), 1) }
        b.btnRegistrarEvento.setOnClickListener {
            if (lote?.galpon?.id == main.obtenerGalponSeleccionadoId() && lote != null) formulario(
                null
            )
            else actualizarSilenciosamente()
        }
        b.spinnerFiltroFecha.adapter =
            MainActivity.SpinnerAdapterEstilizado(requireContext(), fechas.toMutableList())
        b.spinnerEstado.adapter =
            MainActivity.SpinnerAdapterEstilizado(requireContext(), estados.toMutableList())
        checks.clear(); b.containerCausas.removeAllViews()
        nombres.forEach { n ->
            val c = CheckBox(requireContext()).apply {
                text = n; setTextColor(
                ColoresAdaptativos.texto(
                    context,
                    "#183C2E"
                )
            )
            }
            checks.add(c); b.containerCausas.addView(c)
        }
        b.btnFiltros.setOnClickListener {
            b.panelFiltros.visibility =
                if (b.panelFiltros.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }
        b.btnDesplegarCausas.setOnClickListener {
            b.panelCausas.visibility =
                if (b.panelCausas.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }
        b.btnAplicarFiltros.setOnClickListener {
            val aplicar = {
                fechaFiltro = b.spinnerFiltroFecha.selectedItemPosition; estadoFiltro =
                b.spinnerEstado.selectedItemPosition
                tiposFiltro = checks.indices.filter { checks[it].isChecked }.toSet()
                b.panelFiltros.visibility = View.GONE; chips(); pintar()
            }
            if (b.spinnerFiltroFecha.selectedItemPosition == 5) elegirFecha { desde ->
                elegirFecha { hasta ->
                    if (hasta < desde) aviso("La fecha final debe ser posterior a la inicial") else {
                        inicio = desde; fin = hasta; aplicar()
                    }
                }
            } else aplicar()
        }
        b.edtBuscarSanidad.doAfterTextChanged { pintar() }
        animarBuscadorBitacora(b.edtBuscarSanidad.parent as View)
        b.btnRegistrarEvento.isEnabled = true
        viewLifecycleOwner.lifecycleScope.launch {
            while (isActive) {
                actualizarSilenciosamente(); delay(15000)
            }
        }
    }

    private fun elegirFecha(accion: (String) -> Unit) {
        val c = Calendar.getInstance()
        DatePickerDialog(
            requireContext(),
            { _, y, m, d -> accion(String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)) },
            c.get(Calendar.YEAR),
            c.get(Calendar.MONTH),
            c.get(Calendar.DAY_OF_MONTH)
        ).show()
    }

    private fun chips() {
        b.chipsFiltros.removeAllViews()
        fun agregar(s: String, quitar: () -> Unit) {
            b.chipsFiltros.addView(Chip(requireContext()).apply {
                text = s; isCloseIconVisible =
                true; setOnCloseIconClickListener { quitar(); chips(); pintar() }
            })
        }
        if (fechaFiltro != 0) agregar(if (fechaFiltro == 5) "$inicio – $fin" else fechas[fechaFiltro]) {
            fechaFiltro = 0; b.spinnerFiltroFecha.setSelection(0)
        }
        if (estadoFiltro != 0) agregar(estados[estadoFiltro]) {
            estadoFiltro = 0; b.spinnerEstado.setSelection(0)
        }
        tiposFiltro.forEach { i ->
            agregar(nombres[i]) {
                tiposFiltro = tiposFiltro - i; checks[i].isChecked = false
            }
        }
        b.chipsFiltros.visibility = if (b.chipsFiltros.childCount == 0) View.GONE else View.VISIBLE
    }

    private suspend fun <T> paginas(f: suspend (Int) -> Response<PaginatedResponse<T>>): List<T> {
        val lista = mutableListOf<T>();
        var p = 1
        do {
            val r = f(p)
            if (!r.isSuccessful) {
                val detalle = r.errorBody()?.string().orEmpty()
                android.util.Log.e(
                    "Sanidad",
                    "GET ${r.raw().request.url.encodedPath}?${r.raw().request.url.encodedQuery.orEmpty()} · HTTP ${r.code()}: $detalle"
                )
                throw IllegalStateException("HTTP ${r.code()}: $detalle")
            }
            val cuerpo = requireNotNull(r.body())
            lista.addAll(cuerpo.data)
            p++
        } while (p <= cuerpo.meta.totalPages)
        return lista
    }

    fun actualizarSilenciosamente() {
        if (_binding == null || carga?.isActive == true || ocupado) return
        carga = viewLifecycleOwner.lifecycleScope.launch {
            val galpon = main.obtenerGalponSeleccionadoId()
            if (galpon == null) {
                lote = null; casos = emptyList(); insumos = emptyList()
                consultandoLote = false; errorConsulta = false; pintar(); return@launch
            }
            if (lote?.galpon?.id != galpon) {
                lote = null; casos = emptyList(); insumos = emptyList()
                consultandoLote = true; errorConsulta = false; pintar()
            }
            suspend fun cargar(cache: Boolean) {
                val api = if (cache) RetrofitClient.apiCache else RetrofitClient.api
                val l = paginas { api.listarLotesCompletos(it, 100) }
                    .filter { it.galpon.id == galpon && it.estado.equals("activo", true) }
                    .maxByOrNull { it.fecha_ingreso }
                if (main.obtenerGalponSeleccionadoId() != galpon || _binding == null) return
                if (lote?.id != l?.id) {
                    casos = emptyList(); insumos = emptyList()
                }
                lote = l
                consultandoLote = false
                pintar()
                if (l == null) return
                supervisorScope {
                    launch {
                        try {
                            val datos = paginas { api.listarEventosSanitarios(it, 100) }
                                .filter { it.lote_id == l.id && it.evento_padre_id == null }
                            if (_binding != null && main.obtenerGalponSeleccionadoId() == galpon && lote?.id == l.id) {
                                casos = datos; errorConsulta = false; pintar()
                            }
                        } catch (e: CancellationException) {
                            throw e
                        } catch (e: Exception) {
                            android.util.Log.w("Sanidad", "Error consultando casos", e)
                            if (_binding != null && lote?.id == l.id) {
                                errorConsulta = true; pintar()
                            }
                        }
                    }
                    launch {
                        try {
                            val datos = paginas {
                                api.listarInsumos(
                                    it,
                                    100
                                )
                            }.filter { it.activo && it.granja_id == l.galpon.granja.id }
                            if (_binding != null && lote?.id == l.id) insumos = datos
                        } catch (e: CancellationException) {
                            throw e
                        } catch (e: Exception) {
                            android.util.Log.w("Sanidad", "Error consultando insumos", e)
                        }
                    }
                }
            }
            if (lote == null) try {
                cargar(true)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
            }
            if (OfflineCache.hayInternet(requireContext())) try {
                cargar(false)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                android.util.Log.w("Sanidad", "Error consultando lote", e)
                if (lote == null) errorConsulta = true
            }
            consultandoLote = false
            pintar()
        }
    }

    private fun pintar() {
        if (_binding == null) return
        b.btnRegistrarEvento.isEnabled = true
        val q = b.edtBuscarSanidad.text.toString().trim()
        val lista = casos.filter { c ->
            val d = c.fecha.take(10)
            val fechaOk = when (fechaFiltro) {
                1 -> d == fecha(); 2 -> d == fecha(-1); 3 -> d in fecha(-6)..fecha(); 4 -> d in fecha(
                    -29
                )..fecha(); 5 -> d in inicio..fin; else -> true
            }
            fechaOk && (estadoFiltro == 0 || estadoCaso(c) == estados[estadoFiltro].lowercase(Locale.ROOT)) && (tiposFiltro.isEmpty() || tipos.indexOf(
                c.tipo
            ) in tiposFiltro) && listOf(
                c.diagnostico,
                c.producto,
                c.observaciones,
                c.lote.codigo,
                nombreTipo(c.tipo),
                c.id.toString()
            ).any { it.orEmpty().contains(q, true) }
        }.sortedByDescending { it.fecha }
        val pendientes = Hu56OfflineQueue.registros(requireContext()).filter {
            it.optString("tipo") == "sanitario" && it.optString("estado") !in setOf(
                "SINCRONIZADO",
                "ERROR"
            )
        }.filter {
            runCatching {
                Gson().fromJson(
                    it.optString("payload"),
                    EventoSanitarioRequest::class.java
                ).lote_id == lote?.id
            }.getOrDefault(false)
        }
        val firma =
            Gson().toJson(lista) + pendientes.toString() + lote?.id + errorConsulta + consultandoLote
        if (firma == ultima) return
        ultima = firma; b.containerRegistros.removeAllViews(); anim.comenzar()
        pendientes.forEach {
            b.containerRegistros.addView(
                texto(
                    "Registro sanitario local · ${
                        it.optString(
                            "estado"
                        )
                    }"
                )
            )
        }
        if (lista.isEmpty()) b.containerRegistros.addView(
            texto(
                when {
                    consultandoLote -> "Consultando lote activo…"; errorConsulta -> "No se pudieron actualizar los datos de Sanidad"; lote == null -> "No hay lote activo disponible"; else -> "No hay casos sanitarios para mostrar"
                }
            )
        )
        var dia = ""
        lista.forEach { c ->
            if (dia != c.fecha.take(10)) {
                dia = c.fecha.take(10);
                val t = texto(fechaLarga(dia), true); b.containerRegistros.addView(t); anim.mostrar(
                    t,
                    "fecha:$dia",
                    true
                )
            }
            val card = tarjeta(); card.addView(
            texto(
                c.diagnostico ?: nombreTipo(c.tipo),
                true
            )
        ); card.addView(texto("${c.lote.codigo} · ${if (estadoCaso(c) == "finalizado") "Finalizado" else "Activo"}")); card.addView(
            texto("Aves afectadas: ${c.cantidad_aves?.toString() ?: "Sin registrar"} · Seguimientos: ${c._count?.seguimientos ?: 0}")
        ); c.observaciones?.let { card.addView(texto(it)) }
            card.addView(boton("Ver caso sanitario") { detalle(c) }); if (estadoCaso(c) == "activo") card.addView(
            boton("+ Registrar seguimiento", true) { formulario(c) })
            b.containerRegistros.addView(
                card,
                LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(10) }); anim.mostrar(
            card,
            "caso:${c.id}"
        )
        }
    }

    private fun dialogo(
        titulo: String,
        contenido: LinearLayout,
        positivo: String? = null
    ): AlertDialog {
        contenido.setPadding(dp(18), dp(18), dp(18), dp(18))
        contenido.setBackgroundResource(R.drawable.bg_dialog_white)
        contenido.addView(texto(titulo, true).apply {
            textSize = 20f
            setPadding(0, 0, 0, 0)
        }, 0, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(10) })
        val scroll = ScrollView(requireContext()).apply { addView(contenido) }
        val builder = AlertDialog.Builder(requireContext()).setView(scroll)
        if (positivo == null) builder.setNegativeButton("Cerrar", null)
        val d = builder.show()
        d.window?.setBackgroundDrawableResource(android.R.color.transparent)
        d.window?.setLayout(
            (resources.displayMetrics.widthPixels * 0.92f).toInt(),
            WindowManager.LayoutParams.WRAP_CONTENT
        )
        d.window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        if (positivo == null) {
            d.estiloCancelar()
        } else {
            val fila = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(-1, dp(42)).apply { topMargin = dp(10) }
            }

            fun crearBoton(principal: Boolean) =
                com.google.android.material.button.MaterialButton(requireContext()).apply {
                    id = if (principal) R.id.btnGuardarEvento else R.id.btnCancelarEvento
                    text =
                        if (principal) (if (positivo == "Guardar") "Guardar registro" else positivo) else "Cancelar"
                    isAllCaps = false
                    textSize = 13f
                    setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
                    gravity = Gravity.CENTER
                    minimumWidth = 0
                    minimumHeight = 0
                    minWidth = 0
                    minHeight = 0
                    insetTop = 0
                    insetBottom = 0
                    cornerRadius = dp(9)
                    val ctx = requireContext()
                    backgroundTintList =
                        if (principal) android.content.res.ColorStateList.valueOf(Color.parseColor("#2E8B57")) else androidx.core.content.ContextCompat.getColorStateList(
                            ctx,
                            R.color.cancel_background
                        )
                    setTextColor(
                        if (principal) Color.WHITE else androidx.core.content.ContextCompat.getColor(
                            ctx,
                            R.color.cancel_text
                        )
                    )
                    strokeWidth = if (principal) 0 else dp(1)
                    if (!principal) strokeColor =
                        androidx.core.content.ContextCompat.getColorStateList(
                            ctx,
                            R.color.cancel_stroke
                        )
                    layoutParams = LinearLayout.LayoutParams(0, dp(42), 1f).apply {
                        if (principal) marginStart = dp(3) else marginEnd = dp(3)
                    }
                }
            fila.addView(crearBoton(false).apply { setOnClickListener { d.dismiss() } })
            fila.addView(crearBoton(true))
            contenido.addView(fila)
        }
        return d
    }

    private fun detalle(c: EventoSanitarioResponse) {
        viewLifecycleOwner.lifecycleScope.launch {
            val contenido = columna(); contenido.addView(
            texto(
                c.diagnostico ?: nombreTipo(c.tipo),
                true
            )
        ); contenido.addView(texto("Estado: ${estadoCaso(c).replaceFirstChar { it.uppercase() }}")); contenido.addView(
            texto("Aves afectadas inicialmente: ${c.cantidad_aves ?: "Sin registrar"}")
        ); agregarDatos(contenido, c); contenido.addView(texto("Historial de seguimientos", true))
            val api =
                if (OfflineCache.hayInternet(requireContext())) RetrofitClient.api else RetrofitClient.apiCache
            try {
                val r = api.listarSeguimientosSanitarios(c.id); if (!r.isSuccessful) {
                    val error = r.errorBody()?.string().orEmpty()
                    android.util.Log.w("Sanidad", "GET seguimientos HTTP ${r.code()}: $error")
                    throw IllegalStateException("HTTP ${r.code()}")
                };
                val lista = r.body()
                    .orEmpty(); if (lista.isEmpty()) contenido.addView(texto("Sin seguimientos")); lista.forEach { s ->
                    val card = tarjeta(); card.addView(
                    texto(
                        fechaLarga(s.fecha),
                        true
                    )
                ); agregarDatos(
                    card,
                    s
                ); contenido.addView(
                    card,
                    LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) })
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                contenido.addView(texto("No se pudo consultar el historial"))
            }
            c.observaciones_cierre?.let { contenido.addView(texto("Cierre: $it")) }; c.fecha_cierre?.let {
            contenido.addView(
                texto("Fecha de cierre: ${fechaLarga(it)}")
            )
        }
            val d = dialogo("Caso sanitario #${c.id}", contenido)
            if (estadoCaso(c) == "activo") {
                contenido.addView(
                    boton(
                        "+ Registrar seguimiento",
                        true
                    ) { d.dismiss(); formulario(c) }); contenido.addView(boton("Finalizar caso") {
                    d.dismiss(); finalizar(
                    c
                )
                })
            }
        }
    }

    private fun agregarDatos(v: LinearLayout, c: EventoSanitarioResponse) {
        v.addView(texto(nombreTipo(c.tipo))); c.cantidad_aves?.let { v.addView(texto("Aves: $it")) }; c.producto?.let {
            v.addView(
                texto("Producto: $it")
            )
        }; c.dosis?.let { v.addView(texto("Dosis: $it")) }; c.via_aplicacion?.let {
            v.addView(
                texto(
                    "Vía: $it"
                )
            )
        }; c.cantidad_insumo?.let { v.addView(texto("Insumo: ${c.insumo?.nombre.orEmpty()} · $it ${c.insumo?.unidad_medida.orEmpty()}")) }; c.observaciones?.let {
            v.addView(
                texto(it)
            )
        }
    }

    private fun etiqueta(v: LinearLayout, label: String) {
        v.addView(texto(label, true).apply {
            textSize = 12f
            setPadding(0, 0, 0, 0)
        }, LinearLayout.LayoutParams(-1, -2).apply {
            topMargin = if (v.childCount == 0) 0 else dp(10)
            bottomMargin = dp(5)
        })
    }

    private fun campo(v: LinearLayout, label: String, max: Int, numerico: Int = 0): EditText {
        etiqueta(v, label)
        val multilinea = label.startsWith("Observaciones")
        return EditText(requireContext()).apply {
            inputType = if (numerico != 0) numerico else if (multilinea) 131073 else 1
            if (!multilinea) setSingleLine(true)
            setBackgroundResource(if (multilinea) R.drawable.bg_observaciones else R.drawable.bg_input_event)
            setPadding(dp(10), dp(8), dp(10), dp(8))
            typeface = android.graphics.Typeface.create(
                "sans-serif-medium",
                android.graphics.Typeface.NORMAL
            )
            textSize = 13f
            setTextColor(
                androidx.core.content.ContextCompat.getColor(
                    context,
                    R.color.adaptive_text_000000
                )
            )
            filters = arrayOf(android.text.InputFilter.LengthFilter(max))
            if (multilinea) {
                gravity = Gravity.TOP or Gravity.START; hint = "Escribe una observación..."
            }
            v.addView(this, LinearLayout.LayoutParams(-1, dp(if (multilinea) 58 else 42)))
        }
    }

    private var cargandoFormulario = false

    private fun formulario(padre: EventoSanitarioResponse?) {
        val l = lote ?: return
        if (padre == null || !OfflineCache.hayInternet(requireContext())) {
            mostrarFormulario(padre)
            return
        }
        if (cargandoFormulario) return
        cargandoFormulario = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val datos = paginas { RetrofitClient.api.listarInsumos(it, 100) }
                    .filter { it.activo && it.granja_id == l.galpon.granja.id }
                if (_binding != null && lote?.id == l.id) insumos = datos
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                android.util.Log.w("Sanidad", "Error actualizando insumos para seguimiento", e)
                aviso("No se pudo actualizar Bodega. Se mostrarán los insumos disponibles en memoria.")
            } finally {
                cargandoFormulario = false
            }
            if (_binding != null && lote?.id == l.id) mostrarFormulario(padre)
        }
    }

    private fun mostrarFormulario(padre: EventoSanitarioResponse?) {
        val l = lote ?: return
        if (padre != null && (padre.lote_id != l.id || estadoCaso(padre) != "activo")) {
            aviso("El caso no está disponible para registrar seguimientos")
            return
        }
        val v = columna()
        etiqueta(v, "Tipo de evento")
        val tipo = spinner(if (padre == null) nombres.dropLast(1) else nombres)
        v.addView(tipo)
        tipo.setSelection(if (padre == null) 3 else 5)
        etiqueta(v, "Fecha")
        var dia = fecha()
        fun fechaVisible() = dia.split("-").reversed().joinToString("/")
        val fechaBoton = boton(fechaVisible()) { }.apply {
            gravity = Gravity.CENTER_VERTICAL or Gravity.START
            textSize = 13f
            typeface = android.graphics.Typeface.create(
                "sans-serif-medium",
                android.graphics.Typeface.NORMAL
            )
            setPadding(dp(10), 0, dp(10), 0)
            layoutParams = LinearLayout.LayoutParams(-1, dp(42))
        }
        fechaBoton.setOnClickListener { elegirFecha { dia = it; fechaBoton.text = fechaVisible() } }
        v.addView(fechaBoton)
        val diagnostico = if (padre == null) campo(v, "Diagnóstico (opcional)", 150) else null
        val aves = campo(v, "Cantidad de aves afectadas (opcional)", 8, 2)
        val disponibles = insumos.filter { it.granja_id == l.galpon.granja.id && it.activo }
            .sortedBy { it.nombre.lowercase(Locale.ROOT) }
        var selector: Spinner? = null
        var cantidad: EditText? = null
        var producto: EditText? = null
        var dosis: EditText? = null
        var via: Spinner? = null
        val vias = listOf("", "ocular", "oral", "agua", "subcutanea", "intramuscular")
        if (padre != null) {
            etiqueta(v, "Insumo de bodega (opcional)")
            val sel = spinner(listOf("Sin insumo") + disponibles.map { it.nombre })
            selector = sel
            v.addView(sel)
            val stock =
                texto(if (disponibles.isEmpty()) "No hay insumos activos disponibles de esta granja" else "")
            v.addView(stock)
            val cant = campo(v, "Cantidad utilizada (opcional)", 15, 8194)
            cantidad = cant
            cant.isEnabled = false
            sel.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onNothingSelected(parent: AdapterView<*>?) = Unit
                override fun onItemSelected(
                    parent: AdapterView<*>?,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    val i = disponibles.getOrNull(position - 1)
                    stock.text =
                        i?.let { "Disponible: ${it.stock_actual ?: 0.0} ${it.unidad_medida}" }
                            ?: if (disponibles.isEmpty()) "No hay insumos activos disponibles de esta granja" else ""
                    cant.isEnabled = i != null
                    if (i == null) cant.text.clear()
                }
            }
            producto = campo(v, "Producto aplicado (opcional)", 150)
            dosis = campo(v, "Dosis (opcional)", 80)
            etiqueta(v, "Vía de aplicación (opcional)")
            via = spinner(
                listOf(
                    "Sin especificar",
                    "Ocular",
                    "Oral",
                    "Agua",
                    "Subcutánea",
                    "Intramuscular"
                )
            )
            v.addView(via)
        }
        val obs = campo(v, "Observaciones (opcional)", 500)
        val d = dialogo(
            if (padre == null) "Registrar caso sanitario" else "Registrar seguimiento",
            v,
            "Guardar"
        )
        d.findViewById<View>(R.id.btnGuardarEvento)!!.setOnClickListener {
            fun valor(e: EditText?) = e?.text?.toString()?.trim()?.takeIf { it.isNotEmpty() }
            val n =
                valor(aves)?.toIntOrNull(); if (valor(aves) != null && (n == null || n <= 0 || n > l.cantidad_inicial)) {
            aves.error = "Cantidad de aves inválida"; return@setOnClickListener
        }
            val i = disponibles.getOrNull((selector?.selectedItemPosition ?: 0) - 1);
            val raw = valor(cantidad)?.replace(',', '.');
            val cant = raw?.toDoubleOrNull()
            if (i != null && raw == null) {
                cantidad?.error = "Ingresa la cantidad utilizada"; return@setOnClickListener
            }
            if (raw != null && (i == null || cant == null || !cant.isFinite() || cant <= 0 || raw.substringAfter(
                    '.',
                    ""
                ).length > 3 || cant > (i.stock_actual ?: 0.0))
            ) {
                cantidad?.error =
                    "Revisa cantidad y stock disponible (máximo 3 decimales)"; return@setOnClickListener
            }
            val req = EventoSanitarioRequest(
                lote_id = l.id,
                tipo = tipos[tipo.selectedItemPosition],
                fecha = dia,
                insumo_id = i?.id,
                diagnostico = valor(diagnostico),
                producto = valor(producto),
                dosis = valor(dosis),
                via_aplicacion = vias.getOrNull(via?.selectedItemPosition ?: 0)
                    ?.takeIf { it.isNotEmpty() },
                cantidad_aves = n,
                observaciones = valor(obs),
                evento_padre_id = padre?.id,
                cantidad_insumo = cant
            )
            if (ocupado) return@setOnClickListener
            if (padre != null && OfflineCache.hayInternet(requireContext())) {
                ocupado = true
                val guardar = d.findViewById<View>(R.id.btnGuardarEvento)
                guardar?.isEnabled = false
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val r = RetrofitClient.api.crearEventoSanitario(req)
                        if (r.isSuccessful) {
                            d.dismiss()
                            aviso("Seguimiento registrado")
                        } else {
                            val error = r.errorBody()?.string().orEmpty()
                            android.util.Log.w(
                                "Sanidad",
                                "POST seguimiento HTTP ${r.code()}: $error"
                            )
                            if (r.code() >= 500) {
                                d.dismiss()
                                aviso("No se pudo confirmar el registro. Consulta el historial antes de repetir.")
                            } else aviso("No se pudo registrar el seguimiento (${r.code()})")
                        }
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        android.util.Log.w("Sanidad", "Error registrando seguimiento", e)
                        d.dismiss()
                        aviso("No se pudo confirmar el registro. Consulta el historial antes de repetir.")
                    } finally {
                        ocupado = false
                        guardar?.isEnabled = true
                        if (_binding != null) actualizarSilenciosamente()
                    }
                }
                return@setOnClickListener
            }
            if (Hu56OfflineQueue.guardar(requireContext(), "sanitario", req)) {
                d.dismiss(); aviso("Registro guardado para sincronización"); pintar()
            } else aviso("No se pudo guardar el registro")
        }
    }

    private fun finalizar(c: EventoSanitarioResponse) {
        if (!OfflineCache.hayInternet(requireContext())) {
            aviso("Conéctate a internet para finalizar el caso"); return
        }
        val v = columna(); v.addView(texto("No se podrán agregar más seguimientos a este caso."));
        val obs = campo(v, "Observaciones de cierre (opcional)", 500);
        val d = dialogo("Finalizar caso", v, "Finalizar")
        d.findViewById<View>(R.id.btnGuardarEvento)!!.setOnClickListener {
            if (ocupado) return@setOnClickListener
            ocupado = true; d.findViewById<View>(R.id.btnGuardarEvento)!!.isEnabled = false
            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val datos = JsonObject(); obs.text.toString().trim().takeIf { it.isNotEmpty() }
                        ?.let { datos.addProperty("observaciones_cierre", it) };
                    val r = RetrofitClient.api.finalizarCasoSanitario(
                        c.id,
                        datos
                    ); if (r.isSuccessful) {
                        d.dismiss(); aviso("Caso finalizado")
                    } else aviso("No se pudo finalizar (${r.code()})")
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    aviso("No se pudo confirmar el cierre. Consulta el estado antes de repetir."); d.dismiss()
                } finally {
                    ocupado = false; d.findViewById<View>(R.id.btnGuardarEvento)!!?.isEnabled =
                        true; actualizarSilenciosamente()
                }
            }
        }
    }

    override fun onDestroyView() {
        carga?.cancel(); _binding = null; super.onDestroyView()
    }
}