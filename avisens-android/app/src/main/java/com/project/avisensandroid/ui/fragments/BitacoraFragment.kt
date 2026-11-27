
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
import android.widget.AdapterView
import androidx.core.widget.doAfterTextChanged
import android.app.DatePickerDialog
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.controller.FotosMortalidad
import com.project.avisensandroid.controller.OfflineCache
import com.project.avisensandroid.databinding.Po06BitacoraMortalidadOpBinding
import com.project.avisensandroid.model.RegistroMortalidadResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

class BitacoraFragment : BaseBottomNavFragment() {
    private val entradaTarjetas = AnimacionesTarjetas()


    private var _binding: Po06BitacoraMortalidadOpBinding? = null

    private val binding
        get() = _binding!!

    private val localeEspanol = Locale("es", "ES")

    private var cargaJob: Job? = null
    private var fotosJob: Job? = null
    private var registrosBase = emptyList<RegistroMortalidadResponse>()
    private var nombresBase = emptyMap<Int, String>()
    private val fechasFiltro = listOf("Todas las fechas", "Hoy", "Ayer", "Últimos 7 días", "Últimos 30 días", "Rango personalizado")
    private val causasAplicadas = linkedSetOf<String>()
    private val causasPendientes = linkedSetOf<String>()
    private var fechaAplicada = 0
    private var ultimaFechaSeleccionada = 0
    private var desdeAplicado: LocalDate? = null
    private var hastaAplicado: LocalDate? = null
    private var desde: LocalDate? = null
    private var hasta: LocalDate? = null
    private var ultimaLista: List<RegistroMortalidadResponse>? = null
    private var ultimosNombres = emptyMap<Int, String>()
    private var galponBase: Int? = null
    private var registrosCargados = false


    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po06BitacoraMortalidadOpBinding.inflate(
            inflater,
            container,
            false
        )

        return binding.root
    }

    override fun onViewCreated(
        view: View,
        savedInstanceState: Bundle?
    ) {
        super.onViewCreated(view, savedInstanceState)
        entradaTarjetas.reiniciar()
        ultimaLista = null
        configurarFiltros()
        if (registrosCargados && galponBase == (requireActivity() as MainActivity).obtenerGalponSeleccionadoId()) {
            aplicarFiltros()
        }

        configurarBottomNav(R.id.nav_bitacora)
        animarPestanaBitacora(binding.tabsBitacora, 0)

        binding.tbnConsumo.setOnClickListener {
            abrirPestanaBitacora(BitacoraConsumoFragment(), 0)
        }

        binding.tbnEnfermo.setOnClickListener {
            abrirPestanaBitacora(BitacoraEnfermoFragment(), 0)
        }

        binding.btnRegistrarEvento.setOnClickListener {
            (requireActivity() as MainActivity)
                .mostrarDialogRegistrarEvento()
        }
    }

    override fun onResume() {
        super.onResume()

        if (_binding != null) {
            cargarBitacora()
        }
    }

    fun actualizarAlRecuperarInternet() {
        if (_binding != null && isAdded) {
            cargarBitacora()
        }
    }

    fun actualizarSilenciosamente() {
        if (_binding != null && isAdded) {
            cargarBitacora(silenciosa = true)
        }
    }

    // ============================================================
    // CARGAR REGISTROS DE MORTALIDAD
    // ============================================================

    private fun cargarBitacora(
        silenciosa: Boolean = false
    ) {
        if (silenciosa && cargaJob?.isActive == true) return
        cargaJob?.cancel()
        cargaJob = viewLifecycleOwner.lifecycleScope.launch {
            try {
                val activity = requireActivity() as MainActivity
                val galponId = activity.obtenerGalponSeleccionadoId()
                if (galponId != galponBase) {
                    galponBase = galponId
                    registrosCargados = false
                    ultimaLista = null
                    entradaTarjetas.reiniciar()
                    binding.containerRegistros.removeAllViews()
                    registrosBase = emptyList()
                    nombresBase = emptyMap()
                    actualizarCausas()
                    aplicarFiltros()
                }
                if (galponId == null) {
                    return@launch
                }
                for (soloCache in listOf(true, false)) {
                    if (soloCache && registrosCargados) continue
                    val api = if (soloCache) RetrofitClient.apiCache else RetrofitClient.api
                    try {
                val (registros, nombres) = coroutineScope {
                    val registrosJob = async {
                        val datos = mutableListOf<RegistroMortalidadResponse>()
                        var pagina = 1
                        do {
                            val response = api.listarRegistrosMortalidad(pagina, 100)
                            check(response.isSuccessful) { "Error de mortalidad: ${response.code()}" }
                            val body = checkNotNull(response.body()) { "Sin datos de mortalidad" }
                            datos.addAll(body.data)
                            val total = body.meta.totalPages.coerceAtLeast(pagina)
                            pagina++
                        } while (pagina <= total)
                        datos
                    }
                    val lotesJob = async {
                        val nombres = mutableMapOf<Int, String>()
                        var pagina = 1
                        do {
                            val response = api.listarLotes(pagina, 100)
                            check(response.isSuccessful) { "Error de lotes: ${response.code()}" }
                            val body = checkNotNull(response.body()) { "Sin datos de lotes" }
                            body.data.forEach { lote ->
                                val galpon = lote.galpon
                                if (galpon != null && galpon.id == galponId) {
                                    nombres[lote.id] = galpon.nombre.trim().ifBlank { "Galpón $galponId" }
                                }
                            }
                            val total = body.meta.totalPages.coerceAtLeast(pagina)
                            pagina++
                        } while (pagina <= total)
                        nombres
                    }
                    registrosJob.await() to lotesJob.await()
                }
                val filtrados = registros.filter { it.lote_id in nombres }
                    .sortedWith(compareByDescending<RegistroMortalidadResponse> { it.fecha.take(10) }
                        .thenByDescending { it.fecha_registro })
                if (_binding != null && activity.obtenerGalponSeleccionadoId() == galponId) {
                    registrosBase = filtrados
                    nombresBase = nombres
                    registrosCargados = true
                    actualizarCausas()
                    aplicarFiltros()
                    val contexto = activity.applicationContext
                    if (!soloCache && OfflineCache.hayInternet(contexto) && fotosJob?.isActive != true) {
                        fotosJob = viewLifecycleOwner.lifecycleScope.launch {
                            filtrados.filter { !it.foto_mime_type.isNullOrBlank() }.forEach { registro ->
                                try { FotosMortalidad.precargar(contexto, registro.id) }
                                catch (e: CancellationException) { throw e }
                                catch (_: Exception) { /* Se reintentará en la siguiente actualización. */ }
                            }
                        }
                    }
                }

                    } catch (e: CancellationException) { throw e }
                    catch (e: Exception) { if (!soloCache && !registrosCargados) throw e }
                }

            } catch (e: CancellationException) {
                throw e

            } catch (e: Exception) {
                if (!silenciosa && _binding != null && isAdded) {
                    mostrarError(
                        "Error al cargar mortalidad: " +
                                (e.message ?: "error desconocido")
                    )
                }
            }
        }
    }

    private fun configurarFiltros() {
        binding.spinnerFiltroFecha.adapter = MainActivity.SpinnerAdapterEstilizado(requireContext(), fechasFiltro.toMutableList())
        binding.spinnerFiltroFecha.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                val anterior = ultimaFechaSeleccionada
                ultimaFechaSeleccionada = position
                if (position == 5 && anterior != 5 && binding.panelFiltros.visibility == View.VISIBLE) {
                    seleccionarRango(anterior)
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }
        binding.edtBuscarMortalidad.doAfterTextChanged { aplicarFiltros() }
        binding.btnDesplegarCausas.setOnClickListener {
            mostrarCausas(binding.panelCausas.visibility != View.VISIBLE)
        }
        binding.btnFiltros.setOnClickListener {
            if (binding.panelFiltros.visibility == View.VISIBLE) {
                mostrarPanel(false)
            } else {
                causasPendientes.clear()
                causasPendientes.addAll(causasAplicadas)
                desde = desdeAplicado
                hasta = hastaAplicado
                ultimaFechaSeleccionada = fechaAplicada
                binding.spinnerFiltroFecha.setSelection(fechaAplicada)
                actualizarCausas()
                mostrarCausas(false)
                mostrarPanel(true)
            }
        }
        binding.btnAplicarFiltros.setOnClickListener {
            val fecha = binding.spinnerFiltroFecha.selectedItemPosition.coerceAtLeast(0)
            if (fecha == 5 && (desde == null || hasta == null)) {
                Toast.makeText(requireContext(), "Selecciona el rango de fechas", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            fechaAplicada = fecha
            desdeAplicado = desde
            hastaAplicado = hasta
            causasAplicadas.clear()
            causasAplicadas.addAll(causasPendientes)
            mostrarPanel(false)
            aplicarFiltros()
        }
        actualizarCausas()
        actualizarChips()
    }

    private fun mostrarPanel(visible: Boolean) {
        val panel = binding.panelFiltros
        panel.animate().cancel()
        if (visible) {
            panel.visibility = View.VISIBLE
            panel.alpha = 0f
            panel.animate().alpha(1f).setDuration(180L).start()
        } else {
            panel.animate().alpha(0f).setDuration(150L).withEndAction {
                panel.visibility = View.GONE
                panel.alpha = 1f
            }.start()
        }
    }

    private fun actualizarChips() {
        val grupo = binding.chipsFiltros
        grupo.removeAllViews()
        fun agregar(texto: String, quitar: () -> Unit) {
            val chip = com.google.android.material.chip.Chip(requireContext()).apply {
                text = texto
                isCloseIconVisible = true
                isCheckable = false
                setOnCloseIconClickListener { quitar(); aplicarFiltros() }
            }
            grupo.addView(chip)
        }
        if (fechaAplicada != 0) agregar(if (fechaAplicada == 5) "$desdeAplicado – $hastaAplicado" else fechasFiltro[fechaAplicada]) {
            fechaAplicada = 0
            desdeAplicado = null
            hastaAplicado = null
            binding.spinnerFiltroFecha.setSelection(0)
        }
        causasAplicadas.toList().forEach { causa ->
            agregar(causa.ifBlank { "Sin causa registrada" }) {
                causasAplicadas.remove(causa)
                causasPendientes.remove(causa)
                actualizarCausas()
            }
        }
        val cantidad = causasAplicadas.size + if (fechaAplicada != 0) 1 else 0
        grupo.visibility = if (cantidad > 0) View.VISIBLE else View.GONE
        binding.btnFiltros.text = if (cantidad > 0) "Filtros ($cantidad) ▾" else "Filtros ▾"
    }

    private fun seleccionarRango(anterior: Int) {
        fun cancelar() {
            _binding?.spinnerFiltroFecha?.setSelection(anterior)
        }
        elegirFecha(desde ?: LocalDate.now(), cancelar = ::cancelar) { inicio ->
            elegirFecha(hasta?.takeIf { !it.isBefore(inicio) } ?: inicio, inicio, ::cancelar) { fin ->
                desde = inicio
                hasta = fin
            }
        }
    }

    private fun elegirFecha(inicial: LocalDate, minimo: LocalDate? = null, cancelar: () -> Unit = {}, resultado: (LocalDate) -> Unit) {
        val dialogo = DatePickerDialog(requireContext(), { _, y, m, d ->
            if (_binding != null) resultado(LocalDate.of(y, m + 1, d))
        }, inicial.year, inicial.monthValue - 1, inicial.dayOfMonth)
        minimo?.let { dialogo.datePicker.minDate = it.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() }
        dialogo.setOnCancelListener { cancelar() }
        dialogo.show()
    }

    private fun mostrarCausas(visible: Boolean) {
        binding.panelCausas.visibility = if (visible) View.VISIBLE else View.GONE
        binding.btnDesplegarCausas.text = if (visible) "Causa presuntiva ▴" else "Causa presuntiva ▾"
    }

    private fun actualizarCausas() {
        val opciones = MainActivity.CausasMortalidad.opciones
        binding.containerCausas.removeAllViews()
        opciones.forEach { causa ->
            val cantidad = registrosBase.count { it.causa_presuntiva.orEmpty().trim().equals(causa, ignoreCase = true) }
            val check = android.widget.CheckBox(requireContext()).apply {
                text = "${causa.ifBlank { "Sin causa registrada" }} ($cantidad)"
                setTextColor(ContextCompat.getColor(requireContext(), R.color.text_primary))
                isChecked = causasPendientes.contains(causa)
                setOnCheckedChangeListener { _, marcado ->
                    if (marcado) causasPendientes.add(causa) else causasPendientes.remove(causa)
                }
            }
            binding.containerCausas.addView(check)
        }
    }

    private fun aplicarFiltros() {
        if (_binding == null) return
        val texto = binding.edtBuscarMortalidad.text.toString().trim()
        val fecha = fechaAplicada
        actualizarChips()
        if (!registrosCargados) return
        val hoy = LocalDate.now()
        val lista = registrosBase.filter { r ->
            val dia = runCatching { LocalDate.parse(r.fecha.take(10)) }.getOrNull()
            val coincideFecha = when (fecha) {
                1 -> dia == hoy
                2 -> dia == hoy.minusDays(1)
                3 -> dia != null && !dia.isBefore(hoy.minusDays(6)) && !dia.isAfter(hoy)
                4 -> dia != null && !dia.isBefore(hoy.minusDays(29)) && !dia.isAfter(hoy)
                5 -> dia != null && desdeAplicado?.let { !dia.isBefore(it) } == true && hastaAplicado?.let { !dia.isAfter(it) } == true
                else -> true
            }
            val coincideCausa = causasAplicadas.isEmpty() || causasAplicadas.any { r.causa_presuntiva.orEmpty().trim().equals(it, ignoreCase = true) }
            coincideFecha && coincideCausa && (texto.isBlank() || listOf(r.fecha, r.cantidad_aves.toString(), r.causa_presuntiva.orEmpty(), r.observaciones.orEmpty(), r.lote.codigo, nombresBase[r.lote_id].orEmpty()).any { it.contains(texto, ignoreCase = true) })
        }
        if (lista == ultimaLista && nombresBase == ultimosNombres) return
        ultimaLista = lista
        ultimosNombres = nombresBase
        mostrarRegistros(lista, nombresBase)
    }

    // ============================================================
    // MOSTRAR REGISTROS AGRUPADOS POR FECHA
    // ============================================================

    private fun mostrarRegistros(
        registros: List<RegistroMortalidadResponse>,
        nombresGalponPorLote: Map<Int, String>
    ) {
        val contenedor = binding.containerRegistros

        entradaTarjetas.comenzar()
        contenedor.removeAllViews()

        if (registros.isEmpty()) {
            contenedor.addView(
                TextView(requireContext()).apply {
                    text = if (registrosBase.isEmpty()) "No hay registros de mortalidad" else "No hay registros que coincidan con los filtros"
                    textSize = 15f
                    gravity = Gravity.CENTER

                    setTextColor(
                        androidx.core.content.ContextCompat.getColor(context, R.color.adaptive_text_66736d)
                    )

                    setPadding(
                        dp(16),
                        dp(40),
                        dp(16),
                        dp(40)
                    )
                }
            )

            return
        }

        // Agrupar registros por fecha seleccionada
        // al registrar el evento.

        registros.groupBy {
            it.fecha.take(10)
        }.forEach { (fecha, registrosDelDia) ->

            val encabezadoFecha =
                TextView(requireContext()).apply {

                    text = formatearFechaLarga(fecha)

                    textSize = 16f

                    setTypeface(
                        null,
                        Typeface.BOLD
                    )

                    setTextColor(
                        androidx.core.content.ContextCompat.getColor(context, R.color.adaptive_text_183c2e)
                    )

                    setPadding(
                        dp(2),
                        dp(16),
                        0,
                        dp(10)
                    )
                }

            contenedor.addView(encabezadoFecha)
            entradaTarjetas.mostrar(encabezadoFecha, "fecha:$fecha", true)

            // Una tarjeta independiente por registro.

            registrosDelDia.forEach { registro ->

                val nombreGalpon =
                    nombresGalponPorLote[registro.lote_id]
                        ?: "Galpón no disponible"

                agregarRegistro(
                    registro,
                    nombreGalpon
                )
            }
        }
    }

    // ============================================================
    // CREAR TARJETA DE REGISTRO
    // ============================================================

    private fun agregarRegistro(
        registro: RegistroMortalidadResponse,
        nombreGalpon: String
    ) {
        val contexto = requireContext()

        val tarjeta = LinearLayout(contexto).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL

            background = ContextCompat.getDrawable(
                contexto,
                R.drawable.bg_tarjeta_mortalidad
            )

            elevation = dp(2).toFloat()

            setPadding(
                dp(14),
                dp(14),
                dp(14),
                dp(14)
            )

            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(10)
            }
        }

        val detalles = LinearLayout(contexto).apply {
            orientation = LinearLayout.VERTICAL
        }
        tarjeta.addView(detalles, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))

        // --------------------------------------------------------
        // FUNCIÓN PARA CREAR TEXTOS
        // --------------------------------------------------------

        fun crearTexto(
            valor: String,
            tamano: Float,
            color: String,
            negrita: Boolean = false
        ): TextView {
            return TextView(contexto).apply {
                text = valor
                textSize = if (tamano < 16f) tamano + 1f else tamano
                typeface = android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL)

                setTextColor(
                    ColoresAdaptativos.texto(requireContext(), color)
                )

                if (negrita) {
                    setTypeface(
                        null,
                        Typeface.BOLD
                    )
                }
            }
        }

        // --------------------------------------------------------
        // 1. NOMBRE DEL GALPÓN
        // --------------------------------------------------------

        detalles.addView(
            crearTexto(
                nombreGalpon,
                14f,
                "#345846",
                true
            )
        )

        // --------------------------------------------------------
        // 2. CANTIDAD DE AVES
        // --------------------------------------------------------

        val textoCantidad = crearTexto(
            "${registro.cantidad_aves} aves registradas",
            16f,
            "#183C2E",
            true
        ).apply {
            setPadding(
                0,
                dp(9),
                0,
                dp(5)
            )
        }

        detalles.addView(textoCantidad)

        // --------------------------------------------------------
        // FUNCIÓN PARA MOSTRAR DETALLES
        // --------------------------------------------------------

        fun agregarDetalle(
            titulo: String,
            valor: String?
        ) {
            if (valor.isNullOrBlank()) {
                return
            }

            val detalle = crearTexto(
                "$titulo: $valor",
                12f,
                "#46544C"
            )

            detalles.addView(
                detalle,
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = dp(5)
                }
            )
        }

        // --------------------------------------------------------
        // 3. USUARIO QUE REALIZÓ EL REGISTRO
        // --------------------------------------------------------

        agregarDetalle(
            "Registró",
            "Usuario #${registro.usuario_id}"
        )

        // --------------------------------------------------------
        // 4. CAUSA PROBABLE
        // --------------------------------------------------------

        agregarDetalle(
            "Causa probable",
            registro.causa_presuntiva
        )

        // --------------------------------------------------------
        // 5. DISPOSICIÓN
        // --------------------------------------------------------

        agregarDetalle(
            "Disposición",
            registro.disposicion
        )

        // --------------------------------------------------------
        // 6. OBSERVACIONES
        // Se dejan al final porque pueden ocupar varias líneas.
        // --------------------------------------------------------

        agregarDetalle(
            "Observaciones",
            registro.observaciones
        )

        val pendiente = com.project.avisensandroid.controller.FotosMortalidad.pendiente(contexto, registro.id)
        if (pendiente != null || !registro.foto_mime_type.isNullOrBlank()) {
            val miniatura = android.widget.FrameLayout(contexto).apply {
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(0xFF66736D.toInt())
                    cornerRadius = dp(12).toFloat()
                }
                clipToOutline = true
                contentDescription = "Ampliar foto de mortalidad"
                isClickable = true
                isFocusable = true
            }
            val previa = android.widget.ImageView(contexto).apply {
                scaleType = android.widget.ImageView.ScaleType.CENTER_CROP
            }
            miniatura.addView(previa, android.widget.FrameLayout.LayoutParams(-1, -1))
            val ampliar = android.widget.ImageView(contexto).apply {
                setImageResource(R.drawable.ic_ampliar_foto_mortalidad)
                setColorFilter(Color.WHITE)
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(0x99000000.toInt())
                    cornerRadius = dp(6).toFloat()
                }
                setPadding(dp(5), dp(5), dp(5), dp(5))
            }
            miniatura.addView(ampliar, android.widget.FrameLayout.LayoutParams(
                dp(26), dp(26), Gravity.BOTTOM or Gravity.END
            ).apply { setMargins(dp(4), dp(4), dp(4), dp(4)) })
            tarjeta.addView(miniatura, LinearLayout.LayoutParams(dp(90), dp(90)).apply {
                marginStart = dp(12)
            })
            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val bitmap = FotosMortalidad.obtener(contexto, registro.id)
                    if (bitmap != null) {
                        val escala = (dp(180).toFloat() / maxOf(bitmap.width, bitmap.height)).coerceAtMost(1f)
                        val reducida = android.graphics.Bitmap.createScaledBitmap(bitmap,
                            (bitmap.width * escala).toInt().coerceAtLeast(1),
                            (bitmap.height * escala).toInt().coerceAtLeast(1), true)
                        if (reducida !== bitmap) bitmap.recycle()
                        previa.setImageBitmap(reducida)
                    }
                } catch (e: CancellationException) { throw e }
                catch (_: Exception) { /* Reintentar al tocar la foto. */ }
            }
            miniatura.setOnClickListener {
                miniatura.isEnabled = false
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val bitmap = FotosMortalidad.obtener(contexto, registro.id)
                        if (bitmap == null) {
                            mostrarError("Fotografía no disponible. Conéctate a internet para descargarla.")
                            return@launch
                        }
                        if (_binding == null || !isAdded) return@launch
                        val imagen = android.widget.ImageView(contexto).apply {
                            setImageBitmap(bitmap)
                            scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
                            adjustViewBounds = true
                        }
                        val visor = android.app.Dialog(contexto, android.R.style.Theme_Material_NoActionBar)
                        visor.setContentView(imagen)
                        imagen.setOnClickListener { visor.dismiss() }
                        visor.show()
                        if (pendiente != null && pendiente.exists() && OfflineCache.hayInternet(contexto)) {
                            try {
                                val bytes = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { pendiente.readBytes() }
                                FotosMortalidad.subir(contexto, registro.id, bytes)
                            } catch (e: CancellationException) { throw e }
                            catch (_: Exception) { /* La foto local sigue disponible. */ }
                        }
                    } catch (e: CancellationException) { throw e }
                    catch (_: Exception) { mostrarError("No se pudo cargar la fotografía. Revisa tu conexión.") }
                    finally { miniatura.isEnabled = true }
                }
            }
        }

        binding.containerRegistros.addView(tarjeta)
        entradaTarjetas.mostrar(tarjeta, "mortalidad:${registro.id}")
    }

    // ============================================================
    // FORMATEAR FECHA
    // Ejemplo: 2026-11-20 -> 20 noviembre 2026
    // ============================================================

    private fun formatearFechaLarga(
        fecha: String
    ): String {
        return try {
            val fechaLocal = LocalDate.parse(
                fecha.take(10),
                DateTimeFormatter.ISO_LOCAL_DATE
            )

            fechaLocal.format(
                DateTimeFormatter.ofPattern(
                    "d MMMM yyyy",
                    localeEspanol
                )
            )

        } catch (_: Exception) {
            fecha
        }
    }

    // ============================================================
    // MOSTRAR ERRORES
    // ============================================================

    private fun mostrarError(
        mensaje: String
    ) {
        if (!isAdded) {
            return
        }

        Toast.makeText(
            requireContext(),
            mensaje,
            Toast.LENGTH_LONG
        ).show()
    }

    // ============================================================
    // CONVERTIR DP
    // ============================================================

    private fun dp(
        valor: Int
    ): Int {
        return (
                valor * resources.displayMetrics.density
                ).toInt()
    }

    // ============================================================
    // LIMPIAR BINDING
    // ============================================================

    override fun onDestroyView() {
        fotosJob?.cancel()
        fotosJob = null
        cargaJob?.cancel()
        cargaJob = null
        super.onDestroyView()
        _binding = null
    }
}