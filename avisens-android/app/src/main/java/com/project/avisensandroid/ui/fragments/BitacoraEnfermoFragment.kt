package com.project.avisensandroid.ui.fragments

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.google.android.material.button.MaterialButton
import com.project.avisensandroid.R
import com.project.avisensandroid.databinding.Po07BitacoraEnfermoOpBinding
import com.project.avisensandroid.ui.MainActivity
import androidx.core.os.bundleOf

class BitacoraEnfermoFragment : BaseBottomNavFragment() {

    private var _binding: Po07BitacoraEnfermoOpBinding? = null
    private val binding get() = _binding!!

    private data class SeguimientoDemo(
        val fecha: String,
        val aves: Int,
        val estado: String,
        val observacion: String
    )

    private data class CasoDemo(
        val id: Int,
        val lote: String,
        val galpon: String,
        val avesIniciales: Int,
        val diagnostico: String,
        val seguimientos: List<SeguimientoDemo>
    )

    private val casosDemo = mutableListOf(
        CasoDemo(
            id = 1,
            lote = "LOT-2026-000001",
            galpon = "Galpón Norte",
            avesIniciales = 12,
            diagnostico = "Problema respiratorio",
            seguimientos = listOf(
                SeguimientoDemo("15/09", 12, "En tratamiento", "Se inicia tratamiento indicado."),
                SeguimientoDemo("16/09", 8, "Recuperación", "Disminuyeron los síntomas."),
                SeguimientoDemo("17/09", 3, "Recuperación", "Evolución favorable.")
            )
        ),
        CasoDemo(
            id = 2,
            lote = "LOT-2026-000002",
            galpon = "Galpón Norte",
            avesIniciales = 5,
            diagnostico = "Decaimiento",
            seguimientos = listOf(
                SeguimientoDemo("17/09", 5, "Pendiente", "Se detectaron aves con bajo consumo."),
                SeguimientoDemo("18/09", 0, "Finalizado", "Caso cerrado tras la recuperación de las aves.")
            )
        )
    )

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po07BitacoraEnfermoOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        configurarBottomNav(R.id.nav_bitacora)

        parentFragmentManager.setFragmentResultListener(
            "seguimiento_demo_guardado",
            viewLifecycleOwner
        ) { _, data ->
            val loteId = data.getInt("lote_id", -1)
            val lote = data.getString("lote").orEmpty()
            val fecha = data.getString("fecha").orEmpty()
            val aves = data.getInt("aves", -1)
            val estado = data.getString("estado").orEmpty()
            val observacion = data.getString("observacion").orEmpty()

            if (loteId != -1 && lote.isNotBlank() && fecha.isNotBlank() && aves >= 0 && estado.isNotBlank()) {
                val index = casosDemo.indexOfFirst { it.lote.equals(lote, ignoreCase = true) }
                if (index >= 0) {
                    casosDemo[index] = casosDemo[index].copy(
                        seguimientos = casosDemo[index].seguimientos +
                                SeguimientoDemo(fecha, aves, estado, observacion.ifBlank { "Sin observaciones." })
                    )
                    construirCasosDemo()
                }
            }
        }

        construirCasosDemo()

        binding.tbnEnfermo.setOnClickListener {
            (requireActivity() as MainActivity).mostrarFragment(BitacoraFragment())
        }

        binding.tbnConsumo.setOnClickListener {
            (requireActivity() as MainActivity).mostrarFragment(BitacoraConsumoFragment())
        }

        binding.btnRegistrarEvento.setOnClickListener {
            (requireActivity() as MainActivity).mostrarDialogRegistrarSeguimientoSanitario()
        }
    }

    private fun construirCasosDemo() {
        val contenedor = binding.containerRegistros
        contenedor.removeAllViews()
        contenedor.background = null
        contenedor.setPadding(0, 0, 0, 0)

        val casosActivos = casosDemo.count { it.seguimientos.last().estado !in setOf("Finalizado", "Recuperadas") }
        val avesSeguimiento = casosDemo
            .filter { it.seguimientos.last().estado !in setOf("Finalizado", "Recuperadas") }
            .sumOf { it.seguimientos.last().aves }
        binding.tvCasosActivos.text = casosActivos.toString()
        binding.tvAvesSeguimiento.text = avesSeguimiento.toString()

        casosDemo.forEachIndexed { index, caso ->
            contenedor.addView(crearTarjetaCaso(caso))
            if (index < casosDemo.lastIndex) {
                val separador = View(requireContext()).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        dp(10)
                    )
                }
                contenedor.addView(separador)
            }
        }
    }

    private fun crearTarjetaCaso(caso: CasoDemo): View {
        val card = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            background = roundedBackground(Color.WHITE, Color.parseColor("#E5EAE7"), 14)
            setPadding(dp(14), dp(14), dp(14), dp(14))
        }

        val encabezado = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val tituloContenedor = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        tituloContenedor.addView(texto("Caso sanitario #${String.format("%03d", caso.id)}", 16f, "#183C2E", true))
        tituloContenedor.addView(texto("${caso.lote} · ${caso.galpon}", 11f, "#78847E", false, 3))

        val ultimo = caso.seguimientos.last()
        encabezado.addView(tituloContenedor)
        encabezado.addView(crearBadgeEstado(ultimo.estado))
        card.addView(encabezado)

        card.addView(texto("Diagnóstico: ${caso.diagnostico}", 12f, "#4E5B55", false, 10))
        card.addView(texto("Aves afectadas inicialmente: ${caso.avesIniciales}", 11f, "#78847E", false, 4))

        val separador = View(requireContext()).apply {
            setBackgroundColor(Color.parseColor("#E7EEE9"))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(1)
            ).apply { topMargin = dp(12); bottomMargin = dp(10) }
        }
        card.addView(separador)

        card.addView(texto("Seguimiento", 13f, "#1F5C42", true))

        caso.seguimientos.forEach { seguimiento ->
            val fila = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, dp(8), 0, dp(2))
            }

            val info = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            info.addView(texto("${seguimiento.fecha} · ${seguimiento.aves} aves", 12f, "#183C2E", true))
            info.addView(texto(seguimiento.observacion, 11f, "#78847E", false, 3))
            fila.addView(info)
            fila.addView(crearBadgeEstado(seguimiento.estado, pequeño = true))
            card.addView(fila)
        }

        if (ultimo.estado.equals("Finalizado", true) || ultimo.estado.equals("Recuperadas", true)) {
            return card
        }

        val boton = MaterialButton(requireContext()).apply {
            text = "Registrar seguimiento"
            isAllCaps = false
            textSize = 12f
            setTextColor(Color.WHITE)
            backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#2F8B5E"))
            cornerRadius = dp(9)
            minWidth = 0
            minHeight = 0
            insetTop = 0
            insetBottom = 0
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(40)
            ).apply { topMargin = dp(12) }
            setOnClickListener {
                (requireActivity() as MainActivity).mostrarDialogRegistrarSeguimientoSanitario(caso.lote)
            }
        }
        card.addView(boton)

        return card
    }

    private fun crearBadgeEstado(estado: String, pequeño: Boolean = false): TextView {
        val verde = estado.equals("Recuperación", true) || estado.equals("Recuperadas", true)
        val fondo = if (verde) "#E2F2E8" else "#FFF0DD"
        val textoColor = if (verde) "#1F5C42" else "#8A5A1F"

        return TextView(requireContext()).apply {
            text = estado
            setTextColor(Color.parseColor(textoColor))
            textSize = if (pequeño) 10f else 11f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(dp(if (pequeño) 8 else 10), dp(5), dp(if (pequeño) 8 else 10), dp(5))
            background = roundedBackground(Color.parseColor(fondo), Color.TRANSPARENT, 12)
        }
    }

    private fun texto(
        contenido: String,
        tamano: Float,
        color: String,
        negrita: Boolean,
        marginTop: Int = 0
    ): TextView {
        return TextView(requireContext()).apply {
            text = contenido
            textSize = tamano
            setTextColor(Color.parseColor(color))
            if (negrita) setTypeface(typeface, android.graphics.Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(marginTop) }
        }
    }

    private fun roundedBackground(
        fillColor: Int,
        strokeColor: Int,
        radiusDp: Int
    ): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(fillColor)
            cornerRadius = dp(radiusDp).toFloat()
            if (strokeColor != Color.TRANSPARENT) {
                setStroke(dp(1), strokeColor)
            }
        }
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}