package com.project.avisensandroid.ui.fragments

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
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class BitacoraConsumoFragment : BaseBottomNavFragment() {

    private var _binding: Po08BitacoraConsumoOpBinding? = null
    private val binding get() = _binding!!

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

        binding.btnMortalidad.setOnClickListener {
            activity.mostrarFragment(BitacoraFragment())
        }

        binding.btnEnfermo.setOnClickListener {
            activity.mostrarFragment(BitacoraEnfermoFragment())
        }
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) {
            cargarConsumos()
        }
    }

    private fun cargarConsumos() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val activity = requireActivity() as MainActivity
                val galponId = activity.obtenerGalponSeleccionadoId()

                if (galponId == null) {
                    mostrarRegistros(emptyList())
                    return@launch
                }

                val idsLotes = activity.obtenerIdsLotesDeGalponSeleccionado()
                if (idsLotes.isEmpty()) {
                    mostrarRegistros(emptyList())
                    return@launch
                }

                val consumos = mutableListOf<ConsumoDiarioResponse>()
                var pagina = 1
                var totalPaginas = 1

                do {
                    val response = RetrofitClient.api.listarConsumosDiarios(
                        page = pagina,
                        limit = 100
                    )

                    if (!response.isSuccessful) {
                        Toast.makeText(
                            requireContext(),
                            "No se pudieron cargar los consumos. Código: ${response.code()}",
                            Toast.LENGTH_LONG
                        ).show()
                        return@launch
                    }

                    val body = response.body()
                    if (body == null) {
                        Toast.makeText(
                            requireContext(),
                            "La API no devolvió registros de consumo",
                            Toast.LENGTH_LONG
                        ).show()
                        return@launch
                    }

                    consumos += body.data
                    totalPaginas = body.meta.totalPages.coerceAtLeast(pagina)
                    pagina++
                } while (pagina <= totalPaginas)

                val filtrados = consumos
                    .filter { it.lote_id in idsLotes }
                    .sortedByDescending { it.fecha }

                mostrarRegistros(filtrados)

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
                        setBackgroundColor(Color.parseColor("#EEEEEE"))
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
            setTextColor(Color.parseColor("#89938E"))
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
            setTextColor(Color.parseColor("#69746F"))
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
        super.onDestroyView()
        _binding = null
    }
}
