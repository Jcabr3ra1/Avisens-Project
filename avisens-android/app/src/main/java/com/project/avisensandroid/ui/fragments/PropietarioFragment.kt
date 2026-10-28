package com.project.avisensandroid.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.model.GranjaResponse
import com.project.avisensandroid.model.UserSession
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.launch

class PropietarioFragment : BaseBottomNavFragment() {

    private lateinit var containerGranjas: LinearLayout

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.fragment_propietario, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val activity = requireActivity() as MainActivity
        configurarBottomNav(R.id.nav_inicio)

        view.findViewById<TextView>(R.id.txtNombrePropietario).text = UserSession.name(activity)
        view.findViewById<TextView>(R.id.txtCorreoPropietario).text = UserSession.email(activity)
        containerGranjas = view.findViewById(R.id.containerGranjasPropietario)

        view.findViewById<View>(R.id.btnCerrarSesionPropietario).setOnClickListener {
            activity.cerrarSesionDesdeRol()
        }

        cargarGranjas()
    }

    private fun cargarGranjas() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.listarGranjas(page = 1, limit = 100)
                if (!response.isSuccessful) {
                    mostrarMensaje("No se pudieron cargar las granjas (${response.code()})")
                    return@launch
                }
                mostrarGranjas(response.body()?.data.orEmpty().filter { it.activa })
            } catch (e: Exception) {
                mostrarMensaje("No se pudieron cargar las granjas")
            }
        }
    }

    private fun mostrarGranjas(granjas: List<GranjaResponse>) {
        containerGranjas.removeAllViews()
        if (granjas.isEmpty()) {
            containerGranjas.addView(TextView(requireContext()).apply {
                text = "No tienes granjas disponibles."
                textSize = 15f
                setPadding(0, 12, 0, 12)
            })
            return
        }

        granjas.forEach { granja ->
            val card = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(22, 18, 22, 18)
                setBackgroundResource(R.drawable.bg_card_simple)
            }
            card.addView(TextView(requireContext()).apply {
                text = granja.nombre
                textSize = 19f
                setTextColor(resources.getColor(R.color.text_primary, null))
            })
            card.addView(TextView(requireContext()).apply {
                text = "Granja #${granja.id}"
                textSize = 13f
                setTextColor(resources.getColor(R.color.text_secondary, null))
            })
            containerGranjas.addView(card, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 12 })
        }
    }

    private fun mostrarMensaje(mensaje: String) {
        if (isAdded) Toast.makeText(requireContext(), mensaje, Toast.LENGTH_LONG).show()
    }
}
