package com.project.avisensandroid.ui.fragments

import com.project.avisensandroid.ui.ColoresAdaptativos
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.Po08BitacoraConsumoOpBinding
import com.project.avisensandroid.model.ConsumoDiarioResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class BitacoraConsumoFragment : BaseBottomNavFragment() {
    private val entradaTarjetas = AnimacionesTarjetasConsumo()


    private var _binding: Po08BitacoraConsumoOpBinding? = null
    private val binding get() = _binding!!

    private var cargaJob: Job? = null
    private var primeraCarga = true
    private var firmaRegistros: String? = null
    private var consulta = ""
    private var fechaFiltro = 0
    private var ultimos = emptyList<ConsumoDiarioResponse>()
    private var lotesUltimos = emptySet<Int>()
    private fun coincideFecha(fecha: String): Boolean {
        if (fechaFiltro == 0) return true
        val hoy = java.time.LocalDate.now(java.time.ZoneId.of("America/Bogota"))
        val dia =
            runCatching { java.time.LocalDate.parse(fecha.take(10)) }.getOrNull() ?: return false
        return when (fechaFiltro) {
            1 -> dia == hoy; 2 -> dia == hoy.minusDays(1); 3 -> !dia.isBefore(hoy.minusDays(6)) && !dia.isAfter(
                hoy
            ); else -> !dia.isBefore(hoy.minusDays(29)) && !dia.isAfter(hoy)
        }
    }

    private fun configurarFiltros() {
        consulta = ""; fechaFiltro = 0; ultimos = emptyList(); lotesUltimos = emptySet()
        binding.fechaConsumo.adapter = android.widget.ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            listOf("Todas las fechas", "Hoy", "Ayer", "Últimos 7 días", "Últimos 30 días")
        )
        binding.filtrosConsumo.setOnClickListener {
            binding.panelConsumo.visibility =
                if (binding.panelConsumo.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }
        binding.buscarConsumo.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) =
                Unit

            override fun afterTextChanged(s: android.text.Editable?) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                consulta = s.toString().trim(); mostrarRegistros(ultimos, lotesUltimos)
            }
        })
        binding.aplicarConsumo.setOnClickListener {
            fechaFiltro = binding.fechaConsumo.selectedItemPosition
            binding.panelConsumo.visibility = View.GONE
            binding.quitarConsumo.text = "Filtro de fecha ×"
            binding.quitarConsumo.visibility = if (fechaFiltro == 0) View.GONE else View.VISIBLE
            mostrarRegistros(ultimos, lotesUltimos)
        }
        binding.quitarConsumo.setOnClickListener {
            fechaFiltro =
                0; binding.fechaConsumo.setSelection(0); binding.quitarConsumo.visibility =
            View.GONE; mostrarRegistros(ultimos, lotesUltimos)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po08BitacoraConsumoOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        entradaTarjetas.reiniciar()
        primeraCarga = true
        firmaRegistros = null
        configurarFiltros()
        animarBuscadorBitacora(binding.buscarConsumo.parent as View)

        val activity = requireActivity() as MainActivity
        configurarBottomNav(R.id.nav_bitacora)
        animarPestanaBitacora(binding.tabsBitacora, 3)
        binding.tabPesajes.setOnClickListener { abrirPestanaBitacora(BitacoraPesajesFragment(), 3) }

        binding.btnRegistrarConsumo.setOnClickListener { registrarConsumo(activity) }
        com.project.avisensandroid.controller.Hu56OfflineQueue.programar(requireContext())
        viewLifecycleOwner.lifecycleScope.launch {
            var anterior = ""
            while (true) {
                val actual =
                    com.project.avisensandroid.controller.Hu56OfflineQueue.registros(requireContext())
                        .toString()
                if (actual != anterior) {
                    anterior = actual; cargarConsumos()
                }
                kotlinx.coroutines.delay(1500)
            }
        }
        binding.btnMortalidad.setOnClickListener {
            abrirPestanaBitacora(BitacoraFragment(), 3)
        }

        binding.btnEnfermo.setOnClickListener {
            abrirPestanaBitacora(BitacoraEnfermoFragment(), 3)
        }
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) {
            cargarConsumos()
        }
    }

    fun actualizarSilenciosamente() {
        if (_binding != null && isAdded) cargarConsumos()
    }

    private fun registrarConsumo(activity: MainActivity) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val ids = activity.obtenerIdsLotesDeGalponSeleccionado().toList()
                if (ids.isEmpty()) {
                    Toast.makeText(
                        requireContext(),
                        "Selecciona un galpón con lote disponible",
                        Toast.LENGTH_LONG
                    ).show(); return@launch
                }
                val c = requireContext()
                val granja = activity.obtenerGranjaSeleccionadaId()
                val insumos = mutableListOf<com.project.avisensandroid.model.InsumoResponse>()
                var pagina = 1
                do {
                    val r = RetrofitClient.api.listarInsumos(pagina, 100)
                    val body = r.body() ?: break
                    insumos.addAll(body.data)
                    pagina++
                } while (pagina <= body.meta.totalPages)
                val alimentos = insumos.filter {
                    it.activo && granja != null && it.granja_id == granja && it.tipo?.contains(
                        "alimento",
                        true
                    ) == true && it.unidad_medida.lowercase(Locale.ROOT) in listOf(
                        "kg",
                        "kilogramo",
                        "kilogramos"
                    )
                }
                val dialog = android.app.Dialog(c)
                val formulario = android.view.LayoutInflater.from(c)
                    .inflate(R.layout.r07_registrar_consumo, null)
                dialog.setContentView(formulario)
                dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
                val selector =
                    formulario.findViewById<android.widget.Spinner>(R.id.spinnerAlimentoConsumo)
                val lotes = formulario.findViewById<android.widget.Spinner>(R.id.spinnerLoteConsumo)
                fun adapter(items: List<String>) =
                    MainActivity.SpinnerAdapterEstilizado(c, items.toMutableList())
                selector.adapter =
                    adapter(listOf("Seleccionar alimento") + alimentos.map { "${it.nombre} (${it.stock_actual ?: 0.0} kg)" })
                lotes.adapter = adapter(ids.map { "Lote $it" })
                val fecha = formulario.findViewById<android.widget.EditText>(R.id.edtFechaConsumo)
                val alimento =
                    formulario.findViewById<android.widget.EditText>(R.id.edtAlimentoConsumo)
                val agua = formulario.findViewById<android.widget.EditText>(R.id.edtAguaConsumo)
                val formatoFecha = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                listOf(fecha, alimento, agua).forEach { campo ->
                    campo.setTextColor(ColoresAdaptativos.texto(c, "#000000"))
                    campo.setHintTextColor(
                        androidx.core.content.ContextCompat.getColor(
                            c,
                            R.color.text_secondary
                        )
                    )
                }
                fecha.setText(formatoFecha.format(java.util.Date()))
                fecha.setOnClickListener {
                    val cal = java.util.Calendar.getInstance()
                    android.app.DatePickerDialog(
                        c,
                        { _, y, m, d ->
                            fecha.setText(String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d))
                        },
                        cal.get(java.util.Calendar.YEAR),
                        cal.get(java.util.Calendar.MONTH),
                        cal.get(java.util.Calendar.DAY_OF_MONTH)
                    ).show()
                }
                formulario.findViewById<View>(R.id.btnCancelarEvento)
                    .setOnClickListener { dialog.dismiss() }
                val guardar = formulario.findViewById<View>(R.id.btnGuardarEvento)
                guardar.setOnClickListener {
                    val a = alimento.text.toString().replace(',', '.').toDoubleOrNull()
                    val w = agua.text.toString().replace(',', '.').toDoubleOrNull()
                    val dia = fecha.text.toString().trim()
                    val formato =
                        SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { isLenient = false }
                    val fechaValida =
                        runCatching { formato.format(formato.parse(dia)!!) == dia }.getOrDefault(
                            false
                        )
                    if (!fechaValida || (a == null && w == null) || (a != null && (!a.isFinite() || a < 0)) || (w != null && (!w.isFinite() || w < 0)) || (alimento.text.isNotBlank() && a == null) || (agua.text.isNotBlank() && w == null)) {
                        Toast.makeText(c, "Revisa la fecha y las cantidades", Toast.LENGTH_LONG)
                            .show(); return@setOnClickListener
                    }
                    val request = com.project.avisensandroid.model.CreateConsumoDiarioRequest(
                        ids[lotes.selectedItemPosition],
                        dia,
                        alimento_kg = a,
                        agua_litros = w
                    )
                    val insumo = alimentos.getOrNull(selector.selectedItemPosition - 1)
                    if (a != null && a > 0 && (insumo == null || a > (insumo.stock_actual
                            ?: 0.0) || java.math.BigDecimal.valueOf(a).stripTrailingZeros()
                            .scale() > 3)
                    ) {
                        Toast.makeText(
                            c,
                            "Selecciona alimento en kg con stock suficiente (máximo 3 decimales)",
                            Toast.LENGTH_LONG
                        ).show(); return@setOnClickListener
                    }
                    val ok = com.project.avisensandroid.controller.Hu56OfflineQueue.guardar(
                        c,
                        "consumo",
                        request,
                        insumoId = if ((a ?: 0.0) > 0) insumo?.id else null
                    )
                    Toast.makeText(
                        c,
                        if (!ok) "No se pudo guardar" else if (com.project.avisensandroid.controller.OfflineCache.hayInternet(
                                c
                            )
                        ) "Enviando registro automáticamente" else "Registro guardado sin conexión",
                        Toast.LENGTH_LONG
                    ).show()
                    if (ok) {
                        dialog.dismiss(); cargarConsumos()
                    }
                }
                dialog.show()
                dialog.window?.setLayout(
                    (resources.displayMetrics.widthPixels * 0.92f).toInt(),
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                Toast.makeText(
                    requireContext(),
                    "No hay lotes disponibles en la copia local",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun cargarConsumos() {
        if (cargaJob?.isActive == true) return
        cargaJob = viewLifecycleOwner.lifecycleScope.launch {
            // Evita reconstruir las tarjetas durante la transición del selector.
            if (primeraCarga) {
                primeraCarga = false; kotlinx.coroutines.delay(950L)
            }
            try {
                val activity = requireActivity() as MainActivity
                val galponId = activity.obtenerGalponSeleccionadoId()
                if (galponId == null) {
                    mostrarRegistros(emptyList())
                    return@launch
                }
                var copiaMostrada = false
                for (soloCache in listOf(true, false)) {
                    val api = if (soloCache) RetrofitClient.apiCache else RetrofitClient.api
                    try {
                        val (consumos, idsLotes) = coroutineScope {
                            val lotesJob =
                                async { activity.obtenerIdsLotesDeGalponSeleccionado(soloCache) }
                            val consumosJob = async {
                                val datos = mutableListOf<ConsumoDiarioResponse>()
                                var pagina = 1
                                do {
                                    val response = api.listarConsumosDiarios(pagina, 100)
                                    check(response.isSuccessful) { "Error de consumos: ${response.code()}" }
                                    val body =
                                        checkNotNull(response.body()) { "Sin datos de consumo" }
                                    datos.addAll(body.data)
                                    val total = body.meta.totalPages.coerceAtLeast(pagina)
                                    pagina++
                                } while (pagina <= total)
                                datos
                            }
                            consumosJob.await() to lotesJob.await()
                        }
                        if (_binding != null && activity.obtenerGalponSeleccionadoId() == galponId) {
                            mostrarRegistros(
                                consumos.filter { it.lote_id in idsLotes },
                                idsLotes.toSet()
                            )
                        }

                        copiaMostrada = true
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        if (!soloCache && !copiaMostrada) throw e
                    }
                }

            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (_binding != null) {
                    Toast.makeText(
                        requireContext(),
                        "Error al cargar consumos: ${e.message ?: "error desconocido"}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    private fun mostrarRegistros(
        datosOriginales: List<ConsumoDiarioResponse>,
        ids: Set<Int> = emptySet()
    ) {
        ultimos = datosOriginales; lotesUltimos = ids
        val registros = datosOriginales.filter {
            coincideFecha(it.fecha) && listOf(
                it.fecha,
                it.lote?.codigo.orEmpty(),
                it.tipo_alimento?.nombre.orEmpty(),
                it.alimento_kg.toString(),
                it.agua_litros.toString()
            ).any { valor -> valor.contains(consulta, true) }
        }
        val c = requireContext()
        val contenedor = binding.containerRegistros
        val pendientes = com.project.avisensandroid.controller.Hu56OfflineQueue.registros(c)
            .filter { it.optString("tipo") == "consumo" && it.optString("estado") != "SINCRONIZADO" }
            .mapNotNull { item ->
                val datos =
                    runCatching { org.json.JSONObject(item.getString("payload")) }.getOrNull()
                if (datos != null && datos.optInt("lote_id") in ids && coincideFecha(
                        datos.optString(
                            "fecha"
                        )
                    ) && datos.toString().contains(consulta, true)
                ) item to datos else null
            }
        val firmaNueva = registros.toString() + pendientes.toString() + ids.toString()
        if (firmaRegistros == firmaNueva) return
        firmaRegistros = firmaNueva
        entradaTarjetas.comenzar()
        contenedor.removeAllViews()
        val dias = (registros.map { it.fecha.take(10) } + pendientes.map {
            it.second.optString("fecha").take(10)
        }).distinct().sortedDescending()
        if (dias.isEmpty()) {
            contenedor.addView(TextView(c).apply {
                text = "No hay registros de consumo para el galpón seleccionado"
                setTextColor(resources.getColor(R.color.text_secondary, c.theme))
                textSize = 15f
                gravity = Gravity.CENTER
                setPadding(dp(20), dp(40), dp(20), dp(40))
            })
        }
        dias.forEach { dia ->
            contenedor.addView(TextView(c).apply {
                text = runCatching {
                    java.time.LocalDate.parse(dia).format(
                        java.time.format.DateTimeFormatter.ofPattern(
                            "EEEE, d 'de' MMMM 'de' yyyy",
                            Locale("es", "CO")
                        )
                    ).replaceFirstChar { it.uppercase() }
                }.getOrDefault(dia)
                textSize = 16f
                setTypeface(null, Typeface.BOLD)
                setTextColor(
                    androidx.core.content.ContextCompat.getColor(
                        c,
                        R.color.adaptive_text_183c2e
                    )
                )
                setPadding(dp(2), dp(16), 0, dp(10))
            })
            entradaTarjetas.mostrar(
                contenedor.getChildAt(contenedor.childCount - 1),
                "fecha:$dia",
                true
            )
            pendientes.filter { it.second.optString("fecha").take(10) == dia }
                .forEach { (item, datos) ->
                    val tarjeta = TextView(c).apply {
                        text =
                            "Lote ${datos.optInt("lote_id")}\n" + when (item.optString("estado")) {
                                "ERROR" -> "Registro rechazado: ${item.optString("error")}"
                                "ERROR_STOCK" -> "Consumo guardado; descuento rechazado: ${
                                    item.optString(
                                        "error"
                                    )
                                }"

                                "REVISAR_STOCK" -> "Consumo guardado; descuento por confirmar"
                                "REVISAR" -> "Envío por confirmar; no repetir el registro. ${
                                    item.optString(
                                        "error"
                                    )
                                }"

                                else -> "Pendiente de sincronización automática"
                            }
                        setTextColor(resources.getColor(R.color.text_primary, c.theme))
                        setPadding(dp(14), dp(12), dp(14), dp(12))
                        setBackgroundResource(R.drawable.bg_bitacora_card)
                        layoutParams =
                            LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) }
                    }
                    contenedor.addView(tarjeta)
                    entradaTarjetas.mostrar(tarjeta, "pendiente:${item.optString("id")}")
                }
            registros.filter { it.fecha.take(10) == dia }
                .sortedByDescending { it.fecha_registro.orEmpty() }.forEach { consumo ->
                    val tarjeta = crearTarjetaConsumo(consumo)
                    contenedor.addView(tarjeta)
                    entradaTarjetas.mostrar(tarjeta, "consumo:${consumo.id}")
                }
        }
    }

    private fun crearTarjetaConsumo(consumo: ConsumoDiarioResponse): View {
        val card = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            background = resources.getDrawable(
                R.drawable.bg_bitacora_card,
                requireContext().theme
            )
            setPadding(dp(14), dp(14), dp(14), dp(14))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(8) }
        }

        val filaSuperior = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val lote = TextView(requireContext()).apply {
            text = consumo.lote?.codigo ?: "Lote ${consumo.lote_id}"
            setTextColor(resources.getColor(R.color.text_primary, requireContext().theme))
            textSize = 12f
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        filaSuperior.addView(lote)

        card.addView(filaSuperior)

        val alimento = consumo.alimento_kg
        val agua = consumo.agua_litros
        val alimentoTexto =
            alimento?.let { "${formatearNumero(it)} kg alimento" } ?: "Alimento no registrado"

        card.addView(TextView(requireContext()).apply {
            text = alimentoTexto
            setTextColor(resources.getColor(R.color.text_primary, requireContext().theme))
            textSize = 16f
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(8) }
        })

        val detalles = mutableListOf<String>()
        agua?.let { detalles.add("${formatearNumero(it)} L agua") }
        consumo.tipo_alimento?.nombre?.takeIf { it.isNotBlank() }?.let { detalles.add(it) }
        if (consumo.alerta_agua_baja) detalles.add("Alerta de agua baja")
        if (detalles.isEmpty()) detalles.add("Sin datos adicionales")

        card.addView(TextView(requireContext()).apply {
            text = detalles.joinToString(" · ")
            setTextColor(
                androidx.core.content.ContextCompat.getColor(
                    context,
                    R.color.adaptive_text_69746f
                )
            )
            textSize = 12f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(4) }
        })

        return card
    }

    private fun formatearFecha(valor: String): String {
        return try {
            val entrada = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.US)
            entrada.timeZone = TimeZone.getTimeZone("UTC")
            val fecha = entrada.parse(valor)
                ?: return valor.take(10)
            SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(fecha)
        } catch (_: Exception) {
            valor.take(10)
        }
    }

    private fun formatearNumero(valor: Double): String {
        return java.text.NumberFormat.getNumberInstance(Locale.US).apply {
            maximumFractionDigits = 2
            minimumFractionDigits = 0
        }.format(valor)
    }

    private fun dp(valor: Int): Int =
        (valor * resources.displayMetrics.density).toInt()

    override fun onDestroyView() {
        cargaJob?.cancel()
        cargaJob = null
        super.onDestroyView()
        _binding = null
    }
}

/** Escalonamiento individual sin agrupar los registros al alcanzar un límite fijo. */
private class AnimacionesTarjetasConsumo {
    private val vistas = mutableSetOf<String>()
    private var indice = 0
    fun reiniciar() {
        vistas.clear(); indice = 0
    }

    fun comenzar() {
        indice = 0
    }

    fun mostrar(v: View, clave: String, texto: Boolean = false) {
        if (v.visibility != View.VISIBLE || !vistas.add(clave)) return
        v.alpha = 0f
        v.translationY = (if (texto) 24f else 48f) * v.resources.displayMetrics.density
        v.animate().alpha(1f).translationY(0f)
            .setStartDelay(indice++ * 120L).setDuration(750L)
            .setInterpolator(android.view.animation.DecelerateInterpolator()).start()
    }
}
