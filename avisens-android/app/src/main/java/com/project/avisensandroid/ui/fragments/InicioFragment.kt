package com.project.avisensandroid.ui.fragments

import com.project.avisensandroid.model.UmbralAmbientalResponse
import android.animation.ValueAnimator
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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.Po01InicioOpBinding
import com.project.avisensandroid.model.Actuadores
import com.project.avisensandroid.model.AlertaResponse
import com.project.avisensandroid.model.ClasificadorSensores
import com.project.avisensandroid.model.ConsumoDiarioResponse
import com.project.avisensandroid.model.GranjaResponse
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.IndicadorLoteResponse
import com.project.avisensandroid.model.LoteResponse
import com.project.avisensandroid.model.LecturaDeSensor
import com.project.avisensandroid.model.LecturasGalpon
import com.project.avisensandroid.model.LecturasSensores
import com.project.avisensandroid.model.PesajeResponse
import com.project.avisensandroid.model.RegistroMortalidadResponse
import com.project.avisensandroid.model.EventoSanitarioResponse
import com.project.avisensandroid.model.SensorResponse
import com.project.avisensandroid.model.UserRole
import com.project.avisensandroid.model.VariableSensor
import com.project.avisensandroid.model.VigenciaLectura
import com.project.avisensandroid.ui.MainActivity
import com.project.avisensandroid.ui.views.ListaActuadores
import com.project.avisensandroid.ui.views.SensorArcView
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class InicioFragment : BaseBottomNavFragment() {

    private var _binding: Po01InicioOpBinding? = null
    private val binding get() = _binding!!

    private var granjas: List<GranjaResponse> = emptyList()
    private var galpones: List<GalponResponse> = emptyList()
    private var umbralesInicio: List<com.project.avisensandroid.model.UmbralAmbientalResponse> = emptyList()
    private var lotes: List<LoteResponse> = emptyList()
    private var mortalidades: List<RegistroMortalidadResponse> = emptyList()
    private var eventosSanitarios: List<EventoSanitarioResponse> = emptyList()
    private var pesajes: List<PesajeResponse> = emptyList()
    private var consumos: List<ConsumoDiarioResponse> = emptyList()
    private var sensores: List<SensorResponse> = emptyList()

    // Distingue "el galpón no tiene sensores" de "no se pudo consultar /v1/sensores".
    private var errorCargaSensores = false

    private var granjaSeleccionada: GranjaResponse? = null
    private var galponSeleccionadoId: Int? = null

    private val detalleSensor = DetalleSensorModal()
    private var dialogoUmbral: android.app.Dialog? = null
    private var cargaDashboardId: Int = 0
    private var cargaInicialJob: kotlinx.coroutines.Job? = null
    private var cargaDashboardJob: kotlinx.coroutines.Job? = null
    private val valoresYaAnimados = mutableSetOf<TextView>()

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
        if (esPropietario()) {
            conectarDetalleInicio(binding.arcTemperaturaInicio, binding.txtTemperaturaInicio, binding.txtEstadoTemperaturaInicio, "Temperatura", "temperatura", "°C")
            conectarDetalleInicio(binding.arcHumedadInicio, binding.txtHumedadInicio, binding.txtEstadoHumedadInicio, "Humedad", "humedad", "%")
            conectarDetalleInicio(binding.arcLuminosidadInicio, binding.txtLuminosidadInicio, binding.txtEstadoLuminosidadInicio, "Luminosidad", "luminosidad", "lux")
            conectarDetalleInicio(binding.arcCalidadAireInicio, binding.txtCalidadAireInicio, binding.txtEstadoCalidadAireInicio, "Calidad del aire", null, "")
            conectarDetalleInicio(binding.arcPesoInicio, binding.txtPesoInicio, binding.txtEstadoPesoInicio, "Peso", null, "")
            conectarDetalleInicio(binding.arcNivelAguaInicio, binding.txtNivelAguaInicio, binding.txtEstadoNivelAguaInicio, "Nivel de agua", null, "")
        }

        // Inicio es compartido entre Propietario y Operario, pero la sección
        // de sensores solo pertenece al Propietario porque el Operario ya
        // tiene su apartado propio de Sensores.
        binding.operatorStatsContainer.visibility = View.VISIBLE
        binding.sectionSensoresInicio.visibility =
            if (esPropietario()) View.VISIBLE else View.GONE
        if (esPropietario()) {
            // Mostrar la sección de actuadores para todos los propietarios,
            // incluso antes de recibir datos del galpón seleccionado.
            binding.txtSinActuadoresInicio.text = "Cargando actuadores del galpón..."
            binding.txtSinActuadoresInicio.visibility = View.VISIBLE
        }

        activity.actualizarAvatarInicio(binding.btnPerfil)
        binding.btnPerfil.setOnClickListener {
            activity.mostrarConfiguracion()
        }

        binding.btnAbrirLia.setOnClickListener {
            activity.mostrarAsistenteVoz()
        }

        // La Guía de peso no está disponible para el rol Operario.
        binding.btnGuiaPeso.visibility =
            if (activity.obtenerRolActual() == UserRole.OPERARIO) {
                View.GONE
            } else {
                View.VISIBLE
            }

        binding.btnGuiaPeso.setOnClickListener {
            if (activity.obtenerRolActual() != UserRole.OPERARIO) {
                activity.mostrarGuiaPeso()
            }
        }

        entradaAnimada = false
        if (esPropietario()) binding.filaNivelAguaInicio.visibility = View.VISIBLE
        tarjetasIniciadas.clear()
        valoresYaAnimados.clear()
        valoresPendientes.clear()
        datosInicialesRecibidos = false
        valoresEntrada().forEach { it.text = "—" }
        animarEntradaInicio()
        cargarDatosIniciales()
        if (esPropietario()) iniciarActualizacionPeriodicaDeSensores()
    }

    private var entradaAnimada = false
    private var datosInicialesRecibidos = false
    private val tarjetasIniciadas = mutableSetOf<View>()
    private val valoresPendientes = mutableMapOf<TextView, String>()

    private fun tarjetaIniciada(vista: View): Boolean =
        tarjetasIniciadas.any { perteneceATarjeta(vista, it) }

    private fun valoresEntrada(): List<TextView> = listOf(
        binding.txtTemperaturaInicio, binding.txtHumedadInicio,
        binding.txtCalidadAireInicio, binding.txtLuminosidadInicio,
        binding.txtPesoInicio, binding.txtNivelAguaInicio,
        binding.txtAves, binding.txtDiaLote, binding.txtAvesMuertas,
        binding.txtAlertas, binding.txtCalidadCrianza, binding.txtRendComida,
        binding.txtAlimento, binding.txtAgua
    )

    private fun mostrarValoresIniciales() {
        valoresEntrada().forEach { vista ->
            val texto = vista.text.toString()
            if (texto == "—" || vista in valoresYaAnimados || vista in valoresPendientes) return@forEach
            if (tarjetaIniciada(vista) || tarjetasEntradaInicio().none { perteneceATarjeta(vista, it) }) animarValor(vista, texto)
            else valoresPendientes[vista] = texto
        }
    }
    private val arcosPendientes = mutableMapOf<SensorArcView, Float>()
    private val valoresAnimados = mutableMapOf<TextView, Pair<ValueAnimator, String>>()
    private var trabajoEntrada: kotlinx.coroutines.Job? = null

    private fun progresoSensorInicio(arco: SensorArcView, fraccion: Float) {
        if (!tarjetaIniciada(arco) && trabajoEntrada?.isActive == true) arcosPendientes[arco] = fraccion
        else arco.setProgressFraction(fraccion)
    }

    private fun finalizarValor(vista: TextView) {
        val pendiente = valoresAnimados.remove(vista) ?: return
        pendiente.first.cancel()
        vista.text = pendiente.second
    }

    private fun finalizarValores() {
        valoresAnimados.keys.toList().forEach { finalizarValor(it) }
    }

    private fun animarValor(vista: TextView, texto: String) {
        val partes = Regex("^(-?\\d+(?:[.,]\\d+)?)(.*)$").matchEntire(texto) ?: return
        val numero = partes.groupValues[1]
        val destino = numero.replace(',', '.').toDoubleOrNull() ?: return
        if (!destino.isFinite()) return
        valoresYaAnimados.add(vista)
        val decimales = numero.indexOfFirst { it == '.' || it == ',' }.let { if (it < 0) 0 else numero.length - it - 1 }
        val sufijo = partes.groupValues[2]
        val formato = java.text.DecimalFormat().apply {
            isGroupingUsed = false
            minimumFractionDigits = decimales
            maximumFractionDigits = decimales
        }
        var ultimoTexto = ""
        val animador = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1300L
            interpolator = android.view.animation.DecelerateInterpolator()
            addUpdateListener { a ->
                val avance = a.animatedValue as Float
                val nuevo = if (avance >= 1f) texto else formato.format(destino * avance) + sufijo
                if (nuevo != ultimoTexto) {
                    ultimoTexto = nuevo
                    vista.text = nuevo
                }
            }
        }
        valoresAnimados[vista] = animador to texto
        animador.addListener(object : android.animation.AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: android.animation.Animator) {
                if (valoresAnimados[vista]?.first === animador) valoresAnimados.remove(vista)
            }
        })
        animador.start()
    }

    private fun perteneceATarjeta(vista: View, tarjeta: View): Boolean {
        var actual: View? = vista
        while (actual != null) {
            if (actual === tarjeta) return true
            actual = actual.parent as? View
        }
        return false
    }

    private fun animarTarjetas(tarjetas: List<View>) {
        val distancia = 60f * resources.displayMetrics.density
        tarjetas.forEach { tarjeta ->
            tarjeta.animate().cancel()
            tarjeta.alpha = 0f
            tarjeta.translationY = distancia
        }
        trabajoEntrada = viewLifecycleOwner.lifecycleScope.launch {
            tarjetas.forEachIndexed { indice, tarjeta ->
                if (indice > 0) delay(320L)
                if (_binding == null) return@launch
                tarjetasIniciadas.add(tarjeta)
                tarjeta.animate().alpha(1f).translationY(0f)
                    .setStartDelay(0L).setDuration(1000L)
                    .setInterpolator(android.view.animation.DecelerateInterpolator()).start()
                valoresPendientes.keys.filter { perteneceATarjeta(it, tarjeta) }.forEach { vista ->
                    valoresPendientes.remove(vista)?.let { texto ->
                        if (vista.text.toString() == texto) animarValor(vista, texto)
                    }
                }
                arcosPendientes.keys.filter { perteneceATarjeta(it, tarjeta) }.forEach { arco ->
                    arcosPendientes.remove(arco)?.let { arco.setProgressFraction(it) }
                }
            }
        }
    }

    private fun tarjetasEntradaInicio(): List<View> {
        val tarjetas = mutableListOf<View>()
        fun recorrer(v: View) {
            if (v.visibility != View.VISIBLE) return
            if (v is android.view.ViewGroup) {
                for (i in 0 until v.childCount) {
                    val hijo = v.getChildAt(i)
                    if (hijo.visibility != View.VISIBLE) continue
                    if (hijo === binding.contenedorActuadoresInicio) {
                        for (j in 0 until hijo.childCount) {
                            val tarjeta = hijo.getChildAt(j)
                            if (tarjeta.visibility == View.VISIBLE) tarjetas.add(tarjeta)
                        }
                        continue
                    }
                    val lp = hijo.layoutParams as? LinearLayout.LayoutParams
                    if (hijo is LinearLayout && (lp?.weight ?: 0f) > 0f && hijo.background != null) {
                        tarjetas.add(hijo)
                    } else if (hijo is LinearLayout && hijo.background != null && hijo.id != binding.contenedorActuadoresInicio.id) {
                        tarjetas.add(hijo)
                    } else if (hijo is TextView) {
                        tarjetas.add(hijo)
                    } else recorrer(hijo)
                }
            }
        }
        recorrer(binding.sectionSensoresInicio)
        recorrer(binding.operatorStatsContainer)
        return tarjetas
    }

    private fun terminarEntradaPendiente() {
        trabajoEntrada?.cancel()
        trabajoEntrada = null
        finalizarValores()
        valoresPendientes.clear()
        arcosPendientes.forEach { (arco, fraccion) -> arco.setProgressFraction(fraccion) }
        arcosPendientes.clear()
        tarjetasEntradaInicio().forEach {
            tarjetasIniciadas.add(it)
            it.animate().cancel()
            it.alpha = 1f
            it.translationY = 0f
        }
    }

    private fun animarEntradaInicio() {
        if (_binding == null || entradaAnimada) return
        entradaAnimada = true
        animarTarjetas(tarjetasEntradaInicio())
    }

    /** Refresca las lecturas del galpón seleccionado mientras Inicio está visible. */
    private fun iniciarActualizacionPeriodicaDeSensores() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (isActive) {
                    delay(15_000L)
                    val galponId = galponSeleccionadoId
                    if (galponId == null || !datosInicialesRecibidos || cargaDashboardJob?.isActive == true) continue
                    try {
                        val lecturas = cargarUltimasMediciones(galponId)
                        if (_binding != null && galponSeleccionadoId == galponId) {
                            val alertasGalpon = cargarAlertasGalpon(galponId)
                            val rangos = cargarUmbralesInicio(galponId)
                            if (_binding == null || galponSeleccionadoId != galponId) continue
                            umbralesInicio = rangos
                            actualizarSensores(lecturas, alertasGalpon)
                        }
                    } catch (cancelacion: CancellationException) {
                        throw cancelacion
                    } catch (_: Exception) {
                        // La siguiente vuelta vuelve a intentar sin interrumpir Inicio.
                    }
                }
            }
        }
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

    fun actualizarAlRecuperarInternet() {
        if (_binding != null && isAdded) cargarDatosIniciales()
    }

    fun actualizarSilenciosamente() {
        if (_binding != null && isAdded) {
            galponSeleccionadoId?.let { cargarDashboardDelGalpon(it) }
        }
    }

    private fun cargarDatosIniciales() {
        cargaInicialJob?.cancel()
        cargaInicialJob = viewLifecycleOwner.lifecycleScope.launch {
            try {
                val activity = requireActivity() as MainActivity
                for (soloCache in listOf(true, false)) {
                    try {
                // Primero consultar la estructura y los sensores, sin competir con historiales.
                supervisorScope {
                    val granjasDef = async { activity.obtenerGranjas(soloCache) }
                    val galponesDef = async { activity.obtenerGalpones(soloCache) }
                    val sensoresDef = async { if (esPropietario()) cargarTodosSensores(soloCache) else emptyList() }
                    val rg = granjasDef.await()
                    val rp = galponesDef.await()
                    if (!rg.isSuccessful || !rp.isSuccessful) error("No se pudo consultar la estructura")
                    granjas = rg.body()?.data.orEmpty().filter { it.activa }
                    galpones = rp.body()?.data.orEmpty().filter { it.activo }
                    errorCargaSensores = false
                    sensores = try { sensoresDef.await() } catch (e: CancellationException) { throw e }
                    catch (_: Exception) { errorCargaSensores = true; emptyList() }
                }
                configurarSpinnerGranjas()
                if (granjas.isEmpty()) {
                    if (soloCache) continue
                    granjaSeleccionada = null
                    activity.limpiarGranjaSeleccionada()
                    activity.limpiarGalponSeleccionado()
                    binding.txtCantidadGalpones.text = "0 galpones"
                    binding.containerGalpones.removeAllViews()
                    limpiarDashboard("Sin datos")
                    return@launch
                }
                val inicial = granjas.firstOrNull { it.id == activity.obtenerGranjaSeleccionadaId() } ?: granjas.first()
                seleccionarGranjaEnInicio(inicial)
                    } catch (e: CancellationException) { throw e }
                    catch (e: Exception) { if (!soloCache && granjas.isEmpty()) throw e }
                }

            } catch (e: CancellationException) { throw e }
            catch (_: Exception) {
                mostrarMensaje("No se pudieron cargar los datos de Inicio.")
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

    private suspend fun cargarTodosSensores(soloCache: Boolean = false): List<SensorResponse> =
        cargarPaginas { page ->
            (if (soloCache) RetrofitClient.apiCache else RetrofitClient.api).listarSensores(page = page, limit = 100)
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
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            default
        }

    private fun configurarSpinnerGranjas() {
        val nombres = granjas.map { it.nombre }
        val adapter = object : ArrayAdapter<String>(
            requireContext(),
            android.R.layout.simple_spinner_item,
            nombres
        ) {
            override fun getView(
                position: Int,
                convertView: View?,
                parent: android.view.ViewGroup
            ): View {
                val vista = super.getView(position, convertView, parent)
                // Siempre blanco, incluso si solo hay una granja.
                (vista as? TextView)?.setTextColor(Color.WHITE)
                return vista
            }
        }
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        // La flecha solo se ve con dos o más granjas.
        binding.ivFlechaGranjas.visibility =
            if (granjas.size >= 2) View.VISIBLE else View.GONE
        // No deshabilitar: Android atenúa el texto de los Spinner deshabilitados.
        binding.spinnerGranjas.isEnabled = true
        binding.spinnerGranjas.adapter = adapter
        binding.spinnerGranjas.onItemSelectedListener =
            object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: AdapterView<*>?, view: View?, position: Int, id: Long
                ) {
                    if (position in granjas.indices && granjaSeleccionada?.id != granjas[position].id) {
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
            animarEntradaInicio()
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
                    textSize = 13f
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
            textSize = 14f
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
        cargaDashboardJob?.cancel()
        val solicitudId = ++cargaDashboardId
        cargaDashboardJob = viewLifecycleOwner.lifecycleScope.launch {
            try {
                if (galpones.none { it.id == galponId }) return@launch
                supervisorScope {
                    // La medición se pinta antes de iniciar los historiales.
                    if (esPropietario()) {
                        umbralesInicio = emptyList()
                        val cache = cargarUltimasMediciones(galponId, true)
                        if (cache.sensores.any { it.lectura?.valor != null }) {
                            actualizarSensores(cache, emptyList())
                            mostrarValoresIniciales()
                        }
                    }
                    val medicionesDef = async { if (esPropietario()) cargarUltimasMediciones(galponId) else LecturasGalpon.VACIAS }
                    val lotesDef = async { cargarTodosLotes() }
                    val mediciones = medicionesDef.await()
                    if (solicitudId != cargaDashboardId || _binding == null) return@supervisorScope
                    if (esPropietario()) {
                        actualizarSensores(mediciones, emptyList())
                        mostrarValoresIniciales()
                    }
                    lotes = lotesDef.safeAwait(lotes)
                    val loteActivo = lotes.filter { it.galpon.id == galponId && it.estado.equals("activo", true) }
                        .maxByOrNull { parseDate(it.fecha_ingreso)?.time ?: 0L }
                    val alertasDef = async { cargarAlertasGalpon(galponId) }
                    val umbralesDef = async { if (esPropietario()) cargarUmbralesInicio(galponId) else emptyList() }
                    val indicadorDef = async { loteActivo?.let { cargarUltimoIndicador(it.id) } }
                    val comparacionDef = async { loteActivo?.let { cargarComparacion(it.id) } }
                    val mortalidadesDef = async { cargarTodasMortalidades() }
                    val eventosDef = async { cargarTodosEventosSanitarios() }
                    val pesajesDef = async { cargarTodosPesajes() }
                    val consumosDef = async { cargarTodosConsumos() }
                    val rangos = umbralesDef.safeAwait(emptyList())
                    val alertas = alertasDef.safeAwait(emptyList())
                    if (solicitudId != cargaDashboardId || _binding == null) return@supervisorScope
                    umbralesInicio = rangos
                    if (esPropietario()) actualizarSensores(mediciones, alertas)
                    mortalidades = mortalidadesDef.safeAwait(mortalidades)
                    eventosSanitarios = eventosDef.safeAwait(eventosSanitarios)
                    pesajes = pesajesDef.safeAwait(pesajes)
                    consumos = consumosDef.safeAwait(consumos)
                    val indicador = indicadorDef.safeAwait(null)
                    val comparacion = comparacionDef.safeAwait(null)
                    if (solicitudId != cargaDashboardId || _binding == null) return@supervisorScope
                    actualizarDashboard(loteActivo,
                        mortalidades.filter { it.lote_id == loteActivo?.id },
                        eventosSanitarios.filter { it.lote_id == loteActivo?.id },
                        pesajes.filter { it.lote_id == loteActivo?.id },
                        consumos.filter { it.lote_id == loteActivo?.id },
                        alertas, indicador, comparacion, mediciones)
                }
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) {
                if (solicitudId == cargaDashboardId && _binding != null) mostrarMensaje("No se pudo actualizar Inicio")
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

    /**
     * Sensores físicos activos del galpón. Los relés K1-K4 y los motores
     * también vienen en /v1/sensores (unidad "estado"), pero son actuadores.
     */
    private fun sensoresFisicosDelGalpon(galponId: Int?): List<SensorResponse> =
        sensores.filter {
            it.galpon.id == galponId &&
                    it.estado.equals("activo", true) &&
                    ClasificadorSensores.variableDe(it) != null
        }

    /** Relés y motores activos del galpón: se muestran aparte, nunca como sensores. */
    private fun actuadoresDelGalpon(galponId: Int?): List<SensorResponse> =
        Actuadores.activos(sensores.filter { it.galpon.id == galponId })

    /**
     * Última medición de cada sensor físico y actuador del galpón, en una
     * sola petición (GET /v1/mediciones/ultimas). La antigüedad la calcula
     * el servidor; si la consulta falla, todas quedan como error de consulta.
     */
    private suspend fun cargarUltimasMediciones(galponId: Int, soloCache: Boolean = false): LecturasGalpon {
        val actuadores = actuadoresDelGalpon(galponId)
        val todos = sensoresFisicosDelGalpon(galponId) + actuadores
        if (todos.isEmpty()) return LecturasGalpon.VACIAS
        val lecturas = try {
            val response = (if (soloCache) RetrofitClient.apiCache else RetrofitClient.api).listarUltimasLecturas(galponId)
            val cuerpo = response.body()
            if (response.isSuccessful && cuerpo != null && cuerpo.sensores != null) {
                LecturasSensores.cruzar(todos, cuerpo).map { item ->
                    val lectura = item.lectura
                    if (soloCache && lectura != null) item.copy(lectura = lectura.copy(antiguedad_segundos = null)) else item
                }
            } else {
                LecturasSensores.conError(todos)
            }
        } catch (cancelacion: CancellationException) {
            throw cancelacion
        } catch (_: Exception) {
            LecturasSensores.conError(todos)
        }
        return LecturasSensores.separar(lecturas, actuadores)
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
        mediciones: LecturasGalpon
    ) {
        val primeraCarga = !datosInicialesRecibidos
        // No interrumpir animaciones de entrada por una actualización de datos.
        val muertes = mortalidadesLote.sumOf { it.cantidad_aves }
        val avesVivas = lote?.let { (it.cantidad_inicial - muertes).coerceAtLeast(0) }

        binding.txtAves.text = avesVivas?.toString() ?: "—"
        binding.txtAvesMuertas.text = muertes.toString()
        binding.txtAlertas.text = alertas.count { it.estado.esActiva() }.toString()

        // La fecha vigente del lote manda: los indicadores pueden tener una edad calculada antes de cambiar fecha_ingreso.
        val diaVida = lote?.let { calcularDiaVida(it.fecha_ingreso) } ?: indicador?.dia_vida
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
            actualizarSensores(mediciones, alertas)
        }
        if (primeraCarga) {
            mostrarValoresIniciales()
            datosInicialesRecibidos = true
            val actuadores = (0 until binding.contenedorActuadoresInicio.childCount)
                .map { binding.contenedorActuadoresInicio.getChildAt(it) }
                .filter { it.visibility == View.VISIBLE && it !in tarjetasIniciadas }
            actuadores.forEachIndexed { indice, tarjeta ->
                tarjeta.alpha = 0f
                tarjeta.translationY = 60f * resources.displayMetrics.density
                tarjeta.animate().alpha(1f).translationY(0f)
                    .setStartDelay(indice * 320L).setDuration(1000L)
                    .setInterpolator(android.view.animation.DecelerateInterpolator()).start()
            }
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

    private fun actualizarSensores(
        lecturasGalpon: LecturasGalpon,
        alertas: List<AlertaResponse>
    ) {
        val mediciones = lecturasGalpon.sensores
        binding.txtSinActuadoresInicio.text = when {
            errorCargaSensores -> "No se pudieron consultar los actuadores. Intenta nuevamente."
            else -> "No hay actuadores registrados en este galpón."
        }
        ListaActuadores.pintar(
            binding.contenedorActuadoresInicio,
            binding.txtSinActuadoresInicio,
            lecturasGalpon.actuadores.map { Actuadores.vista(it) }
        )


        val sensoresDelGalpon = sensoresFisicosDelGalpon(galponSeleccionadoId)
        val configuradas = VariableSensor.values().count { variable ->
            sensoresDelGalpon.any { ClasificadorSensores.variableDe(it) == variable }
        }
        val recientes = VariableSensor.values().count { variable ->
            val lectura = LecturasSensores.elegir(mediciones, variable)
            lectura != null && !lectura.errorConsulta && lectura.vigencia == VigenciaLectura.RECIENTE
        }
        binding.txtSensoresActivos.text = when {
            errorCargaSensores -> "Sensores sin consultar"
            configuradas == 0 -> "Sin sensores"
            else -> "$recientes de $configuradas recientes"
        }

        val aviso = LecturasSensores.avisoSinIdentificar(
            LecturasSensores.sensoresSinIdentificar(
                sensores.filter { it.galpon.id == galponSeleccionadoId }
            )
        )
        binding.txtSensoresSinIdentificarInicio.text = aviso.orEmpty()
        binding.txtSensoresSinIdentificarInicio.visibility = if (aviso == null) View.GONE else View.VISIBLE

        pintarSensorInicio(VariableSensor.TEMPERATURA, mediciones, alertas,
            binding.arcTemperaturaInicio, binding.txtTemperaturaInicio, binding.txtEstadoTemperaturaInicio)
        pintarSensorInicio(VariableSensor.HUMEDAD, mediciones, alertas,
            binding.arcHumedadInicio, binding.txtHumedadInicio, binding.txtEstadoHumedadInicio)
        pintarSensorInicio(VariableSensor.CALIDAD_AIRE, mediciones, alertas,
            binding.arcCalidadAireInicio, binding.txtCalidadAireInicio, binding.txtEstadoCalidadAireInicio,
            binding.txtLabelCalidadAireInicio)
        pintarSensorInicio(VariableSensor.PESO, mediciones, alertas,
            binding.arcPesoInicio, binding.txtPesoInicio, binding.txtEstadoPesoInicio,
            binding.txtLabelPesoInicio)
        pintarSensorInicio(VariableSensor.LUMINOSIDAD, mediciones, alertas,
            binding.arcLuminosidadInicio, binding.txtLuminosidadInicio, binding.txtEstadoLuminosidadInicio, binding.txtLabelLuminosidadInicio)
        val hayNivelAgua = pintarSensorInicio(VariableSensor.NIVEL_AGUA, mediciones, alertas,
            binding.arcNivelAguaInicio, binding.txtNivelAguaInicio, binding.txtEstadoNivelAguaInicio,
            binding.txtLabelNivelAguaInicio)
        // Mantener la misma estructura visual para todos los propietarios.
        // Si el galpón no tiene HC-SR04, la tarjeta muestra "No configurado"
        // en lugar de desaparecer.
        binding.filaNivelAguaInicio.visibility = View.VISIBLE
    }

    /**
     * Pinta una variable distinguiendo: sensor no configurado, consulta
     * fallida, sensor sin lecturas, lectura obsoleta y lectura reciente.
     * Nunca muestra 0 cuando no hay una medición real. Devuelve si la
     * variable tiene un sensor configurado en el galpón.
     */
    private fun semanaUmbralInicio(): Int {
        val lote = lotes.filter { it.galpon.id == galponSeleccionadoId && it.estado.equals("activo", true) }.maxByOrNull { it.fecha_ingreso }
        return ((lote?.let { calcularDiaVida(it.fecha_ingreso) } ?: 1) - 1).coerceAtLeast(0) / 7
    }

    private fun conectarDetalleInicio(arco: View, valor: TextView, estado: TextView, nombre: String, clave: String?, unidad: String) {
        DetalleSensorModal.tarjeta(arco).setOnClickListener { origen ->
            finalizarValor(valor)
            val galpon = galponSeleccionadoId ?: return@setOnClickListener
            val configurar: (() -> Unit)? = if (clave != null && esPropietario()) ({ mostrarUmbrales(clave, unidad) }) else null
            detalleSensor.abrir(origen, nombre, valor, estado,
                { umbralesInicio.firstOrNull { it.galpon_id == galpon && it.variable.equals(clave, true) } },
                { semanaUmbralInicio() }, configurar)
        }
    }

    private fun mostrarUmbrales(clave: String, unidadSensor: String) {
        if (!esPropietario()) return
        val galponId = galponSeleccionadoId ?: run {
            android.widget.Toast.makeText(requireContext(), "Selecciona un galpón", android.widget.Toast.LENGTH_SHORT).show()
            return
        }
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val lista = cargarPaginas { pagina ->
                    RetrofitClient.api.listarUmbralesAmbientales(galponId, page = pagina, limit = 100)
                }
                if (_binding == null || galponSeleccionadoId != galponId || !esPropietario()) return@launch
                editarUmbral(galponId, lista.filter { it.variable.equals(clave, true) && it.vigente }, clave, unidadSensor)
            } catch (e: CancellationException) { throw e }
            catch (_: Exception) { if (_binding != null) android.widget.Toast.makeText(requireContext(), "No se pudieron consultar los umbrales", android.widget.Toast.LENGTH_SHORT).show() }
        }
    }

    private fun editarUmbral(galponId: Int, lista: List<UmbralAmbientalResponse>, clave: String, unidadSensor: String) {
        if (!esPropietario()) return
        val ctx = requireContext()
        val dialogo = android.app.Dialog(ctx)
        val formulario = layoutInflater.inflate(R.layout.r08_configurar_umbral, null)
        dialogo.setContentView(formulario)
        dialogo.window?.setBackgroundDrawableResource(android.R.color.transparent)
        fun spinner(id: Int) = formulario.findViewById<android.widget.Spinner>(id)
        fun campo(id: Int) = formulario.findViewById<android.widget.EditText>(id)
        fun adaptar(spinner: android.widget.Spinner, items: List<String>) {
            spinner.adapter = MainActivity.SpinnerAdapterEstilizado(ctx, items.toMutableList())
        }
        val selector = spinner(R.id.spinnerUmbralExistente)
        val variable = spinner(R.id.spinnerVariableUmbral)
        val criticidad = spinner(R.id.spinnerCriticidadUmbral)
        val semana = campo(R.id.edtSemanaUmbral)
        val minimo = campo(R.id.edtMinimoUmbral)
        val maximo = campo(R.id.edtMaximoUmbral)
        val unidad = campo(R.id.edtUnidadUmbral)
        val guardar = formulario.findViewById<View>(R.id.btnGuardarUmbral)
        val cancelar = formulario.findViewById<View>(R.id.btnCancelarUmbral)
        val variables = listOf(clave)
        val criticidades = (listOf("alta", "critica") + lista.map { it.criticidad }).distinct()
        val porSemana = lista.associateBy { it.semana_vida + 1 }.toMutableMap()
        val semanaActual = semanaUmbralInicio() + 1
        var totalSemanas = maxOf(8, semanaActual.coerceAtMost(201), porSemana.keys.maxOrNull() ?: 0)
        val progreso = formulario.findViewById<TextView>(R.id.txtProgresoUmbrales)
        val agregar = formulario.findViewById<View>(R.id.btnAgregarSemanaUmbral)
        fun actualizarSemanas(seleccion: Int) {
            progreso.text = "${porSemana.size} de $totalSemanas semanas configuradas"
            adaptar(selector, (1..totalSemanas).map { numero ->
                val estado = if (porSemana.containsKey(numero)) "Configurada" else "Sin configurar"
                val marca = if (numero == semanaActual) " · Actual" else ""
                "Semana $numero · $estado$marca"
            })
            selector.setSelection((seleccion - 1).coerceIn(0, totalSemanas - 1))
            agregar.isEnabled = totalSemanas < 201
        }
        adaptar(variable, listOf(clave.replaceFirstChar { it.uppercase() }))
        adaptar(criticidad, criticidades.map { it.replaceFirstChar { c -> c.uppercase() } })
        var actual: UmbralAmbientalResponse? = null
        selector.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {}
            override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                actual = porSemana[position + 1]
                val item = actual
                variable.setSelection(variables.indexOf(item?.variable).coerceAtLeast(0))
                variable.isEnabled = false
                semana.isEnabled = false
                semana.setText((position + 1).toString())
                minimo.setText(item?.valor_minimo?.toString().orEmpty())
                maximo.setText(item?.valor_maximo?.toString().orEmpty())
                unidad.setText(item?.unidad ?: unidadSensor)
                criticidad.setSelection(criticidades.indexOf(item?.criticidad).coerceAtLeast(0))
            }
        }
        actualizarSemanas(semanaActual)
        agregar.setOnClickListener {
            if (totalSemanas < 201) {
                totalSemanas++
                actualizarSemanas(totalSemanas)
            }
        }
        cancelar.setOnClickListener { dialogo.dismiss() }
        guardar.setOnClickListener {
            if (!esPropietario() || galponSeleccionadoId != galponId) { dialogo.dismiss(); return@setOnClickListener }
            val min = minimo.text.toString().replace(',', '.').toDoubleOrNull()
            val max = maximo.text.toString().replace(',', '.').toDoubleOrNull()
            val sem = semana.text.toString().toIntOrNull()
            val uni = unidad.text.toString().trim()
            if (sem == null || sem !in 1..201) { semana.error = "Semana entre 1 y 201"; return@setOnClickListener }
            if (min == null || !min.isFinite() || min !in -50.0..100000.0) { minimo.error = "Valor mínimo inválido"; return@setOnClickListener }
            if (max == null || !max.isFinite() || max !in -50.0..100000.0 || max <= min) { maximo.error = "Debe ser mayor que el mínimo"; return@setOnClickListener }
            if (uni.isBlank() || uni.length > 20) { unidad.error = "Ingresa una unidad válida"; return@setOnClickListener }
            val item = porSemana[sem]
            val datos = mutableMapOf<String, Any>("valor_minimo" to min, "valor_maximo" to max, "unidad" to uni, "criticidad" to criticidades[criticidad.selectedItemPosition])
            if (item == null) { datos["galpon_id"] = galponId; datos["variable"] = variables[variable.selectedItemPosition]; datos["semana_vida"] = sem - 1 }
            guardar.isEnabled = false
            selector.isEnabled = false
            agregar.isEnabled = false
            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val respuesta = if (item == null) RetrofitClient.api.crearUmbralAmbiental(datos) else RetrofitClient.api.revisarUmbralAmbiental(item.id, datos)
                    if (respuesta.isSuccessful) {
                        val guardado = respuesta.body()
                        if (guardado != null) {
                            porSemana[sem] = guardado
                            actualizarSemanas(sem)
                            android.widget.Toast.makeText(ctx, "Semana $sem guardada", android.widget.Toast.LENGTH_SHORT).show()
                        } else {
                            dialogo.dismiss()
                        }
                        cargarDashboardDelGalpon(galponId)
                    }
                    else minimo.error = if (respuesta.code() == 409) "Ya existe un umbral para esta semana y variable" else "No se pudo guardar (HTTP ${respuesta.code()})"
                } catch (e: CancellationException) { throw e }
                catch (_: Exception) { minimo.error = "No se pudo conectar con el servidor" }
                finally { guardar.isEnabled = true; selector.isEnabled = true; agregar.isEnabled = totalSemanas < 201 }
            }
        }
        dialogoUmbral?.dismiss()
        dialogoUmbral = dialogo
        dialogo.show()
        dialogo.window?.setLayout((resources.displayMetrics.widthPixels * 0.90).toInt(), ViewGroup.LayoutParams.WRAP_CONTENT)
    }

    private suspend fun cargarUmbralesInicio(galponId: Int): List<com.project.avisensandroid.model.UmbralAmbientalResponse> {
        val lote = lotes.filter { it.galpon.id == galponId && it.estado.equals("activo", true) }.maxByOrNull { it.fecha_ingreso }
        val semana = ((lote?.let { calcularDiaVida(it.fecha_ingreso) } ?: 1) - 1) / 7
        return try {
            cargarPaginas { pagina -> RetrofitClient.api.listarUmbralesAmbientales(galponId, page = pagina, limit = 100) }
                .filter { it.vigente && it.galpon_id == galponId && it.semana_vida <= semana }
                .groupBy { it.variable.lowercase(Locale.ROOT) }.values.mapNotNull { grupo -> grupo.maxByOrNull { it.semana_vida } }
        } catch (e: CancellationException) { throw e } catch (_: Exception) { emptyList() }
    }

    private fun pintarSensorInicio(
        variable: VariableSensor,
        mediciones: List<LecturaDeSensor>,
        alertas: List<AlertaResponse>,
        arco: SensorArcView,
        txtValor: TextView,
        txtEstado: TextView,
        txtEtiqueta: TextView? = null
    ): Boolean {
        val lectura = LecturasSensores.elegir(mediciones, variable)
        val configurado = sensoresFisicosDelGalpon(galponSeleccionadoId)
            .any { ClasificadorSensores.variableDe(it) == variable }

        txtEtiqueta?.text = etiquetaSensor(
            nombreVariableInicio(variable),
            lectura?.sensor?.let { unidadVisibleInicio(it) }
        )
        txtValor.setTextColor(resources.getColor(R.color.text_primary, null))

        val ultima = lectura?.lectura
        val valorMedido = ultima?.valor
        if (lectura == null || lectura.errorConsulta || ultima == null || valorMedido == null) {
            finalizarValor(txtValor)
            valoresPendientes.remove(txtValor)
            txtValor.text = "—"
            progresoSensorInicio(arco, 0f)
            arco.setArcColor(resources.getColor(R.color.ring_track, null))
            val (texto, error) = when {
                errorCargaSensores -> "Error de consulta" to true
                lectura?.errorConsulta == true -> "Error de consulta" to true
                lectura != null || configurado -> "Sin lecturas" to false
                else -> "No configurado" to false
            }
            marcarEstadoSinValor(txtEstado, texto, error)
            return configurado
        }

        val noReciente = LecturasSensores.etiquetaNoReciente(lectura.vigencia)
        if (noReciente != null) {
            // Último valor conocido que no es verificablemente reciente
            // (obsoleto, hora inconsistente o sin antigüedad): número y arco
            // en gris, con el largo real del valor pero sin color de estado ni
            // de alerta, y con su fecha.
            txtValor.setTextColor(resources.getColor(R.color.text_secondary, null))
            asignarValorSensor(txtValor, textoValorInicio(variable, valorMedido))
            progresoSensorInicio(arco, fraccionVisualInicio(variable, valorMedido))
            arco.setArcColor(resources.getColor(R.color.text_secondary, null))
            arco.contentDescription =
                "$noReciente: ${nombreVariableInicio(variable).lowercase(Locale.getDefault())}"
            val fecha = fechaCortaInicio(ultima.fecha_hora)
            marcarEstadoSinValor(
                txtEstado,
                if (fecha != null) "$noReciente\nÚltima: $fecha" else noReciente,
                error = false
            )
            return true
        }

        val sensorId = lectura.sensor.id
        arco.setArcColor(colorArcoPorEstado(sensorId, ultima.calidad, alertas))
        progresoSensorInicio(arco, fraccionVisualInicio(variable, valorMedido))
        if (variable == VariableSensor.PESO || variable == VariableSensor.NIVEL_AGUA) {
            // SensorArcView anuncia "100 por ciento" con el arco completo; aquí
            // el arco solo indica el estado de la lectura.
            arco.contentDescription =
                "Estado de la lectura de ${nombreVariableInicio(variable).lowercase(Locale.getDefault())}"
        }
        asignarValorSensor(txtValor, textoValorInicio(variable, valorMedido))
        actualizarEstadoSensor(
            txtEstado,
            ultima.calidad,
            "Normal",
            alertas.firstOrNull { it.sensor_id == sensorId && it.estado.esActiva() }
        )
        val clave = when (variable) {
            VariableSensor.TEMPERATURA -> "temperatura"
            VariableSensor.HUMEDAD -> "humedad"
            VariableSensor.LUMINOSIDAD -> "luminosidad"
            else -> null
        }
        if (clave != null && ultima.calidad.equals("ok", true)) {
            val umbral = umbralesInicio.firstOrNull { it.variable.equals(clave, true) && it.galpon_id == galponSeleccionadoId }
            if (umbral == null) {
                txtEstado.text = "Sin umbral configurado"
                txtEstado.setBackgroundResource(R.drawable.bg_badge_regular)
                txtEstado.setTextColor(resources.getColor(R.color.text_secondary, null))
                arco.setArcColor(resources.getColor(R.color.ring_track, null))
            } else {
                val dentro = valorMedido in umbral.valor_minimo..umbral.valor_maximo
                val rango = "${formatearNumero(umbral.valor_minimo, 2)} – ${formatearNumero(umbral.valor_maximo, 2)} ${umbral.unidad}"
                txtEstado.text = (if (dentro) "En rango" else "Fuera de rango") + "\n" + rango
                txtEstado.setBackgroundResource(if (dentro) R.drawable.bg_badge_green else R.drawable.bg_badge_orange)
                txtEstado.setTextColor(resources.getColor(if (dentro) R.color.badge_green_text else R.color.orange_badge_text, null))
                arco.setArcColor(resources.getColor(if (dentro) R.color.gauge_green else R.color.gauge_orange, null))
            }
        }
        return true
    }

    private fun asignarValorSensor(vista: TextView, texto: String) {
        val animacion = valoresAnimados[vista]
        if (animacion != null) {
            if (animacion.second == texto) return
            finalizarValor(vista)
        }
        if (vista in valoresPendientes) valoresPendientes[vista] = texto
        vista.text = texto
    }

    private fun textoValorInicio(variable: VariableSensor, valor: Double): String = when (variable) {
        VariableSensor.TEMPERATURA -> "${formatearNumero(valor, 1)}°"
        VariableSensor.HUMEDAD -> "${formatearNumero(valor, 1)}%"
        // El ADC del MQ-135 es un entero; la unidad va en la etiqueta.
        VariableSensor.CALIDAD_AIRE -> formatearNumero(valor, 0)
        VariableSensor.LUMINOSIDAD, VariableSensor.CO2, VariableSensor.AMONIACO, VariableSensor.PESO, VariableSensor.NIVEL_AGUA -> formatearNumero(valor, 1)
    }

    /** "dd/MM HH:mm" en la hora del teléfono; null si no hay fecha válida. */
    private fun fechaCortaInicio(valor: String?): String? =
        parseDate(valor)?.let { SimpleDateFormat("dd/MM HH:mm", Locale.getDefault()).format(it) }

    private fun marcarEstadoSinValor(view: TextView, texto: String, error: Boolean) {
        view.text = texto
        if (error) {
            view.setBackgroundResource(R.drawable.bg_badge_red)
            view.setTextColor(resources.getColor(R.color.badge_red_text, null))
        } else {
            view.setBackgroundResource(R.drawable.bg_badge_regular)
            view.setTextColor(resources.getColor(R.color.orange_badge_text, null))
        }
    }

    /**
     * Escala visual del arco, no un umbral. El MQ-135 usa el rango del ADC de
     * 12 bits; el peso y la distancia al agua no tienen una escala confirmada,
     * así que el arco completo solo indica el estado de la lectura.
     */
    private fun fraccionVisualInicio(variable: VariableSensor, valor: Double): Float {
        val escala = when (variable) {
            VariableSensor.TEMPERATURA -> 50f
            VariableSensor.HUMEDAD -> 100f
            VariableSensor.CALIDAD_AIRE -> ClasificadorSensores.ADC_MAXIMO
            VariableSensor.LUMINOSIDAD, VariableSensor.CO2, VariableSensor.AMONIACO, VariableSensor.PESO, VariableSensor.NIVEL_AGUA -> return 1f
        }
        return (valor.toFloat() / escala).coerceIn(0f, 1f)
    }

    private fun nombreVariableInicio(variable: VariableSensor): String = when (variable) {
        VariableSensor.TEMPERATURA -> "Temperatura"
        VariableSensor.HUMEDAD -> "Humedad"
        VariableSensor.LUMINOSIDAD -> "Luminosidad"
        VariableSensor.CALIDAD_AIRE -> "Calidad del aire"
        VariableSensor.CO2 -> "CO₂"
        VariableSensor.AMONIACO -> "NH₃"
        VariableSensor.PESO -> "Peso de alimento"
        VariableSensor.NIVEL_AGUA -> "Distancia al agua"
    }

    /** El MQ-135 siempre llega como ADC crudo, aunque se haya registrado con otra unidad. */
    private fun unidadVisibleInicio(sensor: SensorResponse): String =
        if (ClasificadorSensores.variableDe(sensor) == VariableSensor.CALIDAD_AIRE) "ADC"
        else sensor.unidad_medida.trim()

    private fun etiquetaSensor(nombre: String, unidad: String?): String =
        unidad?.trim()?.takeIf { it.isNotBlank() }?.let { "$nombre · $it" } ?: nombre

    /** Prioriza alertas activas del backend y luego la calidad de lectura. */
    private fun colorArcoPorEstado(
        sensorId: Int?,
        calidad: String?,
        alertas: List<AlertaResponse>
    ): Int {
        val alerta = alertas.firstOrNull { it.sensor_id == sensorId && it.estado.esActiva() }
        return when {
            alerta != null && (alerta.criticidad.equals("alta", true) || alerta.criticidad.equals("critica", true)) ->
                resources.getColor(R.color.gauge_red, null)
            alerta != null -> resources.getColor(R.color.gauge_orange, null)
            calidad.equals("ok", true) -> resources.getColor(R.color.gauge_green, null)
            calidad.equals("sospechosa", true) -> resources.getColor(R.color.gauge_orange, null)
            calidad.equals("error", true) -> resources.getColor(R.color.gauge_red, null)
            else -> resources.getColor(R.color.ring_track, null)
        }
    }

    private fun actualizarEstadoSensor(
        view: TextView,
        calidad: String?,
        normal: String,
        alertaActiva: AlertaResponse? = null
    ) {
        if (alertaActiva != null && (alertaActiva.criticidad.equals("alta", true) || alertaActiva.criticidad.equals("critica", true))) {
            view.text = "Alerta crítica"
            view.setBackgroundResource(R.drawable.bg_badge_red)
            view.setTextColor(resources.getColor(R.color.badge_red_text, null))
        } else if (alertaActiva != null) {
            view.text = "Fuera de rango"
            view.setBackgroundResource(R.drawable.bg_badge_orange)
            view.setTextColor(resources.getColor(R.color.orange_badge_text, null))
        } else if (calidad.equals("error", true)) {
            view.text = "Error"
            view.setBackgroundResource(R.drawable.bg_badge_red)
            view.setTextColor(resources.getColor(R.color.badge_red_text, null))
        } else if (calidad.equals("sospechosa", true)) {
            // El ESP32 marca "sospechosa" una lectura que no es una medida
            // física confirmada (hoy, el HX711 sin calibrar).
            view.text = "Sin calibrar"
            view.setBackgroundResource(R.drawable.bg_badge_orange)
            view.setTextColor(resources.getColor(R.color.orange_badge_text, null))
        } else if (calidad.equals("ok", true)) {
            view.text = normal
            view.setBackgroundResource(R.drawable.bg_badge_green)
            view.setTextColor(resources.getColor(R.color.badge_green_text, null))
        } else {
            view.text = "Sin verificar"
            view.setBackgroundResource(R.drawable.bg_badge_regular)
            view.setTextColor(resources.getColor(R.color.text_secondary, null))
        }
    }

    private fun limpiarDashboard(mensaje: String) {
        if (datosInicialesRecibidos) terminarEntradaPendiente()
        valoresPendientes.clear()
        arcosPendientes.clear()
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
        binding.txtCalidadAireInicio.text = "—"
        binding.txtPesoInicio.text = "—"
        binding.txtLuminosidadInicio.text = "—"
        binding.txtNivelAguaInicio.text = "—"
        binding.arcTemperaturaInicio.setProgressFraction(0f)
        binding.arcHumedadInicio.setProgressFraction(0f)
        binding.arcCalidadAireInicio.setProgressFraction(0f)
        binding.arcPesoInicio.setProgressFraction(0f)
        binding.arcLuminosidadInicio.setProgressFraction(0f)
        binding.arcNivelAguaInicio.setProgressFraction(0f)
        val colorNeutral = resources.getColor(R.color.ring_track, null)
        binding.arcTemperaturaInicio.setArcColor(colorNeutral)
        binding.arcHumedadInicio.setArcColor(colorNeutral)
        binding.arcCalidadAireInicio.setArcColor(colorNeutral)
        binding.arcPesoInicio.setArcColor(colorNeutral)
        binding.arcLuminosidadInicio.setArcColor(colorNeutral)
        binding.arcNivelAguaInicio.setArcColor(colorNeutral)
        binding.txtLabelCalidadAireInicio.text = nombreVariableInicio(VariableSensor.CALIDAD_AIRE)
        binding.txtLabelPesoInicio.text = nombreVariableInicio(VariableSensor.PESO)
        binding.txtLabelLuminosidadInicio.text = nombreVariableInicio(VariableSensor.LUMINOSIDAD)
        binding.txtLabelNivelAguaInicio.text = nombreVariableInicio(VariableSensor.NIVEL_AGUA)
        listOf(
            binding.txtEstadoTemperaturaInicio,
            binding.txtEstadoHumedadInicio,
            binding.txtEstadoCalidadAireInicio,
            binding.txtEstadoPesoInicio,
            binding.txtEstadoLuminosidadInicio,
            binding.txtEstadoNivelAguaInicio
        ).forEach { marcarEstadoSinValor(it, "Sin datos", error = false) }
        binding.filaNivelAguaInicio.visibility = View.VISIBLE
        binding.txtSensoresSinIdentificarInicio.visibility = View.GONE
        binding.contenedorActuadoresInicio.removeAllViews()
        binding.txtSinActuadoresInicio.text = when (mensaje) {
            "Sin galpones activos" -> "No hay galpones activos para consultar actuadores."
            else -> "Selecciona un galpón para consultar sus actuadores."
        }
        binding.txtSinActuadoresInicio.visibility =
            if (esPropietario()) View.VISIBLE else View.GONE
        val colorValor = resources.getColor(R.color.text_primary, null)
        listOf(
            binding.txtTemperaturaInicio,
            binding.txtHumedadInicio,
            binding.txtCalidadAireInicio,
            binding.txtPesoInicio,
            binding.txtLuminosidadInicio,
            binding.txtNivelAguaInicio
        ).forEach { it.setTextColor(colorValor) }
    }

    private fun esPropietario(): Boolean =
        com.project.avisensandroid.model.UserSession.role(requireContext()) == UserRole.PROPIETARIO

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

    private data class HealthState(
        val texto: String,
        val drawable: Int,
        val colorTexto: Int,
        val progreso: Int
    )

    override fun onDestroyView() {
        cargaInicialJob?.cancel()
        cargaDashboardJob?.cancel()
        trabajoEntrada?.cancel()
        trabajoEntrada = null
        finalizarValores()
        arcosPendientes.clear()
        valoresPendientes.clear()
        tarjetasIniciadas.clear()
        detalleSensor.cerrar()
        dialogoUmbral?.dismiss()
        dialogoUmbral = null
        super.onDestroyView()
        _binding = null
    }
}