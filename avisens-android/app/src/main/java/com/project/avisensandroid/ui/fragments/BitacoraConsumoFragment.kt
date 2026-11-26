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

    private var _binding: Po08BitacoraConsumoOpBinding? = null
    private val binding get() = _binding!!

    private var cargaJob: Job? = null

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

        val activity = requireActivity() as MainActivity
        configurarBottomNav(R.id.nav_bitacora)
        animarPestanaBitacora(binding.tabsBitacora, 2)

        binding.btnMortalidad.setOnClickListener {
            abrirPestanaBitacora(BitacoraFragment(), 2)
        }

        binding.btnEnfermo.setOnClickListener {
            abrirPestanaBitacora(BitacoraEnfermoFragment(), 2)
        }
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) {
            cargarConsumos()
        }
    }

    private fun cargarConsumos() {
        cargaJob?.cancel()
        cargaJob = viewLifecycleOwner.lifecycleScope.launch {
            try {
                val activity = requireActivity() as MainActivity
                val galponId = activity.obtenerGalponSeleccionadoId()
                if (galponId == null) {
                    mostrarRegistros(emptyList())
                    return@launch
                }
                val (consumos, idsLotes) = coroutineScope {
                    val lotesJob = async { activity.obtenerIdsLotesDeGalponSeleccionado() }
                    val consumosJob = async {
                        val datos = mutableListOf<ConsumoDiarioResponse>()
                        var pagina = 1
                        do {
                            val response = RetrofitClient.api.listarConsumosDiarios(pagina, 100)
                            check(response.isSuccessful) { "Error de consumos: ${response.code()}" }
                            val body = checkNotNull(response.body()) { "Sin datos de consumo" }
                            datos.addAll(body.data)
                            val total = body.meta.totalPages.coerceAtLeast(pagina)
                            pagina++
                        } while (pagina <= total)
                        datos
                    }
                    consumosJob.await() to lotesJob.await()
                }
                if (_binding != null && activity.obtenerGalponSeleccionadoId() == galponId) {
                    mostrarRegistros(consumos.filter { it.lote_id in idsLotes }.sortedByDescending { it.fecha })
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

    private fun mostrarRegistros(registros: List<ConsumoDiarioResponse>) {
        binding.containerRegistros.removeAllViews()

        if (registros.isEmpty()) {
            binding.containerRegistros.addView(
                TextView(requireContext()).apply {
                    text = "No hay registros de consumo para el galpón seleccionado"
                    setTextColor(
                        resources.getColor(R.color.text_secondary, requireContext().theme)
                    )
                    textSize = 14f
                    gravity = Gravity.CENTER
                    setPadding(dp(20), dp(40), dp(20), dp(40))
                }
            )
            return
        }

        registros.forEachIndexed { index, consumo ->
            binding.containerRegistros.addView(crearTarjetaConsumo(consumo))
            if (index < registros.lastIndex) {
                binding.containerRegistros.addView(
                    View(requireContext()).apply {
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            dp(1)
                        )
                        setBackgroundColor(ColoresAdaptativos.superficie(requireContext(), "#EEEEEE"))
                    }
                )
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
            )
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
            textSize = 11f
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        filaSuperior.addView(lote)

        val fecha = TextView(requireContext()).apply {
            text = formatearFecha(consumo.fecha)
            setTextColor(androidx.core.content.ContextCompat.getColor(context, R.color.adaptive_text_89938e))
            textSize = 10f
            setTypeface(null, Typeface.BOLD)
        }
        filaSuperior.addView(fecha)
        card.addView(filaSuperior)

        val alimento = consumo.alimento_kg
        val agua = consumo.agua_litros
        val alimentoTexto = alimento?.let { "${formatearNumero(it)} kg alimento" } ?: "Alimento no registrado"

        card.addView(TextView(requireContext()).apply {
            text = alimentoTexto
            setTextColor(resources.getColor(R.color.text_primary, requireContext().theme))
            textSize = 15f
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
            setTextColor(androidx.core.content.ContextCompat.getColor(context, R.color.adaptive_text_69746f))
            textSize = 11f
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