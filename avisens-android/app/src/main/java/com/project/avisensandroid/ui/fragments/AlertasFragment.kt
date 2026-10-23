package com.project.avisensandroid.ui.fragments

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
import com.project.avisensandroid.model.AlertaResponse
import com.project.avisensandroid.model.CerrarAlertaRequest
import com.project.avisensandroid.model.PaginatedResponse
import com.project.avisensandroid.model.UsuarioGestionResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.util.Locale

class AlertasFragment : BaseBottomNavFragment() {

    private var _binding: Po05AlertasOpBinding? = null
    private val binding get() = _binding!!

    private var alertas: List<AlertaResponse> = emptyList()
    private var mostrandoHistorial = false

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
            mostrandoHistorial = false
            pintarTabs()
            mostrarLista()
        }

        binding.tabHistorial.setOnClickListener {
            mostrandoHistorial = true
            pintarTabs()
            mostrarLista()
        }

        cargarAlertas()
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) cargarAlertas()
    }

    private fun cargarAlertas() {
        val galponId = (activity as? MainActivity)?.obtenerGalponSeleccionadoId()
        if (galponId == null) {
            alertas = emptyList()
            binding.tvResumenAlertas.text = "Selecciona un galpón desde Inicio"
            actualizarResumen()
            mostrarLista()
            return
        }

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                binding.tvResumenAlertas.text = "Cargando alertas del galpón seleccionado..."
                val response = RetrofitClient.api.listarAlertasDeGalpon(
                    galponId = galponId,
                    page = 1,
                    limit = 100
                )

                if (!response.isSuccessful) {
                    throw IllegalStateException("Código ${response.code()}")
                }

                alertas = response.body()?.data ?: emptyList()
                actualizarResumen()
                mostrarLista()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (_binding != null) {
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
        val activas = alertas.count { it.estado != "cerrada" }
        val historial = alertas.count { it.estado == "cerrada" }
        val criticas = alertas.count {
            it.criticidad.equals("alta", true) || it.criticidad.equals("critica", true)
        }
        val advertencias = (activas - criticas).coerceAtLeast(0)

        binding.tvBadgeActivas.text = activas.toString()
        binding.tvBadgeHistorial.text = historial.toString()
        binding.tvCriticas.text = "●  $criticas críticas"
        binding.tvAdvertencias.text = "●  $advertencias advertencias"
        binding.tvResumenAlertas.text =
            if (activas == 1) "1 alerta activa en el galpón seleccionado"
            else "$activas alertas activas en el galpón seleccionado"
    }

    private fun pintarTabs() {
        binding.tabActivas.setBackgroundResource(
            if (!mostrandoHistorial) R.drawable.bg_tab_selected else R.drawable.bg_tabs
        )
        binding.tabHistorial.setBackgroundResource(
            if (mostrandoHistorial) R.drawable.bg_tab_selected else R.drawable.bg_tabs
        )
        binding.tvTituloListaAlertas.text =
            if (mostrandoHistorial) "Historial de alertas" else "Alertas activas"
    }

    private fun mostrarLista() {
        if (_binding == null) return
        binding.containerAlertas.removeAllViews()

        val filtradas = if (mostrandoHistorial) {
            alertas.filter { it.estado == "cerrada" }
        } else {
            alertas.filter { it.estado != "cerrada" }
        }

        if (filtradas.isEmpty()) {
            binding.containerAlertas.addView(
                texto(
                    if (mostrandoHistorial) "No hay alertas cerradas para este galpón."
                    else "No hay alertas activas para este galpón.",
                    13f,
                    "#78847E",
                    false
                )
            )
            return
        }

        filtradas.forEachIndexed { index, alerta ->
            binding.containerAlertas.addView(crearTarjetaAlerta(alerta))
            if (index < filtradas.lastIndex) {
                binding.containerAlertas.addView(
                    View(requireContext()).apply {
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            dp(8)
                        )
                    }
                )
            }
        }
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

        val nombreGalpon = alerta.galpon?.let { "${it.nombre} (${it.codigo})" } ?: "Galpón ${alerta.galpon_id}"
        fila.addView(
            texto(
                "●  $nombreGalpon",
                12f,
                "#5D6862",
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
                "#183C2E",
                true,
                7
            )
        )

        val umbral = alerta.valor_umbral?.let { formatearValor(it) }
        val detalle = when {
            alerta.mensaje?.isNotBlank() == true -> alerta.mensaje
            umbral != null -> "Umbral: $umbral"
            else -> "Sin detalle adicional"
        }
        card.addView(texto(detalle ?: "", 12f, "#78847E", false, 3))

        if (umbral != null && alerta.valor_detectado != null) {
            card.addView(
                texto(
                    "Valor detectado: ${formatearValor(alerta.valor_detectado)} · Umbral: $umbral",
                    11f,
                    if (critica) "#E53935" else "#A56B12",
                    true,
                    4
                )
            )
        }

        val fecha = alerta.fecha_creacion?.take(10)
        if (!fecha.isNullOrBlank()) {
            card.addView(texto("Fecha: $fecha", 11f, "#78847E", false, 5))
        }

        if (alerta.estado != "cerrada") {
            val botones = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    dp(40)
                ).apply { topMargin = dp(10) }
            }

            val btnEscalar = MaterialButton(requireContext()).apply {
                text = "Escalar"
                isAllCaps = false
                textSize = 12f
                setTextColor(Color.parseColor("#6D4C1D"))
                backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#FFF0D8"))
                cornerRadius = dp(9)
                minWidth = 0
                minHeight = 0
                insetTop = 0
                insetBottom = 0
                layoutParams = LinearLayout.LayoutParams(0, dp(40), 1f)
                setOnClickListener { mostrarDialogEscalar(alerta) }
            }

            val espacio = View(requireContext()).apply {
                layoutParams = LinearLayout.LayoutParams(dp(8), 1)
            }

            val btnCerrar = MaterialButton(requireContext()).apply {
                text = "Cerrar alerta"
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
                setOnClickListener { mostrarDialogCerrar(alerta) }
            }

            botones.addView(btnEscalar)
            botones.addView(espacio)
            botones.addView(btnCerrar)
            card.addView(botones)
        }

        return card
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
            setTextColor(Color.parseColor(color))
            textSize = 11f
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(dp(10), dp(5), dp(10), dp(5))
            background = roundedBackground(Color.parseColor(fondo), Color.TRANSPARENT, 20)
        }
    }

    private fun mostrarDialogCerrar(alerta: AlertaResponse) {
        val context = requireContext()
        val tarjeta = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(20), dp(20), dp(18))
            background = roundedBackground(Color.WHITE, Color.parseColor("#D8E7DE"), 20)
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
            setTextColor(Color.parseColor("#183C2E"))
            setHintTextColor(Color.parseColor("#8A9890"))
            setPadding(dp(12), dp(12), dp(12), dp(12))
            background = roundedBackground(Color.WHITE, Color.parseColor("#BFD6C7"), 10)
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
            setTextColor(Color.parseColor("#176747"))
            backgroundTintList = android.content.res.ColorStateList.valueOf(Color.WHITE)
            setStrokeColor(android.content.res.ColorStateList.valueOf(Color.parseColor("#BFD6C7")))
            strokeWidth = dp(1)
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
                    actualizarResumen()
                    mostrarLista()
                }
                Toast.makeText(
                    requireContext(),
                    "Alerta cerrada correctamente y añadida al historial.",
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
                    .show()
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
        setTextColor(Color.parseColor(color))
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
        super.onDestroyView()
        _binding = null
    }
}