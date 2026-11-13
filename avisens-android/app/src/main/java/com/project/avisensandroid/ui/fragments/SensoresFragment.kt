package com.project.avisensandroid.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.Po02SensoresOpBinding
import com.project.avisensandroid.model.ClasificadorSensores
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.ActuadorVista
import com.project.avisensandroid.model.Actuadores
import com.project.avisensandroid.model.AlertaResponse
import com.project.avisensandroid.model.LecturaDeSensor
import com.project.avisensandroid.model.LecturasSensores
import com.project.avisensandroid.model.PaginatedResponse
import com.project.avisensandroid.model.SensorResponse
import com.project.avisensandroid.model.VariableSensor
import com.project.avisensandroid.model.VigenciaLectura
import com.project.avisensandroid.ui.MainActivity
import com.project.avisensandroid.ui.views.ListaActuadores
import com.project.avisensandroid.ui.views.SensorArcView
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import retrofit2.Response
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class SensoresFragment : BaseBottomNavFragment() {

    companion object {
        private const val INTERVALO_ACTUALIZACION_MS = 15_000L
    }

    private var _binding: Po02SensoresOpBinding? = null
    private val binding get() = _binding!!

    private var galponesDisponibles: List<GalponResponse> = emptyList()

    // Solo sensores físicos activos. Los relés K1-K4 y los motores también
    // llegan por /v1/sensores (unidad "estado"), pero son actuadores.
    private var sensoresActivos: List<SensorResponse> = emptyList()

    // Relés y motores activos (unidad "estado"): se muestran en su propia
    // sección, nunca como sensores.
    private var actuadoresActivos: List<SensorResponse> = emptyList()
    private var alertasActivasGalpon: List<AlertaResponse> = emptyList()
    private var galponSeleccionadoId: Int? = null
    private val mutexLecturas = Mutex()

    private enum class EstadoLectura { NORMAL, ATENCION, ERROR, SIN_DATOS }

    private data class Indicador(
        val variable: VariableSensor,
        val valor: TextView,
        val estado: TextView,
        val arco: SensorArcView,
        val unidadLabel: TextView? = null
    )

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po02SensoresOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        configurarBottomNav(R.id.nav_sensores)
        binding.txtEstadoConexion.text = "Conectando con los sensores..."
        reiniciarIndicadores()

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                cargarCatalogos()
                prepararSeleccionInicial()
            } catch (cancelacion: CancellationException) {
                throw cancelacion
            } catch (e: Exception) {
                if (_binding != null) {
                    binding.txtEstadoConexion.text =
                        e.message?.let { "Error de conexión: $it" }
                            ?: "No fue posible consultar el backend."
                    actualizarResumenSensores()
                    indicadores().forEach { mostrarEstado(it.estado, "Error de consulta", EstadoLectura.ERROR) }
                }
                return@launch
            }

            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (isActive) {
                    actualizarLecturasDelGalpon()
                    delay(INTERVALO_ACTUALIZACION_MS)
                }
            }
        }
    }

    private fun indicadores(): List<Indicador> {
        // El color se asigna según la calidad de la última lectura,
        // no según el tipo de variable.
        return listOf(
            Indicador(VariableSensor.TEMPERATURA, binding.txtTemperatura, binding.txtEstadoTemperatura, binding.arcTemperatura),
            Indicador(VariableSensor.HUMEDAD, binding.txtHumedad, binding.txtEstadoHumedad, binding.arcHumedad),
            Indicador(VariableSensor.CALIDAD_AIRE, binding.txtCalidadAire, binding.txtEstadoCalidadAire, binding.arcCalidadAire, binding.txtLabelCalidadAire),
            Indicador(VariableSensor.PESO, binding.txtPeso, binding.txtEstadoPeso, binding.arcPeso, binding.txtLabelPeso),
            Indicador(VariableSensor.NIVEL_AGUA, binding.txtNivelAgua, binding.txtEstadoNivelAgua, binding.arcNivelAgua, binding.txtLabelNivelAgua)
        )
    }

    private suspend fun cargarCatalogos() {
        val galpones = cargarTodasLasPaginas { pagina ->
            RetrofitClient.api.listarGalpones(page = pagina, limit = 100)
        }
        val sensores = cargarTodasLasPaginas { pagina ->
            RetrofitClient.api.listarSensores(page = pagina, limit = 100)
        }

        galponesDisponibles = galpones.filter { it.activo }
        sensoresActivos = sensores.filter {
            it.estado.equals("activo", ignoreCase = true) && !ClasificadorSensores.esActuador(it)
        }
        actuadoresActivos = Actuadores.activos(sensores)
        actualizarResumenSensores()
    }

    private suspend fun <T> cargarTodasLasPaginas(
        solicitud: suspend (Int) -> Response<PaginatedResponse<T>>
    ): List<T> {
        val elementos = mutableListOf<T>()
        var pagina = 1
        var totalPaginas = 1
        do {
            val respuesta = solicitud(pagina)
            if (!respuesta.isSuccessful) {
                throw IllegalStateException("El backend respondió HTTP ${respuesta.code()}.")
            }
            val cuerpo = respuesta.body()
                ?: throw IllegalStateException("El backend devolvió una respuesta vacía.")
            elementos += cuerpo.data
            totalPaginas = cuerpo.meta.totalPages.coerceAtLeast(pagina)
            pagina++
        } while (pagina <= totalPaginas)
        return elementos
    }

    /**
     * Sensores no permite escoger otro galpón. Usa exclusivamente el que el
     * usuario ya eligió en Inicio y conserva ese contexto al navegar.
     */
    private fun prepararSeleccionInicial() {
        val actividad = requireActivity() as MainActivity
        val granjaId = actividad.obtenerGranjaSeleccionadaId()
        val galponId = actividad.obtenerGalponSeleccionadoId()
        val seleccionado = galponId?.let { id ->
            galponesDisponibles.firstOrNull { galpon ->
                galpon.id == id && (granjaId == null || galpon.granja.id == granjaId)
            }
        }

        if (seleccionado == null) {
            galponSeleccionadoId = null
            alertasActivasGalpon = emptyList()
            binding.txtResumenSensores.text = "Selecciona un galpón desde Inicio"
            reiniciarIndicadores()
            actualizarEntradasConfiguradas(emptyList())
            binding.txtEstadoConexion.text =
                "Ve a Inicio y selecciona el galpón para consultar sus sensores."
            return
        }

        galponSeleccionadoId = seleccionado.id
        actualizarResumenSensores()
    }

    private fun sensoresMedidosDelGalpon(galponId: Int): List<SensorResponse> =
        sensoresActivos.filter {
            it.galpon.id == galponId && ClasificadorSensores.variableDe(it) != null
        }

    private fun sensoresSinIdentificarDelGalpon(galponId: Int): List<SensorResponse> =
        LecturasSensores.sensoresSinIdentificar(sensoresActivos.filter { it.galpon.id == galponId })

    private fun actualizarResumenSensores(sensoresDelGalpon: List<SensorResponse>? = null) {
        if (_binding == null) return
        val galponId = galponSeleccionadoId
        if (galponId == null) {
            binding.txtResumenSensores.text = "Selecciona un galpón desde Inicio"
            return
        }
        val sensores = sensoresDelGalpon ?: sensoresMedidosDelGalpon(galponId)
        val sinIdentificar = sensoresSinIdentificarDelGalpon(galponId).size
        binding.txtResumenSensores.text = buildString {
            append(if (sensores.size == 1) "1 sensor activo" else "${sensores.size} sensores activos")
            if (sinIdentificar > 0) append(" · $sinIdentificar sin identificar")
        }
    }

    private fun reiniciarIndicadores() {
        if (_binding == null) return
        indicadores().forEach { indicador ->
            indicador.valor.setTextColor(colorDe(R.color.text_primary))
            indicador.valor.text = "—"
            indicador.arco.setProgressFraction(0f)
            indicador.arco.setArcColor(colorDe(R.color.ring_track))
            indicador.unidadLabel?.text = nombreVariable(indicador.variable)
            mostrarEstado(indicador.estado, "Sin datos", EstadoLectura.SIN_DATOS)
        }
        mostrarNivelAgua(false)
        mostrarSinIdentificar(emptyList())
    }

    /** El nivel de agua solo aparece si el galpón tiene un HC-SR04 registrado. */
    private fun mostrarNivelAgua(visible: Boolean) {
        val visibilidad = if (visible) View.VISIBLE else View.GONE
        binding.filaNivelAgua.visibility = visibilidad
        binding.tarjetaEntradaNivelAgua.visibility = visibilidad
    }

    private fun actualizarEntradasConfiguradas(lecturas: List<LecturaDeSensor>) {
        if (_binding == null) return

        fun detalleSensor(lectura: LecturaDeSensor?): String = when {
            lectura == null -> "Sensor: no configurado para este galpón"
            else -> buildString {
                append("Sensor: ${lectura.sensor.codigo}")
                lectura.sensor.modelo?.takeIf { it.isNotBlank() }?.let { append(" · $it") }
                val unidad = unidadVisible(lectura.sensor)
                if (unidad.isNotBlank()) append(" · $unidad")
            }
        }

        fun ultimaLectura(lectura: LecturaDeSensor?): String {
            if (lectura == null) return "Última lectura: —"
            if (lectura.errorConsulta) return "Última lectura: no se pudo consultar"
            val ultima = lectura.lectura ?: return "Última lectura: sin lecturas registradas"
            val valorMedido = ultima.valor ?: return "Última lectura: sin lecturas registradas"
            val unidad = unidadVisible(lectura.sensor)
            val hora = fechaCorta(ultima.fecha_hora)
            return buildString {
                append("Última lectura: ${formatearValor(valorMedido)}")
                if (unidad.isNotBlank()) append(" $unidad")
                if (ClasificadorSensores.esLecturaSinCalibrar(ultima.calidad)) append(" (sin calibrar)")
                if (ultima.calidad.equals("error", true)) append(" (calidad: error)")
                if (hora != null) append(" · $hora")
                LecturasSensores.etiquetaNoReciente(lectura.vigencia)?.let {
                    append(" · ${it.lowercase(Locale.getDefault())}")
                }
            }
        }

        val temp = LecturasSensores.elegir(lecturas, VariableSensor.TEMPERATURA)
        val humedad = LecturasSensores.elegir(lecturas, VariableSensor.HUMEDAD)
        val aire = LecturasSensores.elegir(lecturas, VariableSensor.CALIDAD_AIRE)
        val peso = LecturasSensores.elegir(lecturas, VariableSensor.PESO)
        val agua = LecturasSensores.elegir(lecturas, VariableSensor.NIVEL_AGUA)

        binding.txtEntradaTemperaturaSensor.text = detalleSensor(temp)
        binding.txtEntradaTemperaturaLectura.text = ultimaLectura(temp)
        binding.txtEntradaHumedadSensor.text = detalleSensor(humedad)
        binding.txtEntradaHumedadLectura.text = ultimaLectura(humedad)
        binding.txtEntradaCalidadAireSensor.text = detalleSensor(aire)
        binding.txtEntradaCalidadAireLectura.text = ultimaLectura(aire)
        binding.txtEntradaPesoSensor.text = detalleSensor(peso)
        binding.txtEntradaPesoLectura.text = ultimaLectura(peso)
        binding.txtEntradaNivelAguaSensor.text = detalleSensor(agua)
        binding.txtEntradaNivelAguaLectura.text = ultimaLectura(agua)
        mostrarNivelAgua(agua != null)
    }

    /** Lista los sensores activos que no se pudieron asociar a una variable. */
    private fun mostrarSinIdentificar(sensores: List<SensorResponse>) {
        if (_binding == null) return
        val aviso = LecturasSensores.avisoSinIdentificar(sensores)
        binding.txtSensoresSinIdentificar.text = aviso.orEmpty()
        binding.txtSensoresSinIdentificar.visibility = if (aviso == null) View.GONE else View.VISIBLE
    }

    private suspend fun actualizarLecturasDelGalpon() = mutexLecturas.withLock {
        val galponId = galponSeleccionadoId ?: return@withLock
        val sensoresDelGalpon = sensoresMedidosDelGalpon(galponId).sortedBy { it.id }
        val sinIdentificar = sensoresSinIdentificarDelGalpon(galponId)
        val actuadoresDelGalpon = Actuadores.activos(actuadoresActivos.filter { it.galpon.id == galponId })

        if (sensoresDelGalpon.isEmpty() && actuadoresDelGalpon.isEmpty()) {
            if (_binding != null) {
                pintarSinSensoresIdentificados(sinIdentificar)
                pintarActuadores(emptyList())
            }
            return@withLock
        }

        try {
            // Una sola petición para el galpón: trae sensores y actuadores.
            // La antigüedad la calcula el servidor; se cruza por sensor_id.
            val todos = sensoresDelGalpon + actuadoresDelGalpon
            val resultadosTodos = try {
                val respuesta = RetrofitClient.api.listarUltimasLecturas(galponId)
                val cuerpo = respuesta.body()
                if (respuesta.isSuccessful && cuerpo != null && cuerpo.sensores != null) {
                    LecturasSensores.cruzar(todos, cuerpo)
                } else {
                    LecturasSensores.conError(todos)
                }
            } catch (cancelacion: CancellationException) {
                throw cancelacion
            } catch (_: Exception) {
                LecturasSensores.conError(todos)
            }
            if (_binding == null || galponSeleccionadoId != galponId) return@withLock

            val idsActuadores = actuadoresDelGalpon.map { it.id }.toSet()
            val resultados = resultadosTodos.filter { it.sensor.id !in idsActuadores }
            pintarActuadores(resultadosTodos.filter { it.sensor.id in idsActuadores }.map { Actuadores.vista(it) })

            if (sensoresDelGalpon.isEmpty()) {
                pintarSinSensoresIdentificados(sinIdentificar)
                return@withLock
            }

            alertasActivasGalpon = try {
                val respuestaAlertas = RetrofitClient.api.listarAlertasDeGalpon(
                    galponId = galponId,
                    page = 1,
                    limit = 100
                )
                if (respuestaAlertas.isSuccessful) {
                    respuestaAlertas.body()?.data.orEmpty().filter {
                        !it.estado.equals("cerrada", ignoreCase = true)
                    }
                } else emptyList()
            } catch (cancelacion: CancellationException) {
                throw cancelacion
            } catch (_: Exception) {
                emptyList()
            }

            actualizarResumenSensores(sensoresDelGalpon)
            actualizarEntradasConfiguradas(resultados)
            mostrarSinIdentificar(sinIdentificar)
            var variablesConfiguradas = 0
            var variablesRecientes = 0
            indicadores().forEach { indicador ->
                val lectura = LecturasSensores.elegir(resultados, indicador.variable)
                if (lectura != null) variablesConfiguradas++
                if (lectura != null && !lectura.errorConsulta &&
                    lectura.vigencia == VigenciaLectura.RECIENTE
                ) {
                    variablesRecientes++
                }
                pintarIndicador(indicador, lectura)
            }

            val hora = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
            binding.txtEstadoConexion.text = buildString {
                append("Actualizado $hora · $variablesRecientes de $variablesConfiguradas variables con lectura reciente.")
                if (resultadosTodos.any { it.errorConsulta }) {
                    append(" No se pudieron consultar las lecturas; se reintentará automáticamente.")
                }
            }
        } catch (cancelacion: CancellationException) {
            throw cancelacion
        } catch (e: Exception) {
            if (_binding != null) {
                binding.txtEstadoConexion.text = "No fue posible actualizar las lecturas. Se reintentará automáticamente."
            }
        }
    }

    /** El galpón no tiene sensores físicos identificados (puede tener actuadores). */
    private fun pintarSinSensoresIdentificados(sinIdentificar: List<SensorResponse>) {
        reiniciarIndicadores()
        actualizarEntradasConfiguradas(emptyList())
        actualizarResumenSensores(emptyList())
        mostrarSinIdentificar(sinIdentificar)
        indicadores().forEach { mostrarEstado(it.estado, "No configurado", EstadoLectura.SIN_DATOS) }
        binding.txtEstadoConexion.text = if (sinIdentificar.isEmpty()) {
            "No hay sensores activos en el galpón seleccionado."
        } else {
            "No hay sensores identificados en el galpón seleccionado."
        }
    }

    private fun pintarActuadores(vistas: List<ActuadorVista>) {
        if (_binding == null) return
        ListaActuadores.pintar(binding.contenedorActuadores, binding.txtSinActuadores, vistas)
    }

    private fun pintarIndicador(indicador: Indicador, lectura: LecturaDeSensor?) {
        indicador.unidadLabel?.text = etiquetaConUnidad(
            nombreVariable(indicador.variable),
            lectura?.sensor?.let { unidadVisible(it) }
        )

        if (lectura == null) {
            pintarSinValor(indicador, "No configurado", EstadoLectura.SIN_DATOS)
            return
        }
        val sensor = lectura.sensor
        if (lectura.errorConsulta) {
            pintarSinValor(indicador, "Error de consulta", EstadoLectura.ERROR)
            return
        }
        val ultima = lectura.lectura
        val valorMedido = ultima?.valor
        if (ultima == null || valorMedido == null) {
            pintarSinValor(indicador, "Sin lecturas", EstadoLectura.SIN_DATOS)
            return
        }
        val noReciente = LecturasSensores.etiquetaNoReciente(lectura.vigencia)
        if (noReciente != null) {
            pintarNoReciente(indicador, valorMedido, ultima.fecha_hora, noReciente)
            return
        }

        val alertaActiva = alertasActivasGalpon.firstOrNull {
            it.sensor_id == sensor.id && !it.estado.equals("cerrada", ignoreCase = true)
        }
        indicador.arco.setProgressFraction(fraccionVisual(indicador.variable, valorMedido))
        if (!tieneEscalaVisual(indicador.variable)) {
            // SensorArcView anuncia "100 por ciento" con el arco completo; aquí
            // el arco solo indica el estado de la lectura.
            indicador.arco.contentDescription = "Estado de la lectura de ${nombreVariable(indicador.variable).lowercase(Locale.getDefault())}"
        }
        indicador.arco.setArcColor(colorArcoPorEstado(alertaActiva, ultima.calidad))
        indicador.valor.setTextColor(colorDe(R.color.text_primary))
        indicador.valor.text = textoValor(indicador.variable, valorMedido)
        when {
            alertaActiva != null && (alertaActiva.criticidad.equals("alta", true) ||
                    alertaActiva.criticidad.equals("critica", true)) ->
                mostrarEstado(indicador.estado, "Alerta crítica", EstadoLectura.ERROR)
            alertaActiva != null ->
                mostrarEstado(indicador.estado, "Fuera de rango", EstadoLectura.ATENCION)
            ultima.calidad.equals("ok", true) ->
                mostrarEstado(indicador.estado, "Lectura OK", EstadoLectura.NORMAL)
            ClasificadorSensores.esLecturaSinCalibrar(ultima.calidad) ->
                mostrarEstado(indicador.estado, "Sin calibrar", EstadoLectura.ATENCION)
            ultima.calidad.equals("error", true) ->
                mostrarEstado(indicador.estado, "Error", EstadoLectura.ERROR)
            else -> mostrarEstado(indicador.estado, "Sin verificar", EstadoLectura.SIN_DATOS)
        }
    }

    /**
     * Último valor conocido que no es verificablemente reciente (obsoleto,
     * con hora inconsistente o sin antigüedad): número y arco en gris, con el
     * largo real del valor pero sin color de estado ni de alerta, y con su
     * fecha. No es el estado actual.
     */
    private fun pintarNoReciente(indicador: Indicador, valor: Double, fechaHora: String?, etiqueta: String) {
        indicador.valor.setTextColor(colorDe(R.color.text_secondary))
        indicador.valor.text = textoValor(indicador.variable, valor)
        indicador.arco.setProgressFraction(fraccionVisual(indicador.variable, valor))
        indicador.arco.setArcColor(colorDe(R.color.text_secondary))
        indicador.arco.contentDescription =
            "$etiqueta: ${nombreVariable(indicador.variable).lowercase(Locale.getDefault())}"
        val fecha = fechaCorta(fechaHora)
        mostrarEstado(
            indicador.estado,
            if (fecha != null) "$etiqueta\nÚltima: $fecha" else etiqueta,
            EstadoLectura.SIN_DATOS
        )
    }

    private fun textoValor(variable: VariableSensor, valor: Double): String {
        val numero = formatearValor(valor)
        return when (variable) {
            VariableSensor.TEMPERATURA -> "$numero°"
            VariableSensor.HUMEDAD -> "$numero%"
            // La unidad va en la etiqueta para que el número quepa en el arco.
            VariableSensor.CALIDAD_AIRE, VariableSensor.PESO, VariableSensor.NIVEL_AGUA -> numero
        }
    }

    private fun pintarSinValor(indicador: Indicador, mensaje: String, estado: EstadoLectura) {
        indicador.valor.setTextColor(colorDe(R.color.text_primary))
        indicador.valor.text = "—"
        indicador.arco.setProgressFraction(0f)
        indicador.arco.setArcColor(colorDe(R.color.ring_track))
        mostrarEstado(indicador.estado, mensaje, estado)
    }

    /**
     * La longitud del arco es una escala visual; el color prioriza alertas activas
     * del backend. Si no hay alerta, usa la calidad de la lectura. Los umbrales
     * ambientales numéricos se gestionan en el backend.
     */
    private fun colorArcoPorEstado(alerta: AlertaResponse?, calidad: String?): Int = when {
        alerta != null && (alerta.criticidad.equals("alta", true) ||
                alerta.criticidad.equals("critica", true)) -> colorDe(R.color.gauge_red)
        alerta != null -> colorDe(R.color.gauge_orange)
        calidad.equals("ok", true) -> colorDe(R.color.gauge_green)
        calidad.equals("sospechosa", true) -> colorDe(R.color.gauge_orange)
        calidad.equals("error", true) -> colorDe(R.color.gauge_red)
        else -> colorDe(R.color.ring_track)
    }

    /**
     * Escalas visuales del arco (no son límites ambientales). El MQ-135 usa el
     * rango del ADC de 12 bits. El peso y la distancia al agua no tienen una
     * escala confirmada (capacidad de la tolva, altura del tanque), así que el
     * arco completo solo indica el estado de la lectura.
     */
    private fun tieneEscalaVisual(variable: VariableSensor): Boolean =
        variable != VariableSensor.PESO && variable != VariableSensor.NIVEL_AGUA

    private fun fraccionVisual(variable: VariableSensor, valor: Double): Float {
        val escala = when (variable) {
            VariableSensor.TEMPERATURA -> 50f
            VariableSensor.HUMEDAD -> 100f
            VariableSensor.CALIDAD_AIRE -> ClasificadorSensores.ADC_MAXIMO
            VariableSensor.PESO, VariableSensor.NIVEL_AGUA -> return 1f
        }
        return (valor.toFloat() / escala).coerceIn(0f, 1f)
    }

    private fun nombreVariable(variable: VariableSensor): String = when (variable) {
        VariableSensor.TEMPERATURA -> "Temperatura"
        VariableSensor.HUMEDAD -> "Humedad"
        VariableSensor.CALIDAD_AIRE -> "Calidad del aire"
        VariableSensor.PESO -> "Peso de alimento"
        VariableSensor.NIVEL_AGUA -> "Distancia al agua"
    }

    /**
     * Unidad que se muestra junto al valor. El MQ-135 siempre llega como ADC
     * crudo, aunque el sensor se haya registrado con otra unidad.
     */
    private fun unidadVisible(sensor: SensorResponse): String =
        if (ClasificadorSensores.variableDe(sensor) == VariableSensor.CALIDAD_AIRE) "ADC"
        else sensor.unidad_medida.trim()

    private fun etiquetaConUnidad(nombre: String, unidad: String?): String {
        val limpia = unidad?.trim().orEmpty()
        return if (limpia.isBlank()) nombre else "$nombre · $limpia"
    }

    private fun mostrarEstado(texto: TextView, mensaje: String, estado: EstadoLectura) {
        texto.text = mensaje
        when (estado) {
            EstadoLectura.NORMAL -> {
                texto.setBackgroundResource(R.drawable.bg_badge_green)
                texto.setTextColor(colorDe(R.color.badge_green_text))
            }
            EstadoLectura.ATENCION -> {
                texto.setBackgroundResource(R.drawable.bg_badge_orange)
                texto.setTextColor(colorDe(R.color.orange_badge_text))
            }
            EstadoLectura.ERROR -> {
                texto.setBackgroundResource(R.drawable.bg_badge_red)
                texto.setTextColor(colorDe(R.color.badge_red_text))
            }
            EstadoLectura.SIN_DATOS -> {
                texto.setBackgroundResource(R.drawable.bg_badge_regular)
                texto.setTextColor(colorDe(R.color.orange_badge_text))
            }
        }
    }

    private fun formatearValor(valor: Double): String =
        java.text.NumberFormat.getNumberInstance(Locale.getDefault()).apply {
            maximumFractionDigits = 2
            minimumFractionDigits = 0
        }.format(valor)

    /** "dd/MM HH:mm" en la hora del teléfono; null si no hay fecha válida. */
    private fun fechaCorta(valor: String?): String? = valor
        ?.let { parseDate(it) }
        ?.let { SimpleDateFormat("dd/MM HH:mm", Locale.getDefault()).format(it) }

    private fun parseDate(valor: String): Date? {
        val formatos = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSSX",
            "yyyy-MM-dd'T'HH:mm:ssX",
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd HH:mm:ss"
        )
        formatos.forEach { formato ->
            try {
                return SimpleDateFormat(formato, Locale.US).apply {
                    isLenient = false
                    timeZone = TimeZone.getTimeZone("UTC")
                }.parse(valor)
            } catch (_: Exception) {
                // Prueba el siguiente formato ISO admitido.
            }
        }
        return null
    }

    private fun colorDe(colorRes: Int): Int = requireContext().getColor(colorRes)

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}
