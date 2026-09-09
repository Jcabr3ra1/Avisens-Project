package com.project.avisensandroid.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.model.GranjaResponse
import kotlinx.coroutines.launch

class GranjasPropietarioFragment : Fragment() {
    private lateinit var container: LinearLayout
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.fragment_granjas_propietario, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        this.container = view.findViewById(R.id.containerGranjas)
        cargarGranjas()
    }

    private fun cargarGranjas() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.listarGranjas(page = 1, limit = 100)
                if (!response.isSuccessful) {
                    Toast.makeText(requireContext(), "No se pudieron cargar las granjas. Código: ${response.code()}", Toast.LENGTH_LONG).show(); return@launch
                }
                mostrar(response.body()?.data.orEmpty().filter { it.activa })
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Error al cargar granjas: ${e.message ?: "desconocido"}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun mostrar(granjas: List<GranjaResponse>) {
        container.removeAllViews()
        if (granjas.isEmpty()) {
            container.addView(TextView(requireContext()).apply { text = "No tienes granjas disponibles."; textSize = 16f; setPadding(0, 30, 0, 30) }); return
        }
        granjas.forEach { granja ->
            val card = LinearLayout(requireContext()).apply { orientation = LinearLayout.VERTICAL; setPadding(22, 20, 22, 20); setBackgroundResource(R.drawable.bg_card_simple) }
            card.addView(TextView(requireContext()).apply { text = granja.nombre; textSize = 19f })
            card.addView(TextView(requireContext()).apply { text = "Granja #${granja.id}"; textSize = 13f })
            container.addView(card, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 14 })
        }
    }
}
