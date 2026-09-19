package com.project.avisensandroid.ui.fragments

import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.Po01InicioOpBinding
import com.project.avisensandroid.model.AlertaResponse
import com.project.avisensandroid.model.ConsumoDiarioResponse
import com.project.avisensandroid.model.GranjaResponse
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.IndicadorLoteResponse
import com.project.avisensandroid.model.LoteResponse
import com.project.avisensandroid.model.MedicionResponse
import com.project.avisensandroid.model.PesajeResponse
import com.project.avisensandroid.model.RegistroMortalidadResponse
import com.project.avisensandroid.model.EventoSanitarioResponse
import com.project.avisensandroid.model.SensorResponse
import com.project.avisensandroid.model.UserRole
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Inicio compartido por Operario y Propietario.
 *
 * El contenido visual conserva el diseño existente, pero sus cifras y estados
 * se alimentan de los módulos reales del backend: granjas, galpones, lotes,
 * mortalidad, eventos sanitarios, pesajes, consumos, sensores, mediciones,
 * alertas e indicadores.
 */
class InicioFragment : BaseBottomNavFragment() {

    private var _binding: Po01InicioOpBinding? = null
    private val binding get() = _binding!!

    private var granjas: List<GranjaResponse> = emptyList()
    private var galpones: List<GalponResponse> = emptyList()
    private var lotes: List<LoteResponse> = emptyList()
    private var mortalidades: List<RegistroMortalidadResponse> = emptyList()
    private var eventosSanitarios: List<EventoSanitarioResponse> = emptyList()
    private var pesajes: List<PesajeResponse> = emptyList()
    private var consumos: List<ConsumoDiarioResponse> = emptyList()
    private var sensores: List<SensorResponse> = emptyList()

    private var granjaSeleccionada: GranjaResponse? = null
    private var galponSeleccionadoId: Int? = null

    private var cargaDashboardId: Int = 0

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po01InicioOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val activity = requireActivity() as MainActivity
        configurarBottomNav(R.id.nav_inicio)
        configurarEncabezado(activity)

        // Inicio es compartido entre Propietario y Operario, pero la sección
        // de sensores solo pertenece al Propietario porque el Operario ya
        // tiene su apartado propio de Sensores.
        binding.operatorStatsContainer.visibility = View.VISIBLE
        binding.sectionSensoresInicio.visibility =
            if (esPropietario()) View.VISIBLE else View.GONE

        binding.btnPerfil.setOnClickListener {
            activity.mostrarConfiguracion()
        }

        cargarDatosIniciales()
    }

    private fun configurarEncabezado(activity: MainActivity) {
        binding.txtNombreUsuario.text = com.project.avisensandroid.model.UserSession.name(activity)
        binding.txtRolUsuario.text =
            com.project.avisensandroid.model.UserSession.role(activity)?.displayName ?: "Usuario"
        binding.txtSaludo.text = obtenerSaludo()
    }

    private fun obtenerSaludo(): String =
        when (java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)) {
            in 5..11 -> "Buenos días"
            in 12..17 -> "Buenas tardes"
            else -> "Buenas noches"
        }

    private fun cargarDatosIniciales() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val activity = requireActivity() as MainActivity

                // Estructura principal: si granjas o galpones fallan, no tiene
                // sentido continuar dibujando el selector.
                val responseGranjas = activity.obtenerGranjas()
                if (!responseGranjas.isSuccessful) {
                    mostrarMensaje("No se pudieron cargar las granjas (${responseGranjas.code()})")
                    return@launch
                }
                granjas = responseGranjas.body()?.data.orEmpty().filter { it.activa }

                val responseGalpones = activity.obtenerGalpones()
                if (!responseGalpones.isSuccessful) {
                    mostrarMensaje("No se pudieron cargar los galpones (${responseGalpones.code()})")
                    return@launch
                }
                galpones = responseGalpones.body()?.data.orEmpty().filter { it.activo }

                // El resto del dashboard se puede cargar en paralelo para que
                // Inicio no tenga que esperar módulo por módulo.
                supervisorScope {
                    val lotesDef = async { cargarTodosLotes() }
                    val mortalidadesDef = async { cargarTodasMortalidades() }
                    val eventosDef = async { cargarTodosEventosSanitarios() }
                    val pesajesDef = async { cargarTodosPesajes() }
                    val consumosDef = async { cargarTodosConsumos() }
                    val sensoresDef =
                        if (esPropietario()) async { cargarTodosSensores() } else null

                    lotes = lotesDef.safeAwait(emptyList())
                    mortalidades = mortalidadesDef.safeAwait(emptyList())
                    eventosSanitarios = eventosDef.safeAwait(emptyList())
                    pesajes = pesajesDef.safeAwait(emptyList())
                    consumos = consumosDef.safeAwait(emptyList())
                    sensores = sensoresDef?.safeAwait(emptyList()) ?: emptyList()
                }

                configurarSpinnerGranjas()

                if (granjas.isEmpty()) {
                    granjaSeleccionada = null
                    activity.limpiarGranjaSeleccionada()
                    activity.limpiarGalponSeleccionado()
                    binding.txtCantidadGalpones.text = "0 galpones"
                    binding.containerGalpones.removeAllViews()
                    limpiarDashboard("Sin datos")
                    mostrarMensaje("No hay granjas activas disponibles")
                    return@launch
                }

                val idGuardado = activity.obtenerGranjaSeleccionadaId()
                val seleccionInicial =
                    granjas.firstOrNull { it.id == idGuardado } ?: granjas.first()
                seleccionarGranjaEnInicio(seleccionInicial)

            } catch (e: Exception) {
                mostrarMensaje("Error al cargar inicio: ${e.message ?: "error desconocido"}")
            }
        }
    }

    private suspend fun cargarTodosLotes(): List<LoteResponse> =
        cargarPaginas { page ->
            RetrofitClient.api.listarLotesCompletos(page = page, limit = 100)
        }

    private suspend fun cargarTodasMortalidades(): List<RegistroMortalidadResponse> =
        cargarPaginas { page ->
            RetrofitClient.api.listarRegistrosMortalidad(page = page, limit = 100)
        }

    private suspend fun cargarTodosEventosSanitarios(): List<EventoSanitarioResponse> =
        cargarPaginas { page ->
            RetrofitClient.api.listarEventosSanitarios(page = page, limit = 100)
        }

    private suspend fun cargarTodosPesajes(): List<PesajeResponse> =
        cargarPaginas { page ->
            RetrofitClient.api.listarPesajes(page = page, limit = 100)
        }

    private suspend fun cargarTodosConsumos(): List<ConsumoDiarioResponse> =
        cargarPaginas { page ->
            RetrofitClient.api.listarConsumosDiarios(page = page, limit = 100)
        }

    private suspend fun cargarTodosSensores(): List<SensorResponse> =
        cargarPaginas { page ->
            RetrofitClient.api.listarSensores(page = page, limit = 100)
        }

    private suspend fun <T> cargarPaginas(
        bloque: suspend (Int) -> retrofit2.Response<com.project.avisensandroid.model.PaginatedResponse<T>>
    ): List<T> {
        val resultado = mutableListOf<T>()
        var pagina = 1
        var totalPaginas = 1

        do {
            val response = bloque(pagina)
            if (!response.isSuccessful) {
                throw IllegalStateException("HTTP ${response.code()}")
            }
            val body = response.body()
                ?: throw IllegalStateException("La API no devolvió datos")

            resultado += body.data
            totalPaginas = body.meta.totalPages.coerceAtLeast(pagina)
            pagina++
        } while (pagina <= totalPaginas)

        return resultado
    }

    private suspend fun <T> kotlinx.coroutines.Deferred<T>.safeAwait(default: T): T =
        try {
            await()
        } catch (_: Exception) {
            default
        }

    private fun configurarSpinnerGranjas() {
        val nombres = granjas.map { it.nombre }
        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            nombres
        )
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerGranjas.adapter = adapter

        binding.spinnerGranjas.onItemSelectedListener =
            object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: AdapterView<*>?,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    if (position in granjas.indices) {
                        seleccionarGranjaEnInicio(granjas[position])
                    }
                }

                override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            }
    }

    private fun seleccionarGranjaEnInicio(granja: GranjaResponse) {
        granjaSeleccionada = granja

        val activity = requireActivity() as MainActivity
        activity.seleccionarGranja(granja.id)

        val posicion = granjas.indexOfFirst { it.id == granja.id }
        if (posicion >= 0 && binding.spinnerGranjas.selectedItemPosition != posicion) {
            binding.spinnerGranjas.setSelection(posicion, false)
        }

        // Respeta el galpón guardado previamente si sigue perteneciendo
        // a esta granja; si no (o es la primera vez), cae en el primero.
        val idGalponGuardado = activity.obtenerGalponSeleccionadoId()
        val galponesDeGranja = mostrarGalponesDeGranja(granja.id, idGalponGuardado)
        galponSeleccionadoId = galponesDeGranja
            .firstOrNull { it.id == idGalponGuardado }?.id
            ?: galponesDeGranja.firstOrNull()?.id

        if (galponSeleccionadoId == null) {
            activity.limpiarGalponSeleccionado()
            limpiarDashboard("Sin galpones activos")
            return
        }

        activity.seleccionarGalpon(galponSeleccionadoId!!)
        marcarGalponSeleccionado(galponSeleccionadoId!!)
        cargarDashboardDelGalpon(galponSeleccionadoId!!)
    }

    private fun mostrarGalponesDeGranja(granjaId: Int, idGalponGuardado: Int?): List<GalponResponse> {
        val galponesDeGranja = galpones.filter { it.granja.id == granjaId }

        binding.txtCantidadGalpones.text = when (galponesDeGranja.size) {
            1 -> "1 galpón"
            else -> "${galponesDeGranja.size} galpones"
        }

        binding.containerGalpones.removeAllViews()

        if (galponesDeGranja.isEmpty()) {
            binding.containerGalpones.addView(
                TextView(requireContext()).apply {
                    text = "No hay galpones activos"
                    textSize = 12f
                    setTextColor(Color.WHITE)
                    gravity = Gravity.CENTER_VERTICAL
                },
                LinearLayout.LayoutParams(dp(170), dp(42))
            )
            return emptyList()
        }

        val indiceInicial = galponesDeGranja.indexOfFirst { it.id == idGalponGuardado }
            .takeIf { it >= 0 } ?: 0

        galponesDeGranja.forEachIndexed { index, galpon ->
            if (index > 0) {
                binding.containerGalpones.addView(
                    View(requireContext()),
                    LinearLayout.LayoutParams(dp(8), dp(1))
                )
            }
            binding.containerGalpones.addView(
                crearChipGalpon(galpon, index == indiceInicial)
            )
        }

        return galponesDeGranja
    }

    private fun crearChipGalpon(galpon: GalponResponse, seleccionadoInicial: Boolean): View {
        val chip = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                dp(42)
            )
            setPadding(dp(14), 0, dp(16), 0)
            isClickable = true
            isFocusable = true
            tag = galpon.id
        }

        val punto = View(requireContext()).apply {
            layoutParams = LinearLayout.LayoutParams(dp(8), dp(8))
            setBackgroundResource(R.drawable.dot_galpon_selected)
            visibility = if (seleccionadoInicial) View.VISIBLE else View.GONE
            tag = "dot"
        }

        val texto = TextView(requireContext()).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { marginStart = dp(8) }
            text = galpon.nombre
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
        }

        chip.addView(punto)
        chip.addView(texto)
        aplicarFondoChip(chip, seleccionadoInicial)

        chip.setOnClickListener {
            galponSeleccionadoId = galpon.id
            (requireActivity() as MainActivity).seleccionarGalpon(galpon.id)
            marcarGalponSeleccionado(galpon.id)
            cargarDashboardDelGalpon(galpon.id)
        }

        return chip
    }

    private fun marcarGalponSeleccionado(galponId: Int) {
        for (i in 0 until binding.containerGalpones.childCount) {
            val child = binding.containerGalpones.getChildAt(i)
            if (child is LinearLayout && child.tag is Int) {
                val seleccionado = child.tag == galponId
                aplicarFondoChip(child, seleccionado)
                if (child.childCount > 0) {
                    child.getChildAt(0).visibility =
                        if (seleccionado) View.VISIBLE else View.GONE
                }
            }
        }
    }

    private fun aplicarFondoChip(chip: LinearLayout, seleccionado: Boolean) {
        chip.setBackgroundResource(
            if (seleccionado) {
                R.drawable.bg_galpon_selected
            } else {
                R.drawable.bg_galpon_unselected
            }
        )
    }

    private fun cargarDashboardDelGalpon(galponId: Int) {
        val solicitudId = ++cargaDashboardId
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val galpon = galpones.firstOrNull { it.id == galponId }
                if (galpon == null || solicitudId != cargaDashboardId) return@launch

                binding.txtSubtituloSensoresInicio.text =
                    "${galpon.nombre} · ${galpon.codigo}"

                val lotesDelGalpon = lotes
                    .filter { it.galpon.id == galponId && it.estado.equals("activo", true) }
                    .sortedByDescending { parseDate(it.fecha_ingreso)?.time ?: 0L }
                val loteActivo = lotesDelGalpon.firstOrNull()

                supervisorScope {
                    val alertasDef = async { cargarAlertasGalpon(galponId) }
                    val indicadorDef = async {
                        loteActivo?.let { cargarUltimoIndicador(it.id) }
                    }
                    val comparacionDef = async {
                        loteActivo?.let { cargarComparacion(it.id) }
                    }
                    val medicionesDef =
                        if (esPropietario()) async { cargarUltimasMediciones(galponId) } else null

                    val alertas = alertasDef.safeAwait(emptyList())
                    val indicador = indicadorDef.safeAwait(null)
                    val comparacion = comparacionDef.safeAwait(null)
                    val mediciones = medicionesDef?.safeAwait(emptyList()) ?: emptyList()

                    if (solicitudId == cargaDashboardId) {
                        actualizarDashboard(
                            lote = loteActivo,
                            mortalidadesLote = mortalidades.filter {
                                loteActivo != null && it.lote_id == loteActivo.id
                            },
                            eventosLote = eventosSanitarios.filter {
                                loteActivo != null && it.lote_id == loteActivo.id
                            },
                            pesajesLote = pesajes.filter {
                                loteActivo != null && it.lote_id == loteActivo.id
                            },
                            consumosLote = consumos.filter {
                                loteActivo != null && it.lote_id == loteActivo.id
                            },
                            alertas = alertas,
                            indicador = indicador,
                            comparacion = comparacion,
                            mediciones = mediciones
                        )
                    }
                }
            } catch (e: Exception) {
                if (solicitudId == cargaDashboardId) {
                    mostrarMensaje("No se pudo actualizar el dashboard: ${e.message ?: "error desconocido"}")
                }
            }
        }
    }

    private suspend fun cargarAlertasGalpon(galponId: Int): List<AlertaResponse> {
        return cargarPaginas { page ->
            RetrofitClient.api.listarAlertasDeGalpon(
                galponId = galponId,
                page = page,
                limit = 100
            )
        }
    }

    private suspend fun cargarUltimoIndicador(loteId: Int): IndicadorLoteResponse? {
        val response = RetrofitClient.api.listarIndicadoresLote(loteId)
        if (!response.isSuccessful) return null
        return response.body()
            ?.maxByOrNull { parseDate(it.fecha)?.time ?: 0L }
    }

    private suspend fun cargarComparacion(loteId: Int): com.project.avisensandroid.model.ComparacionIndicadorResponse? {
        val response = RetrofitClient.api.compararIndicadorLote(loteId)
        if (!response.isSuccessful) return null
        return response.body()
    }

    private suspend fun cargarUltimasMediciones(galponId: Int): List<MedicionConSensor> =
        coroutineScope {
            sensores
                .filter {
                    it.galpon.id == galponId &&
                            it.estado.equals("activo", true)
                }
                .map { sensor ->
                    async {
                        val response = RetrofitClient.api.listarMediciones(
                            sensorId = sensor.id,
                            page = 1,
                            limit = 1
                        )
                        if (!response.isSuccessful) return@async null
                        val medicion = response.body()?.data?.firstOrNull()
                            ?: return@async null
                        MedicionConSensor(sensor, medicion)
                    }
                }
                .awaitAll()
                .filterNotNull()
        }

    private fun actualizarDashboard(
        lote: LoteResponse?,
        mortalidadesLote: List<RegistroMortalidadResponse>,
        eventosLote: List<EventoSanitarioResponse>,
        pesajesLote: List<PesajeResponse>,
        consumosLote: List<ConsumoDiarioResponse>,
        alertas: List<AlertaResponse>,
        indicador: IndicadorLoteResponse?,
        comparacion: com.project.avisensandroid.model.ComparacionIndicadorResponse?,
        mediciones: List<MedicionConSensor>
    ) {
        val muertes = mortalidadesLote.sumOf { it.cantidad_aves }
        val avesVivas = lote?.let { (it.cantidad_inicial - muertes).coerceAtLeast(0) }

        binding.txtAves.text = avesVivas?.toString() ?: "—"
        binding.txtAvesMuertas.text = muertes.toString()
        binding.txtAlertas.text = alertas.count { it.estado.esActiva() }.toString()

        val diaVida = indicador?.dia_vida ?: lote?.let { calcularDiaVida(it.fecha_ingreso) }
        binding.txtDiaLote.text = diaVida?.toString() ?: "—"

        binding.txtCalidadCrianza.text = indicador?.epef?.let { formatearNumero(it, 0) } ?: "—"
        binding.txtRendComida.text = indicador?.fcr?.let { formatearNumero(it, 2) } ?: "—"

        val ultimoConsumo = consumosLote.maxByOrNull { parseDate(it.fecha)?.time ?: 0L }
        binding.txtAlimento.text = ultimoConsumo?.alimento_kg?.let {
            "${formatearNumero(it, 1)} Kg"
        } ?: "—"
        binding.txtAgua.text = ultimoConsumo?.agua_litros?.let {
            "${formatearNumero(it, 1)} L"
        } ?: "—"

        actualizarSalud(
            alertas = alertas,
            eventosSanitarios = eventosLote,
            mortalidadPct = indicador?.mortalidad_acumulada_pct,
            epef = indicador?.epef
        )

        if (esPropietario()) {
            actualizarSensores(mediciones)
        }
    }

    private fun actualizarSalud(
        alertas: List<AlertaResponse>,
        eventosSanitarios: List<EventoSanitarioResponse>,
        mortalidadPct: Double?,
        epef: Double?
    ) {
        val alertasActivas = alertas.filter { it.estado.esActiva() }
        val alertaCritica = alertasActivas.any {
            it.criticidad.equals("alta", true) ||
                    it.criticidad.equals("critica", true)
        }
        val tieneEventoReciente = eventosSanitarios.any { evento ->
            val fecha = parseDate(evento.fecha) ?: return@any false
            System.currentTimeMillis() - fecha.time <= 7L * 24L * 60L * 60L * 1000L
        }

        val (texto, drawable, colorTexto, progreso) = when {
            loteSinDatos(mortalidadPct, epef, alertas, eventosSanitarios) ->
                HealthState("Sin datos", R.drawable.bg_badge_regular, R.color.orange_badge_text, 0)
            alertaCritica ->
                HealthState("Crítico", R.drawable.bg_badge_red, R.color.badge_red_text, 25)
            alertasActivas.isNotEmpty() ->
                HealthState("Atención", R.drawable.bg_badge_orange, R.color.orange_badge_text, 50)
            tieneEventoReciente ->
                HealthState("Seguimiento", R.drawable.bg_badge_orange, R.color.orange_badge_text, 72)
            else ->
                HealthState("Estable", R.drawable.bg_badge_green, R.color.badge_green_text, 100)
        }

        binding.txtEstadoSalud.text = texto
        binding.txtEstadoSalud.setBackgroundResource(drawable)
        binding.txtEstadoSalud.setTextColor(resources.getColor(colorTexto, null))

        binding.progressSaludFill.layoutParams =
            (binding.progressSaludFill.layoutParams as LinearLayout.LayoutParams).apply {
                weight = progreso.toFloat()
            }
        binding.progressSaludRest.layoutParams =
            (binding.progressSaludRest.layoutParams as LinearLayout.LayoutParams).apply {
                weight = (100 - progreso).toFloat()
            }
        binding.progressSaludFill.requestLayout()
        binding.progressSaludRest.requestLayout()

        val eventosAves = eventosSanitarios.sumOf { it.cantidad_aves ?: 0 }
        val detalle = buildString {
            append("Eventos sanitarios: $eventosAves aves")
            append(" · Alertas activas: ${alertasActivas.size}")
        }
        binding.txtSaludDetalle.text = detalle
        binding.txtSaludScore.text = epef?.let { "EPEF ${formatearNumero(it, 0)}" } ?: "—"
    }

    private fun loteSinDatos(
        mortalidadPct: Double?,
        epef: Double?,
        alertas: List<AlertaResponse>,
        eventos: List<EventoSanitarioResponse>
    ): Boolean = mortalidadPct == null && epef == null && alertas.isEmpty() && eventos.isEmpty()

    private fun actualizarSensores(mediciones: List<MedicionConSensor>) {
        val sensoresActivos = sensores.count {
            it.galpon.id == galponSeleccionadoId && it.estado.equals("activo", true)
        }
        binding.txtSensoresActivos.text = "$sensoresActivos sensores"

        val temperatura = mediciones
            .filter { esTipo(it.sensor.tipo, "temperatura") }
            .maxByOrNull { parseDate(it.medicion.fecha_hora)?.time ?: 0L }
        val humedad = mediciones
            .filter { esTipo(it.sensor.tipo, "humedad") }
            .maxByOrNull { parseDate(it.medicion.fecha_hora)?.time ?: 0L }

        if (temperatura != null) {
            val valor = temperatura.medicion.valor
            binding.arcTemperaturaInicio.setTemperature(valor.toFloat())
            binding.txtTemperaturaInicio.text = "${formatearNumero(valor, 1)}°"
            actualizarEstadoSensor(
                binding.txtEstadoTemperaturaInicio,
                temperatura.medicion.calidad,
                "Normal"
            )
        } else {
            binding.txtTemperaturaInicio.text = "—"
            binding.txtEstadoTemperaturaInicio.text = "Sin datos"
        }

        if (humedad != null) {
            binding.txtHumedadInicio.text = "${formatearNumero(humedad.medicion.valor, 1)}%"
            actualizarEstadoSensor(
                binding.txtEstadoHumedadInicio,
                humedad.medicion.calidad,
                "Normal"
            )
        } else {
            binding.txtHumedadInicio.text = "—"
            binding.txtEstadoHumedadInicio.text = "Sin datos"
        }
    }

    private fun actualizarEstadoSensor(view: TextView, calidad: String?, normal: String) {
        if (calidad.equals("error", true)) {
            view.text = "Error"
            view.setBackgroundResource(R.drawable.bg_badge_red)
            view.setTextColor(resources.getColor(R.color.badge_red_text, null))
        } else if (calidad.equals("sospechosa", true)) {
            view.text = "Atención"
            view.setBackgroundResource(R.drawable.bg_badge_orange)
            view.setTextColor(resources.getColor(R.color.orange_badge_text, null))
        } else {
            view.text = normal
            view.setBackgroundResource(R.drawable.bg_badge_green)
            view.setTextColor(resources.getColor(R.color.badge_green_text, null))
        }
    }

    private fun limpiarDashboard(mensaje: String) {
        binding.txtAves.text = "—"
        binding.txtDiaLote.text = "—"
        binding.txtAvesMuertas.text = "—"
        binding.txtAlertas.text = "—"
        binding.txtCalidadCrianza.text = "—"
        binding.txtRendComida.text = "—"
        binding.txtAlimento.text = "—"
        binding.txtAgua.text = "—"
        binding.txtEstadoSalud.text = mensaje
        binding.txtSaludDetalle.text = "Selecciona un galpón con datos"
        binding.txtSaludScore.text = "—"
        binding.progressSaludFill.layoutParams =
            (binding.progressSaludFill.layoutParams as LinearLayout.LayoutParams).apply { weight = 0f }
        binding.progressSaludRest.layoutParams =
            (binding.progressSaludRest.layoutParams as LinearLayout.LayoutParams).apply { weight = 100f }
        binding.txtSensoresActivos.text = "0 sensores"
        binding.txtTemperaturaInicio.text = "—"
        binding.txtHumedadInicio.text = "—"
        binding.txtEstadoTemperaturaInicio.text = "Sin datos"
        binding.txtEstadoHumedadInicio.text = "Sin datos"
    }

    private fun esPropietario(): Boolean =
        com.project.avisensandroid.model.UserSession.role(requireContext()) == UserRole.PROPIETARIO

    private fun esTipo(actual: String, buscado: String): Boolean =
        actual.trim().lowercase(Locale.getDefault()).contains(buscado)

    private fun formatearNumero(valor: Double, decimales: Int): String =
        String.format(Locale.getDefault(), "%.${decimales}f", valor)

    private fun calcularDiaVida(fechaIngreso: String): Int? {
        val fecha = parseDate(fechaIngreso) ?: return null
        val diferencia = System.currentTimeMillis() - fecha.time
        return ((diferencia / (24L * 60L * 60L * 1000L)) + 1L)
            .toInt()
            .coerceAtLeast(1)
    }

    private fun parseDate(value: String?): Date? {
        if (value.isNullOrBlank()) return null
        val formatos = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSSX",
            "yyyy-MM-dd'T'HH:mm:ssX",
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd"
        )
        for (patron in formatos) {
            try {
                val formatter = SimpleDateFormat(patron, Locale.US).apply {
                    isLenient = false
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                return formatter.parse(value)
            } catch (_: Exception) {
                // Probar el siguiente formato.
            }
        }
        return null
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    private fun mostrarMensaje(mensaje: String) {
        if (isAdded) {
            Toast.makeText(requireContext(), mensaje, Toast.LENGTH_LONG).show()
        }
    }

    private fun String?.esActiva(): Boolean =
        this.equals("abierta", true) || this.equals("en_proceso", true)

    private data class MedicionConSensor(
        val sensor: SensorResponse,
        val medicion: MedicionResponse
    )

    private data class HealthState(
        val texto: String,
        val drawable: Int,
        val colorTexto: Int,
        val progreso: Int
    )

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
