package com.project.avisensandroid.ui.fragments

import com.project.avisensandroid.ui.ColoresAdaptativos
import android.app.AlertDialog
import android.app.Dialog
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.Button
import android.text.InputType
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.Po05AlertasOpBinding
import com.project.avisensandroid.model.InsumoResponse
import com.project.avisensandroid.model.LoteResponse
import com.project.avisensandroid.model.AlertaResponse
import com.project.avisensandroid.model.CerrarAlertaRequest
import com.project.avisensandroid.model.PaginatedResponse
import com.project.avisensandroid.model.UsuarioGestionResponse
import com.project.avisensandroid.model.UserRole
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.util.Locale

class AlertasFragment : BaseBottomNavFragment() {

    private var _binding: Po05AlertasOpBinding? = null
    private val binding get() = _binding!!

    private var alertas: List<AlertaResponse> = emptyList()
    private var alertasStock: List<InsumoResponse> = emptyList()
    private enum class Pestana { ACTIVAS, HISTORIAL, ESCALADAS }
    private var pestanaActual = Pestana.ACTIVAS
    private var lotesActivos: List<LoteResponse> = emptyList()

    private var selectorAnimado: SelectorAnimado? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po05AlertasOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        configurarBottomNav(R.id.nav_alertas)
        binding.tabActivas.setOnClickListener {
            cambiarPestana(Pestana.ACTIVAS)
        }

        binding.tabHistorial.setOnClickListener {
            cambiarPestana(Pestana.HISTORIAL)
        }

        binding.tabEscaladas.setOnClickListener {
            cambiarPestana(Pestana.ESCALADAS)
        }
        binding.tabEscaladas.visibility = if (esPropietario()) View.VISIBLE else View.GONE
        selectorAnimado = SelectorAnimado(binding.tabActivas.parent as android.view.ViewGroup, R.drawable.bg_tab_selected)
        pintarTabs()

        // La carga se hace en onResume, también al regresar de Inicio.
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) cargarAlertas()
    }

    fun actualizarAlRecuperarInternet() {
        if (_binding != null && isAdded) cargarAlertas()
    }

    fun actualizarSilenciosamente() {
        if (_binding != null && isAdded) cargarAlertas(silenciosa = true)
    }

    private fun cargarAlertas(silenciosa: Boolean = false) {
        val mainActivity = activity as? MainActivity ?: return
        val granjaId = mainActivity.obtenerGranjaSeleccionadaId()
        val galponId = mainActivity.obtenerGalponSeleccionadoId()
        if (!silenciosa) {
            binding.tvBadgeActivas.visibility = View.GONE
            binding.tvBadgeHistorial.visibility = View.GONE
            binding.tvBadgeEscaladas.visibility = View.GONE
        }
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                if (!silenciosa) binding.tvResumenAlertas.text = "Cargando alertas del galpón seleccionado..."
                alertas = if (galponId != null) {
                    val todas = mutableListOf<AlertaResponse>()
                    var paginaAlertas = 1
                    var hayMasAlertas = true
                    while (hayMasAlertas) {
                        val response = RetrofitClient.api.listarAlertasDeGalpon(
                            galponId = galponId, page = paginaAlertas, limit = 100
                        )
                        if (!response.isSuccessful) {
                            throw IllegalStateException("Código ${response.code()}")
                        }
                        val cuerpo = response.body()
                            ?: throw IllegalStateException("Respuesta vacía al consultar alertas")
                        todas.addAll(cuerpo.data)
                        hayMasAlertas = paginaAlertas < cuerpo.meta.totalPages
                        paginaAlertas++
                    }
                    todas
                } else emptyList()
                // Los insumos pertenecen a granjas, NO a galpones. Se consultan
                // con el filtro de acceso que ya aplica el backend por rol.
                val stockBajo = mutableListOf<InsumoResponse>()
                var pagina = 1
                var continuar = true
                while (continuar) {
                    val insumosResponse = RetrofitClient.api.listarInsumos(page = pagina, limit = 100)
                    if (!insumosResponse.isSuccessful) {
                        throw IllegalStateException("No se pudo consultar Bodega: ${insumosResponse.code()}")
                    }
                    val cuerpo = insumosResponse.body()
                        ?: throw IllegalStateException("Respuesta vacía al consultar Bodega")
                    stockBajo.addAll(cuerpo.data.filter { insumo ->
                        insumo.activo &&
                                (granjaId == null || insumo.granja_id == granjaId) &&
                                (insumo.stock_minimo ?: 0.0) > 0.0 &&
                                (insumo.stock_actual ?: Double.POSITIVE_INFINITY) <= (insumo.stock_minimo ?: 0.0)
                    })
                    continuar = pagina < cuerpo.meta.totalPages
                    pagina++
                }
                alertasStock = stockBajo
                // El inventario pertenece a la granja. Consultamos los lotes
                // exclusivamente para identificar el código real cuando no
                // exista ambigüedad; un error aquí no oculta las alertas.
                lotesActivos = try {
                    val lotes = mutableListOf<LoteResponse>()
                    var paginaLotes = 1
                    var hayMas = true
                    while (hayMas) {
                        val respuesta = RetrofitClient.api.listarLotesCompletos(
                            page = paginaLotes, limit = 100
                        )
                        if (!respuesta.isSuccessful) {
                            throw IllegalStateException("No se pudieron consultar los lotes")
                        }
                        val cuerpo = respuesta.body()
                            ?: throw IllegalStateException("Respuesta vacía de lotes")
                        lotes.addAll(cuerpo.data.filter {
                            it.estado.equals("activo", ignoreCase = true)
                        })
                        hayMas = paginaLotes < cuerpo.meta.totalPages
                        paginaLotes++
                    }
                    lotes
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    emptyList()
                }
                actualizarResumen()
                pintarTabs()
                mostrarLista()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (!silenciosa && _binding != null) {
                    binding.tvResumenAlertas.text = "No se pudieron cargar las alertas"
                    Toast.makeText(
                        requireContext(),
                        "Error al cargar alertas: ${e.message ?: "error desconocido"}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    private fun actualizarResumen() {
        val activas = alertas.count { !estaCerrada(it) } + alertasStock.size
        val historial = alertas.count { estaCerrada(it) }
        val criticas = alertas.count {
            it.criticidad.equals("alta", true) || it.criticidad.equals("critica", true)
        } + alertasStock.size
        val advertencias = (activas - criticas).coerceAtLeast(0)

        binding.tvBadgeActivas.text = activas.toString()
        binding.tvBadgeActivas.visibility = View.GONE // Al abrir Alertas, el indicador de lectura desaparece
        val escaladas = alertas.count { it.escalado_a_id != null }
        binding.tvBadgeEscaladas.text = escaladas.toString()
        binding.tvBadgeEscaladas.visibility = View.GONE // Se mantienen las alertas escaladas en su pestaña
        binding.tvBadgeHistorial.text = historial.toString()
        binding.tvBadgeHistorial.visibility = View.GONE // Historial disponible, sin indicador de no leído
        binding.tvCriticas.text = "●  $criticas críticas"
        binding.tvAdvertencias.text = "●  $advertencias advertencias"
        actualizarTextoResumen()
    }

    private fun estaCerrada(alerta: AlertaResponse): Boolean =
        alerta.estado.trim().equals("cerrada", ignoreCase = true)

    private fun esPropietario(): Boolean =
        (activity as? MainActivity)?.obtenerRolActual() == UserRole.PROPIETARIO

    private fun actualizarTextoResumen() {
        if (_binding == null) return
        val activas = alertas.count { !estaCerrada(it) } + alertasStock.size
        binding.tvResumenAlertas.text = when (pestanaActual) {
            Pestana.ACTIVAS -> if (activas == 1)
                "1 alerta activa en el galpón o la granja seleccionada"
            else "$activas alertas activas en el galpón o la granja seleccionada"
            Pestana.HISTORIAL -> "Alertas cerradas del galpón seleccionado"
            Pestana.ESCALADAS -> "Alertas escaladas del galpón seleccionado"
        }
    }

    private fun cambiarPestana(nueva: Pestana) {
        if (nueva == pestanaActual) return
        val direccion = if (nueva.ordinal > pestanaActual.ordinal) 1 else -1
        pestanaActual = nueva
        pintarTabs()
        mostrarLista()
        deslizarContenido(binding.tabActivas.parent as View, direccion)
    }

    private fun pintarTabs() {
        if (_binding == null) return
        if (pestanaActual == Pestana.ESCALADAS && !esPropietario()) {
            pestanaActual = Pestana.ACTIVAS
        }
        binding.tabEscaladas.visibility = if (esPropietario()) View.VISIBLE else View.GONE
        val mostrarContadores = pestanaActual == Pestana.ACTIVAS
        binding.tvCriticas.visibility = if (mostrarContadores) View.VISIBLE else View.GONE
        binding.tvAdvertencias.visibility = if (mostrarContadores) View.VISIBLE else View.GONE
        selectorAnimado?.seleccionar(when (pestanaActual) {
            Pestana.ACTIVAS -> binding.tabActivas
            Pestana.HISTORIAL -> binding.tabHistorial
            Pestana.ESCALADAS -> binding.tabEscaladas
        })
        // El color del texto debe seguir la pestaña seleccionada, no quedar fijo en XML.
        val colorSeleccionado = ColoresAdaptativos.texto(requireContext(), "#111111")
        val colorNoSeleccionado = ColoresAdaptativos.texto(requireContext(), "#808A85")
        listOf(
            binding.tabActivas to (pestanaActual == Pestana.ACTIVAS),
            binding.tabHistorial to (pestanaActual == Pestana.HISTORIAL),
            binding.tabEscaladas to (pestanaActual == Pestana.ESCALADAS)
        ).forEach { (tab, seleccionada) ->
            for (i in 0 until tab.childCount) {
                (tab.getChildAt(i) as? TextView)?.let { texto ->
                    if (texto.id != R.id.tvBadgeActivas &&
                        texto.id != R.id.tvBadgeHistorial &&
                        texto.id != R.id.tvBadgeEscaladas
                    ) {
                        texto.setTextColor(if (seleccionada) colorSeleccionado else colorNoSeleccionado)
                    }
                }
            }
        }
        binding.tvTituloListaAlertas.text = when (pestanaActual) {
            Pestana.ACTIVAS -> "Alertas activas"
            Pestana.HISTORIAL -> "Historial de alertas"
            Pestana.ESCALADAS -> "Historial de escaladas"
        }
        actualizarTextoResumen()
    }

    private fun mostrarLista() {
        if (_binding == null) return
        binding.containerAlertas.removeAllViews()
        val filtradas = when (pestanaActual) {
            Pestana.ACTIVAS -> alertas.filter { !estaCerrada(it) }
            Pestana.HISTORIAL -> alertas.filter { estaCerrada(it) }
            Pestana.ESCALADAS -> if (esPropietario())
                alertas.filter { it.escalado_a_id != null } else emptyList()
        }
        val mostrarStock = pestanaActual == Pestana.ACTIVAS && alertasStock.isNotEmpty()
        if (filtradas.isEmpty() && !mostrarStock) {
            val mensaje = when (pestanaActual) {
                Pestana.ACTIVAS -> "No hay alertas activas para este galpón."
                Pestana.HISTORIAL -> "No hay alertas cerradas para este galpón."
                Pestana.ESCALADAS -> "No hay alertas escaladas registradas para este galpón."
            }
            binding.containerAlertas.addView(texto(mensaje, 13f, "#111111", false))
            return
        }
        if (mostrarStock) {
            alertasStock.forEach { insumo ->
                binding.containerAlertas.addView(crearTarjetaStockBajo(insumo))
                binding.containerAlertas.addView(View(requireContext()).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, dp(8)
                    )
                })
            }
        }
        // No existe fecha_escalamiento en el API: no se presenta una fecha inventada.
        // Las escaladas se agrupan por creación, y las cerradas por resolución.
        val agruparPorCierre = pestanaActual == Pestana.HISTORIAL
        val ordenadas = filtradas.sortedWith(
            compareByDescending<AlertaResponse> {
                if (agruparPorCierre) it.fecha_cierre.orEmpty() else it.fecha_creacion.orEmpty()
            }.thenByDescending { it.fecha_creacion.orEmpty() }
        )
        var fechaAnterior: String? = null
        ordenadas.forEach { alerta ->
            val fechaAgrupacion = if (agruparPorCierre) alerta.fecha_cierre else alerta.fecha_creacion
            val fechaActual = if (agruparPorCierre && fechaAgrupacion.isNullOrBlank())
                "SIN FECHA DE CIERRE" else fechaEncabezado(fechaAgrupacion)
            if (fechaActual != fechaAnterior) {
                binding.containerAlertas.addView(texto(fechaActual, 13f, "#52675C", true, 18).apply {
                    setPadding(dp(4), dp(2), dp(4), dp(8))
                })
                fechaAnterior = fechaActual
            }
            binding.containerAlertas.addView(
                if (pestanaActual == Pestana.ESCALADAS) crearTarjetaEscalada(alerta)
                else crearTarjetaAlerta(alerta)
            )
            binding.containerAlertas.addView(View(requireContext()).apply {
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(10))
            })
        }
    }

    private fun crearTarjetaEscalada(alerta: AlertaResponse): View {
        val critica = alerta.criticidad.equals("alta", true) ||
                alerta.criticidad.equals("critica", true)
        val tarjeta = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            background = resources.getDrawable(
                if (critica) R.drawable.bg_alert_card_critical else R.drawable.bg_alert_card_warning, null
            )
            elevation = dp(2).toFloat()
            setPadding(dp(14), dp(14), dp(14), dp(14))
        }
        val encabezado = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        encabezado.addView(texto(
            "●  ${alerta.galpon?.nombre ?: "Galpón ${alerta.galpon_id}"}",
            12f, "#111111", true
        ).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        })
        encabezado.addView(crearBadgeEstadoAlerta(alerta.estado))
        tarjeta.addView(encabezado)
        tarjeta.addView(texto(etiquetaTipoAlerta(alerta.tipo), 16f, "#111111", true, 8))
        tarjeta.addView(texto(
            "Escalada a: ${alerta.escalado_a?.nombre_completo?.takeIf { it.isNotBlank() } ?: "Usuario no disponible"}",
            12f, "#111111", true, 6
        ))
        tarjeta.addView(texto(
            "Responsable que aceptó: ${alerta.responsable?.nombre_completo?.takeIf { it.isNotBlank() } ?: "Sin aceptación registrada"}",
            12f, "#111111", false, 5
        ))
        alerta.fecha_creacion?.takeIf { it.isNotBlank() }?.let {
            tarjeta.addView(texto("Generada: ${formatearFechaAlerta(it)}", 12f, "#111111", false, 5))
        }
        val aceptacion = alerta.fecha_aceptacion
        if (!aceptacion.isNullOrBlank()) {
            tarjeta.addView(texto("Aceptada: ${formatearFechaAlerta(aceptacion)}", 12f, "#111111", false, 5))
            val minutos = calcularMinutosRespuesta(alerta.fecha_creacion, aceptacion)
            if (minutos != null) tarjeta.addView(texto(
                "Tiempo hasta aceptación: ${formatearDuracion(minutos)}",
                12f, "#111111", true, 5
            ))
        } else {
            tarjeta.addView(texto("Tiempo hasta aceptación: No disponible", 12f, "#111111", false, 5))
        }
        // No se atribuye al responsable que aceptó el papel de operario original:
        // ese dato y la fecha del escalamiento no existen en la respuesta del API.
        tarjeta.addView(texto(
            "Estado actual: ${when (alerta.estado.lowercase(Locale.ROOT)) {
                "cerrada" -> "Cerrada"
                "en_proceso" -> "En proceso"
                else -> "Abierta"
            }}", 12f, "#111111", true, 6
        ))
        alerta.mensaje?.takeIf { it.isNotBlank() }?.let {
            tarjeta.addView(texto(it, 12f, "#111111", false, 7))
        }
        if (alerta.estado == "cerrada") {
            alerta.accion_correctiva?.takeIf { it.isNotBlank() }?.let {
                tarjeta.addView(texto("Acción correctiva: $it", 12f, "#111111", false, 8))
            }
        }
        return tarjeta
    }

    private fun calcularMinutosRespuesta(creacion: String?, aceptacion: String?): Long? {
        if (creacion.isNullOrBlank() || aceptacion.isNullOrBlank()) return null
        return try {
            val inicio = java.time.Instant.parse(creacion)
            val fin = java.time.Instant.parse(aceptacion)
            java.time.Duration.between(inicio, fin).toMinutes().takeIf { it >= 0 }
        } catch (_: Exception) { null }
    }

    private fun formatearDuracion(minutos: Long): String =
        if (minutos < 60) "$minutos min" else "${minutos / 60} h ${minutos % 60} min"

    // Esta tarjeta representa un estado actual del inventario, no una Alerta
    // de galpón. No presenta acciones de cerrar/escalar: esas rutas solo
    // aceptan IDs reales de la tabla alertas.
    private fun crearTarjetaStockBajo(insumo: InsumoResponse): View {
        val tarjeta = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            background = resources.getDrawable(R.drawable.bg_alert_card_critical, null)
            elevation = dp(2).toFloat()
            setPadding(dp(14), dp(14), dp(14), dp(14))
        }
        // Un insumo está asociado a una granja y no a un lote específico.
        // Solo mostramos un código de lote si esa granja tiene exactamente
        // un lote activo; con varios lotes se evita atribuirlo al incorrecto.
        val lotesDeGranja = lotesActivos.filter {
            it.galpon.granja.id == insumo.granja_id
        }
        val ubicacion = lotesDeGranja.singleOrNull()?.codigo
            ?.takeIf { it.isNotBlank() }
            ?.let { "Lote $it" }
            ?: "Inventario de granja"
        tarjeta.addView(texto("●  Bodega · $ubicacion", 12f, "#5D6862", true))
        tarjeta.addView(texto("Stock bajo: ${insumo.nombre}", 16f, "#183C2E", true, 7))
        tarjeta.addView(texto(
            "Disponible: ${formatearValor(insumo.stock_actual ?: 0.0)} ${insumo.unidad_medida} · " +
                    "Mínimo: ${formatearValor(insumo.stock_minimo ?: 0.0)} ${insumo.unidad_medida}",
            12f, "#C62828", true, 5
        ))
        tarjeta.addView(texto("Repón este insumo desde Bodega para resolver la alerta.", 12f, "#78847E", false, 4))
        return tarjeta
    }

    private fun crearTarjetaAlerta(alerta: AlertaResponse): View {
        val critica = alerta.criticidad.equals("alta", true) || alerta.criticidad.equals("critica", true)
        val fondo = if (critica) R.drawable.bg_alert_card_critical else R.drawable.bg_alert_card_warning

        val card = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            background = resources.getDrawable(fondo, null)
            elevation = dp(2).toFloat()
            setPadding(dp(14), dp(14), dp(14), dp(14))
        }

        val fila = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        // Las alertas ambientales pueden incluir el lote directamente.
        // Si no, buscamos un único lote activo del galpón. En cualquier
        // otro caso mostramos el código real del galpón como referencia.
        val codigoLote = alerta.lote?.codigo?.takeIf { it.isNotBlank() }
            ?: lotesActivos.filter { it.galpon.id == alerta.galpon_id }
                .singleOrNull()?.codigo?.takeIf { it.isNotBlank() }
        val referencia = if (codigoLote != null) {
            "Lote $codigoLote"
        } else {
            alerta.galpon?.codigo?.takeIf { it.isNotBlank() }
                ?.let { "Galpón $it" }
                ?: "Galpón ${alerta.galpon_id}"
        }
        fila.addView(
            texto(
                "●  Sensores · $referencia",
                12f,
                "#111111",
                true
            ).apply {
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }
        )
        fila.addView(crearBadgeEstadoAlerta(alerta.estado))
        card.addView(fila)

        val titulo = alerta.sensor?.tipo?.takeIf { it.isNotBlank() }
            ?.let { etiquetaTipoAlerta(it) }
            ?: etiquetaTipoAlerta(alerta.tipo)
        val valor = alerta.valor_detectado?.let { formatearValor(it) }
        card.addView(
            texto(
                if (valor != null) "$titulo $valor" else titulo,
                16f,
                "#111111",
                true,
                7
            )
        )

        // En el historial, el responsable va justo debajo del motivo.
        if (alerta.estado.equals("cerrada", ignoreCase = true)) {
            val responsable = alerta.responsable?.nombre_completo?.takeIf { it.isNotBlank() }
                ?: "Responsable no registrado"
            card.addView(texto("Atendida por: $responsable", 12f, "#111111", true, 6))
        }

        alerta.fecha_creacion?.takeIf { it.isNotBlank() }?.let {
            card.addView(texto("Generada: ${formatearFechaAlerta(it)}", 11f, "#111111", false, 5))
        }

        val umbral = alerta.valor_umbral?.let { formatearValor(it) }
        val detalle = when {
            alerta.mensaje?.isNotBlank() == true -> alerta.mensaje
            umbral != null -> "Umbral: $umbral"
            else -> "Sin detalle adicional"
        }
        card.addView(texto(detalle ?: "", 12f, "#111111", false, 6))
        if (umbral != null && alerta.valor_detectado != null) {
            card.addView(texto(
                "Valor detectado: ${formatearValor(alerta.valor_detectado)} · Umbral: $umbral",
                11f, if (critica) "#E53935" else "#A56B12", true, 5
            ))
        }

        if (alerta.estado.equals("cerrada", ignoreCase = true)) {
            alerta.accion_correctiva?.takeIf { it.isNotBlank() }?.let {
                card.addView(View(requireContext()).apply {
                    setBackgroundColor(ColoresAdaptativos.superficie(requireContext(), "#E5ECE7"))
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(1)).apply {
                        topMargin = dp(12)
                        bottomMargin = dp(9)
                    }
                })
                card.addView(texto("Acción correctiva", 12f, "#111111", true))
                card.addView(texto(it, 12f, "#111111", false, 4))
            }
        } else {
            val confirmada = alerta.estado.equals("en_proceso", ignoreCase = true)
            val botones = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, dp(40)
                ).apply { topMargin = dp(10) }
            }
            val puedeEscalar = (activity as? MainActivity)?.obtenerRolActual() != UserRole.OPERARIO
            if (puedeEscalar) {
                val btnEscalar = MaterialButton(requireContext()).apply {
                    text = "Escalar"
                    isAllCaps = false
                    textSize = 12f
                    setTextColor(androidx.core.content.ContextCompat.getColor(context, R.color.adaptive_text_6d4c1d))
                    backgroundTintList = android.content.res.ColorStateList.valueOf(ColoresAdaptativos.superficie(requireContext(), "#FFF0D8"))
                    cornerRadius = dp(9)
                    minWidth = 0
                    minHeight = 0
                    insetTop = 0
                    insetBottom = 0
                    layoutParams = LinearLayout.LayoutParams(0, dp(40), 1f)
                    setOnClickListener { mostrarDialogEscalar(alerta) }
                }
                botones.addView(btnEscalar)
                botones.addView(View(requireContext()).apply {
                    layoutParams = LinearLayout.LayoutParams(dp(8), 1)
                })
            }
            val btnAccion = MaterialButton(requireContext()).apply {
                text = if (confirmada) "Cerrar alerta" else "Confirmar lectura"
                isAllCaps = false
                textSize = 12f
                setTextColor(Color.WHITE)
                backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#10A86B"))
                cornerRadius = dp(9)
                minWidth = 0
                minHeight = 0
                insetTop = 0
                insetBottom = 0
                layoutParams = LinearLayout.LayoutParams(0, dp(40), 1f)
                setOnClickListener {
                    if (confirmada) mostrarDialogCerrar(alerta)
                    else confirmarLectura(alerta, this)
                }
            }
            botones.addView(btnAccion)
            card.addView(botones)
            if (confirmada) {
                val responsable = alerta.responsable?.nombre_completo?.takeIf { it.isNotBlank() }
                card.addView(texto(
                    if (responsable != null) "Lectura confirmada por: $responsable"
                    else "Lectura confirmada · En proceso",
                    11f, "#176747", false, 6
                ))
            }
        }

        return card
    }

    private fun fechaEncabezado(fecha: String?): String {
        if (fecha.isNullOrBlank()) return "SIN FECHA"
        return try {
            val dia = java.time.Instant.parse(fecha)
                .atZone(java.time.ZoneId.systemDefault()).toLocalDate()
            java.time.format.DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale("es", "CO"))
                .format(dia).uppercase(Locale("es", "CO"))
        } catch (_: Exception) {
            fecha.take(10)
        }
    }

    private fun formatearFechaAlerta(fecha: String): String {
        return try {
            val instante = java.time.Instant.parse(fecha)
            val formato = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.getDefault())
            formato.withZone(java.time.ZoneId.systemDefault()).format(instante)
        } catch (_: Exception) {
            fecha.take(16).replace('T', ' ')
        }
    }

    private fun confirmarLectura(alerta: AlertaResponse, boton: MaterialButton) {
        boton.isEnabled = false
        boton.text = "Confirmando…"
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val respuesta = RetrofitClient.api.aceptarAlerta(alerta.id)
                if (!respuesta.isSuccessful) {
                    throw IllegalStateException("El servidor respondió HTTP ${respuesta.code()}")
                }
                val confirmada = respuesta.body()
                    ?: throw IllegalStateException("El servidor no devolvió la alerta confirmada")
                if (!confirmada.estado.equals("en_proceso", ignoreCase = true)) {
                    throw IllegalStateException("El servidor no confirmó la lectura")
                }
                alertas = alertas.map { if (it.id == alerta.id) confirmada else it }
                if (_binding != null) {
                    actualizarResumen()
                    mostrarLista()
                }
                if (isAdded) Toast.makeText(requireContext(), "Lectura confirmada. Ya puedes cerrar la alerta.", Toast.LENGTH_SHORT).show()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (isAdded) Toast.makeText(requireContext(), "No se pudo confirmar: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                boton.isEnabled = true
                boton.text = "Confirmar lectura"
            }
        }
    }

    private fun etiquetaTipoAlerta(tipo: String): String {
        return when (tipo.trim().lowercase(Locale.ROOT)) {
            "desvio_peso" -> "Desvío de peso"
            "temperatura_alta" -> "Temperatura alta"
            "temperatura_baja" -> "Temperatura baja"
            "humedad_alta" -> "Humedad alta"
            "humedad_baja" -> "Humedad baja"
            "co2_alto", "co₂_alto" -> "CO₂ alto"
            "amoniaco_alto", "amoníaco_alto", "nh3_alto" -> "Amoníaco alto"
            else -> tipo.replace('_', ' ').replaceFirstChar {
                if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString()
            }
        }
    }

    private fun crearBadgeEstadoAlerta(estado: String): TextView {
        val cerrado = estado == "cerrada"
        val fondo = if (cerrado) "#E2F2E8" else "#FDE8E7"
        val color = if (cerrado) "#1F5C42" else "#C62828"
        return TextView(requireContext()).apply {
            text = if (cerrado) "Cerrada" else if (estado == "en_proceso") "En proceso" else "Abierta"
            setTextColor(ColoresAdaptativos.texto(requireContext(), color))
            textSize = 11f
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(dp(10), dp(5), dp(10), dp(5))
            background = roundedBackground(ColoresAdaptativos.superficie(requireContext(), fondo), Color.TRANSPARENT, 20)
        }
    }

    private fun mostrarDialogCerrar(alerta: AlertaResponse) {
        val context = requireContext()
        val tarjeta = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(20), dp(20), dp(18))
            background = roundedBackground(ColoresAdaptativos.superficie(requireContext(), "#FFFFFF"), Color.parseColor("#D8E7DE"), 20)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        tarjeta.addView(texto("AVISENS · ALERTAS", 10f, "#176747", true))
        tarjeta.addView(texto("Cerrar alerta", 21f, "#183C2E", true, 5))
        tarjeta.addView(
            texto(
                "Registra la acción correctiva realizada antes de cerrar esta alerta.",
                13f,
                "#66756D",
                false,
                5
            )
        )


        tarjeta.addView(texto("Acción correctiva (obligatoria)", 12f, "#183C2E", true, 15))
        val input = EditText(context).apply {
            hint = "Ej. Se ajustó la ventilación y se verificó la lectura."
            inputType = InputType.TYPE_CLASS_TEXT or
                    InputType.TYPE_TEXT_FLAG_CAP_SENTENCES or
                    InputType.TYPE_TEXT_FLAG_MULTI_LINE
            minLines = 3
            maxLines = 5
            gravity = Gravity.TOP or Gravity.START
            textSize = 14f
            setTextColor(androidx.core.content.ContextCompat.getColor(context, R.color.adaptive_text_183c2e))
            setHintTextColor(ColoresAdaptativos.texto(requireContext(), "#8A9890"))
            setPadding(dp(12), dp(12), dp(12), dp(12))
            background = roundedBackground(ColoresAdaptativos.superficie(requireContext(), "#FFFFFF"), Color.parseColor("#BFD6C7"), 10)
        }
        tarjeta.addView(
            input,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(112)
            ).apply { topMargin = dp(7) }
        )

        val filaBotones = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val botonCancelar = MaterialButton(context).apply {
            text = "Cancelar"
            isAllCaps = false
            textSize = 13f
            setTextColor(androidx.core.content.ContextCompat.getColor(context, R.color.cancel_text))
            backgroundTintList = android.content.res.ColorStateList.valueOf(androidx.core.content.ContextCompat.getColor(context, R.color.cancel_background))
            strokeWidth = 0
            cornerRadius = dp(10)
            minWidth = 0
            minHeight = 0
            insetTop = 0
            insetBottom = 0
            layoutParams = LinearLayout.LayoutParams(0, dp(44), 1f)
        }
        val botonConfirmar = MaterialButton(context).apply {
            text = "Confirmar cierre"
            isAllCaps = false
            textSize = 13f
            setTextColor(Color.WHITE)
            backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#176747"))
            cornerRadius = dp(10)
            minWidth = 0
            minHeight = 0
            insetTop = 0
            insetBottom = 0
            layoutParams = LinearLayout.LayoutParams(0, dp(44), 1f).apply {
                marginStart = dp(8)
            }
        }
        filaBotones.addView(botonCancelar)
        filaBotones.addView(botonConfirmar)
        tarjeta.addView(
            filaBotones,
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(16) }
        )

        val dialog = Dialog(context)
        dialog.setContentView(tarjeta)
        dialog.setCancelable(true)
        dialog.setCanceledOnTouchOutside(false)
        dialog.window?.apply {
            setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
            setDimAmount(0.35f)
        }
        dialog.show()
        val dialogWidth = (resources.displayMetrics.widthPixels - dp(32)).coerceAtMost(dp(440))
        dialog.window?.apply {
            setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            setLayout(dialogWidth, WindowManager.LayoutParams.WRAP_CONTENT)
        }

        botonCancelar.setOnClickListener { dialog.dismiss() }
        botonConfirmar.setOnClickListener {
            val accion = input.text?.toString()?.trim().orEmpty()
            if (accion.isBlank()) {
                input.error = "Describe la acción correctiva para continuar"
                input.requestFocus()
                return@setOnClickListener
            }
            input.error = null
            ejecutarCerrar(alerta, accion, dialog, botonConfirmar)
        }
    }

    private fun ejecutarCerrar(
        alerta: AlertaResponse,
        accion: String,
        dialog: Dialog,
        botonConfirmar: Button
    ) {
        botonConfirmar.isEnabled = false
        botonConfirmar.text = "Cerrando…"

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.cerrarAlerta(
                    alerta.id,
                    CerrarAlertaRequest(accion_correctiva = accion)
                )
                if (!response.isSuccessful) {
                    val detalleServidor = try {
                        response.errorBody()?.string()?.take(240)
                    } catch (_: Exception) {
                        null
                    }
                    throw IllegalStateException(
                        detalleServidor?.takeIf { it.isNotBlank() }
                            ?: "El servidor respondió HTTP ${response.code()}."
                    )
                }

                val respuestaActualizada = response.body()
                if (respuestaActualizada != null &&
                    !respuestaActualizada.estado.equals("cerrada", ignoreCase = true)
                ) {
                    throw IllegalStateException(
                        "El servidor no confirmó el estado de alerta cerrada."
                    )
                }

                val alertaCerrada = respuestaActualizada
                    ?: alerta.copy(estado = "cerrada", accion_correctiva = accion)
                alertas = alertas.map { actual ->
                    if (actual.id == alerta.id) alertaCerrada else actual
                }

                if (dialog.isShowing) dialog.dismiss()
                if (_binding != null) {
                    // Conservar la pestaña actual: las escaladas cerradas siguen visibles.
                    actualizarResumen()
                    pintarTabs()
                    mostrarLista()
                    // Sincronizar nuevamente con el servidor después del cierre.
                    cargarAlertas(silenciosa = true)
                }
                Toast.makeText(
                    requireContext(),
                    "Alerta cerrada correctamente.",
                    Toast.LENGTH_LONG
                ).show()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (dialog.isShowing) {
                    botonConfirmar.isEnabled = true
                    botonConfirmar.text = "Confirmar cierre"
                }
                if (isAdded) {
                    Toast.makeText(
                        requireContext(),
                        "No se pudo cerrar la alerta: ${e.message ?: "error de conexión"}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    private fun mostrarDialogEscalar(alerta: AlertaResponse) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.listarUsuarios(page = 1, limit = 100)
                if (!response.isSuccessful) throw IllegalStateException("Código ${response.code()}")
                val usuarios = response.body()?.data.orEmpty().filter { it.activo }

                if (usuarios.isEmpty()) {
                    Toast.makeText(requireContext(), "No hay usuarios disponibles para escalar", Toast.LENGTH_LONG).show()
                    return@launch
                }

                val nombres = usuarios.map { "${it.nombre_completo} · ${it.rol.nombre}" }.toTypedArray()
                AlertDialog.Builder(requireContext())
                    .setTitle("Escalar alerta")
                    .setItems(nombres) { _, which ->
                        ejecutarEscalar(alerta.id, usuarios[which].id)
                    }
                    .setNegativeButton("Cancelar", null)
                    .show().getButton(AlertDialog.BUTTON_NEGATIVE).apply {
                        setTextColor(androidx.core.content.ContextCompat.getColor(context, R.color.cancel_text))
                        backgroundTintList = android.content.res.ColorStateList.valueOf(androidx.core.content.ContextCompat.getColor(context, R.color.cancel_background))
                        background = roundedBackground(androidx.core.content.ContextCompat.getColor(context, R.color.cancel_background), androidx.core.content.ContextCompat.getColor(context, R.color.cancel_background), 10)
                    }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "No se pudo cargar los usuarios: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun ejecutarEscalar(alertaId: Int, usuarioId: Int) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.escalarAlerta(alertaId, usuarioId)
                if (!response.isSuccessful) throw IllegalStateException("Código ${response.code()}")
                Toast.makeText(requireContext(), "Alerta escalada correctamente", Toast.LENGTH_SHORT).show()
                cargarAlertas()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "No se pudo escalar la alerta: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun texto(
        contenido: String,
        tamano: Float,
        color: String,
        negrita: Boolean,
        marginTop: Int = 0
    ): TextView = TextView(requireContext()).apply {
        text = contenido
        textSize = tamano
        setTextColor(ColoresAdaptativos.texto(requireContext(), color))
        if (negrita) setTypeface(typeface, Typeface.BOLD)
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(marginTop) }
    }

    private fun roundedBackground(fillColor: Int, strokeColor: Int, radiusDp: Int): GradientDrawable =
        GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(fillColor)
            cornerRadius = dp(radiusDp).toFloat()
            if (strokeColor != Color.TRANSPARENT) setStroke(dp(1), strokeColor)
        }

    private fun formatearValor(valor: Double): String {
        return if (valor % 1.0 == 0.0) valor.toInt().toString() else String.format(Locale.US, "%.1f", valor)
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    override fun onDestroyView() {
        selectorAnimado = null
        super.onDestroyView()
        _binding = null
    }
}