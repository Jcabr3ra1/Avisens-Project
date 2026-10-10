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
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.MedicionResponse
import com.project.avisensandroid.model.PaginatedResponse
import com.project.avisensandroid.model.SensorResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
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
    private var sensoresActivos: List<SensorResponse> = emptyList()
    private var galponSeleccionadoId: Int? = null
    private val mutexLecturas = Mutex()

    private enum class Variable { TEMPERATURA, HUMEDAD, CO2, AMONIACO }
    private enum class EstadoLectura { NORMAL, ATENCION, ERROR, SIN_DATOS }

    private data class Indicador(
        val variable: Variable,
        val valor: TextView,
        val estado: TextView,
        val unidadLabel: TextView? = null
    )

    private data class LecturaSensor(
        val sensor: SensorResponse,
        val medicion: MedicionResponse?
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

    private fun indicadores(): List<Indicador> = listOf(
        Indicador(Variable.TEMPERATURA, binding.txtTemperatura, binding.txtEstadoTemperatura),
        Indicador(Variable.HUMEDAD, binding.txtHumedad, binding.txtEstadoHumedad),
        Indicador(Variable.CO2, binding.txtCo2, binding.txtEstadoCo2, binding.txtLabelCo2),
        Indicador(Variable.AMONIACO, binding.txtAmoniaco, binding.txtEstadoAmoniaco, binding.txtLabelAmoniaco)
    )

    private suspend fun cargarCatalogos() {
        val galpones = cargarTodasLasPaginas { pagina ->
            RetrofitClient.api.listarGalpones(page = pagina, limit = 100)
        }
        val sensores = cargarTodasLasPaginas { pagina ->
            RetrofitClient.api.listarSensores(page = pagina, limit = 100)
        }

        galponesDisponibles = galpones.filter { it.activo }
        sensoresActivos = sensores.filter { it.estado.equals("activo", ignoreCase = true) }
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

    private fun actualizarResumenSensores(sensoresDelGalpon: List<SensorResponse>? = null) {
        if (_binding == null) return
        val galponId = galponSeleccionadoId
        if (galponId == null) {
            binding.txtResumenSensores.text = "Selecciona un galpón desde Inicio"
            return
        }
        val sensores = sensoresDelGalpon ?: sensoresActivos.filter {
            it.galpon.id == galponId && variableDe(it.tipo) != null
        }
        binding.txtResumenSensores.text = "${sensores.size} sensores ambientales activos"
    }

    private fun reiniciarIndicadores() {
        if (_binding == null) return
        indicadores().forEach { indicador ->
            indicador.valor.text = "—"
            mostrarEstado(indicador.estado, "Sin datos", EstadoLectura.SIN_DATOS)
        }
        binding.txtLabelCo2.text = "CO₂"
        binding.txtLabelAmoniaco.text = "NH₃"
    }

    private fun actualizarEntradasConfiguradas(lecturas: List<LecturaSensor>) {
        if (_binding == null) return

        fun lecturaPara(variable: Variable): LecturaSensor? =
            lecturas.filter { variableDe(it.sensor.tipo) == variable }
                .filter { it.medicion != null }
                .maxByOrNull { fechaMillis(it.medicion!!.fecha_hora) }
                ?: lecturas.firstOrNull { variableDe(it.sensor.tipo) == variable }

        fun detalleSensor(lectura: LecturaSensor?): String = when {
            lectura == null -> "Sensor: no configurado para este galpón"
            else -> buildString {
                append("Sensor: ${lectura.sensor.codigo}")
                lectura.sensor.modelo?.takeIf { it.isNotBlank() }?.let { append(" · $it") }
                append(" · ${lectura.sensor.unidad_medida}")
            }
        }

        fun ultimaLectura(lectura: LecturaSensor?): String {
            val medicion = lectura?.medicion ?: return "Última lectura: sin datos"
            val unidad = lectura.sensor.unidad_medida.trim()
            val valor = formatearValor(medicion.valor)
            val fecha = parseDate(medicion.fecha_hora)
            val hora = fecha?.let { SimpleDateFormat("dd/MM HH:mm", Locale.getDefault()).format(it) }
            return buildString {
                append("Última lectura: $valor")
                if (unidad.isNotBlank()) append(" $unidad")
                if (hora != null) append(" · $hora")
            }
        }

        val temp = lecturaPara(Variable.TEMPERATURA)
        val humedad = lecturaPara(Variable.HUMEDAD)
        val co2 = lecturaPara(Variable.CO2)
        val amoniaco = lecturaPara(Variable.AMONIACO)

        binding.txtEntradaTemperaturaSensor.text = detalleSensor(temp)
        binding.txtEntradaTemperaturaLectura.text = ultimaLectura(temp)
        binding.txtEntradaHumedadSensor.text = detalleSensor(humedad)
        binding.txtEntradaHumedadLectura.text = ultimaLectura(humedad)
        binding.txtEntradaCo2Detalle.text = detalleSensor(co2)
        binding.txtEntradaCo2Lectura.text = ultimaLectura(co2)
        binding.txtEntradaAmoniacoDetalle.text = detalleSensor(amoniaco)
        binding.txtEntradaAmoniacoLectura.text = ultimaLectura(amoniaco)
    }

    private suspend fun actualizarLecturasDelGalpon() = mutexLecturas.withLock {
        val galponId = galponSeleccionadoId ?: return@withLock
        val sensoresDelGalpon = sensoresActivos
            .filter { it.galpon.id == galponId && variableDe(it.tipo) != null }
            .sortedBy { it.id }

        if (sensoresDelGalpon.isEmpty()) {
            if (_binding != null) {
                reiniciarIndicadores()
                actualizarEntradasConfiguradas(emptyList())
                actualizarResumenSensores(emptyList())
                indicadores().forEach { mostrarEstado(it.estado, "No configurado", EstadoLectura.SIN_DATOS) }
                binding.txtEstadoConexion.text = "No hay sensores ambientales activos en el galpón seleccionado."
            }
            return@withLock
        }

        try {
            val resultados = coroutineScope {
                sensoresDelGalpon.map { sensor ->
                    async {
                        val medicion = try {
                            val respuesta = RetrofitClient.api.listarMediciones(
                                sensorId = sensor.id,
                                page = 1,
                                limit = 1
                            )
                            if (respuesta.isSuccessful) respuesta.body()?.data?.firstOrNull() else null
                        } catch (cancelacion: CancellationException) {
                            throw cancelacion
                        } catch (_: Exception) {
                            null
                        }
                        LecturaSensor(sensor, medicion)
                    }
                }.awaitAll()
            }
            if (_binding == null || galponSeleccionadoId != galponId) return@withLock

            actualizarResumenSensores(sensoresDelGalpon)
            actualizarEntradasConfiguradas(resultados)
            val porVariable = resultados.groupBy { variableDe(it.sensor.tipo) }
            var variablesConLectura = 0
            indicadores().forEach { indicador ->
                val lecturas = porVariable[indicador.variable].orEmpty()
                val lecturaElegida = lecturas
                    .filter { it.medicion != null }
                    .maxByOrNull { fechaMillis(it.medicion!!.fecha_hora) }
                    ?: lecturas.firstOrNull()

                if (lecturaElegida?.medicion != null) variablesConLectura++
                pintarIndicador(indicador, lecturaElegida)
            }

            val hora = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
            binding.txtEstadoConexion.text = "Actualizado $hora · $variablesConLectura de 4 variables con lectura."
        } catch (cancelacion: CancellationException) {
            throw cancelacion
        } catch (e: Exception) {
            if (_binding != null) {
                binding.txtEstadoConexion.text = "No fue posible actualizar las lecturas. Se reintentará automáticamente."
            }
        }
    }

    private fun pintarIndicador(indicador: Indicador, lectura: LecturaSensor?) {
        val sensor = lectura?.sensor
        val medicion = lectura?.medicion
        if (indicador.variable == Variable.CO2) {
            indicador.unidadLabel?.text = etiquetaConUnidad("CO₂", sensor?.unidad_medida)
        } else if (indicador.variable == Variable.AMONIACO) {
            indicador.unidadLabel?.text = etiquetaConUnidad("NH₃", sensor?.unidad_medida)
        }

        if (sensor == null) {
            indicador.valor.text = "—"
            mostrarEstado(indicador.estado, "No configurado", EstadoLectura.SIN_DATOS)
            return
        }
        if (medicion == null) {
            indicador.valor.text = "—"
            mostrarEstado(indicador.estado, "Sin datos", EstadoLectura.SIN_DATOS)
            return
        }

        val numero = formatearValor(medicion.valor)
        indicador.valor.text = when (indicador.variable) {
            Variable.TEMPERATURA -> "$numero°"
            Variable.HUMEDAD -> "$numero%"
            Variable.CO2, Variable.AMONIACO -> numero
        }
        when (medicion.calidad?.trim()?.lowercase(Locale.ROOT)) {
            "ok" -> mostrarEstado(indicador.estado, "Lectura OK", EstadoLectura.NORMAL)
            "sospechosa" -> mostrarEstado(indicador.estado, "Atención", EstadoLectura.ATENCION)
            "error" -> mostrarEstado(indicador.estado, "Error", EstadoLectura.ERROR)
            else -> mostrarEstado(indicador.estado, "Recibida", EstadoLectura.SIN_DATOS)
        }
    }

    private fun etiquetaConUnidad(nombre: String, unidad: String?): String {
        val limpia = unidad?.trim().orEmpty()
        return if (limpia.isBlank()) nombre else "$nombre · $limpia"
    }

    private fun variableDe(tipo: String): Variable? {
        val normalizado = normalizar(tipo)
        return when {
            "temperatura" in normalizado -> Variable.TEMPERATURA
            "humedad" in normalizado -> Variable.HUMEDAD
            "amoniaco" in normalizado || "nh3" in normalizado -> Variable.AMONIACO
            "co2" in normalizado || "dioxido de carbono" in normalizado -> Variable.CO2
            else -> null
        }
    }

    private fun normalizar(texto: String): String = texto
        .trim()
        .lowercase(Locale.ROOT)
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("₂", "2")
        .replace("₃", "3")

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

    private fun fechaMillis(valor: String): Long = parseDate(valor)?.time ?: 0L

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
