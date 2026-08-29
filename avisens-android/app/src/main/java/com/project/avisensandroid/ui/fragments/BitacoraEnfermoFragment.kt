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
import com.project.avisensandroid.databinding.Po07BitacoraEnfermoOpBinding
import com.project.avisensandroid.model.EventoSanitarioResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.launch

class BitacoraEnfermoFragment : BaseBottomNavFragment() {

    private var _binding: Po07BitacoraEnfermoOpBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po07BitacoraEnfermoOpBinding.inflate(
            inflater,
            container,
            false
        )
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        configurarBottomNav(R.id.nav_bitacora)

        binding.tbnEnfermo.setOnClickListener {
            (requireActivity() as MainActivity).mostrarFragment(
                BitacoraFragment()
            )
        }

        binding.tbnConsumo.setOnClickListener {
            (requireActivity() as MainActivity).mostrarFragment(
                BitacoraConsumoFragment()
            )
        }

        binding.btnRegistrarEvento.setOnClickListener {
            (requireActivity() as MainActivity).mostrarDialogRegistrarTratamiento()
        }
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) {
            cargarBitacora()
        }
    }

    private fun cargarBitacora() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.listarEventosSanitarios(
                    page = 1,
                    limit = 100
                )

                if (!response.isSuccessful) {
                    Toast.makeText(
                        requireContext(),
                        "No se pudieron cargar los registros de enfermos. Código: ${response.code()}",
                        Toast.LENGTH_LONG
                    ).show()
                    return@launch
                }

                val registros = response.body()?.data

                if (registros == null) {
                    Toast.makeText(
                        requireContext(),
                        "La API no devolvió registros de eventos sanitarios",
                        Toast.LENGTH_LONG
                    ).show()
                    return@launch
                }

                mostrarRegistros(registros)

            } catch (e: Exception) {
                if (_binding != null) {
                    Toast.makeText(
                        requireContext(),
                        "Error al cargar la bitácora: ${e.message ?: "error desconocido"}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    private fun mostrarRegistros(registros: List<EventoSanitarioResponse>) {
        binding.containerRegistros.removeAllViews()

        if (registros.isEmpty()) {
            val mensaje = TextView(requireContext()).apply {
                text = "No hay registros de enfermos"
                setTextColor(
                    resources.getColor(
                        R.color.text_secondary,
                        requireContext().theme
                    )
                )
                textSize = 14f
                gravity = Gravity.CENTER
                setPadding(20, 40, 20, 40)
            }

            binding.containerRegistros.addView(mensaje)
            return
        }

        registros.forEachIndexed { index, registro ->
            agregarRegistro(registro)

            if (index < registros.lastIndex) {
                val separador = View(requireContext()).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        1
                    )
                    setBackgroundColor(Color.parseColor("#EEEEEE"))
                }

                binding.containerRegistros.addView(separador)
            }
        }
    }

    private fun agregarRegistro(registro: EventoSanitarioResponse) {
        val contenedor = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 18, 0, 18)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        val filaSuperior = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        val lote = TextView(requireContext()).apply {
            text = registro.lote.codigo
            setTextColor(
                resources.getColor(
                    R.color.text_primary,
                    requireContext().theme
                )
            )
            textSize = 12f
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
            )
        }

        filaSuperior.addView(lote)

        val fecha = TextView(requireContext()).apply {
            text = formatearFecha(registro.fecha)
            setTextColor(
                resources.getColor(
                    R.color.text_secondary,
                    requireContext().theme
                )
            )
            textSize = 11f
            setTypeface(null, Typeface.BOLD)
        }

        filaSuperior.addView(fecha)
        contenedor.addView(filaSuperior)

        val cantidadTexto = registro.cantidad_aves
        if (cantidadTexto != null) {
            val cantidad = TextView(requireContext()).apply {
                text = "$cantidadTexto aves"
                setTextColor(
                    resources.getColor(
                        R.color.text_primary,
                        requireContext().theme
                    )
                )
                textSize = 13f
                setTypeface(null, Typeface.BOLD)
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = 7
                }
            }

            contenedor.addView(cantidad)
        }

        val insumoTexto = registro.insumo?.nombre
        if (!insumoTexto.isNullOrBlank()) {
            val insumo = TextView(requireContext()).apply {
                text = "Insumo: $insumoTexto"
                setTextColor(
                    resources.getColor(
                        R.color.text_secondary,
                        requireContext().theme
                    )
                )
                textSize = 12f
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = 4
                }
            }

            contenedor.addView(insumo)
        }

        val dosisTexto = registro.dosis?.trim()
        val viaTexto = registro.via_aplicacion?.trim()
        if (!dosisTexto.isNullOrBlank() || !viaTexto.isNullOrBlank()) {
            val dosisVia = TextView(requireContext()).apply {
                text = buildString {
                    if (!dosisTexto.isNullOrBlank()) {
                        append("Dosis: $dosisTexto")
                    }
                    if (!viaTexto.isNullOrBlank()) {
                        if (isNotEmpty()) append(" · ")
                        append("Vía: $viaTexto")
                    }
                }
                setTextColor(
                    resources.getColor(
                        R.color.text_secondary,
                        requireContext().theme
                    )
                )
                textSize = 12f
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = 4
                }
            }

            contenedor.addView(dosisVia)
        }

        val diagnosticoTexto = registro.diagnostico?.trim()
        if (!diagnosticoTexto.isNullOrBlank()) {
            val diagnostico = TextView(requireContext()).apply {
                text = "Diagnóstico: $diagnosticoTexto"
                setTextColor(
                    resources.getColor(
                        R.color.text_secondary,
                        requireContext().theme
                    )
                )
                textSize = 12f
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = 4
                }
            }

            contenedor.addView(diagnostico)
        }

        val observacionesTexto = registro.observaciones?.trim()
        if (!observacionesTexto.isNullOrBlank()) {
            val observaciones = TextView(requireContext()).apply {
                text = "Observaciones: $observacionesTexto"
                setTextColor(
                    resources.getColor(
                        R.color.text_secondary,
                        requireContext().theme
                    )
                )
                textSize = 12f
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = 4
                }
            }

            contenedor.addView(observaciones)
        }

        val registradoPor = TextView(requireContext()).apply {
            text = "Registró: Usuario #${registro.usuario_id}"
            setTextColor(
                resources.getColor(
                    R.color.text_secondary,
                    requireContext().theme
                )
            )
            textSize = 11f
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 5
            }
        }

        contenedor.addView(registradoPor)
        binding.containerRegistros.addView(contenedor)
    }

    private fun formatearFecha(fecha: String): String {
        return try {
            val partes = fecha.split("-")
            if (partes.size == 3) {
                "${partes[2]}/${partes[1]}/${partes[0]}"
            } else {
                fecha
            }
        } catch (_: Exception) {
            fecha
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
