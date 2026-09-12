package com.project.avisensandroid.ui.fragments

import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.databinding.Po01InicioOpBinding
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.GranjaResponse
import com.project.avisensandroid.model.UserSession
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.launch

/**
 * Inicio compartido por Operario y Propietario.
 * Toda la información variable se obtiene de la API:
 * usuario, rol, granjas y galpones.
 */
class InicioFragment : BaseBottomNavFragment() {

    private var _binding: Po01InicioOpBinding? = null
    private val binding get() = _binding!!

    private var granjas: List<GranjaResponse> = emptyList()
    private var galpones: List<GalponResponse> = emptyList()
    private var granjaSeleccionada: GranjaResponse? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po01InicioOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val activity = requireActivity() as MainActivity
        configurarBottomNav(R.id.nav_inicio)

        configurarEncabezado(activity)

        // El Propietario conserva el inicio enfocado en la granja.
        // Las tarjetas adicionales pertenecen al flujo visual del Operario.
        binding.operatorStatsContainer.visibility =
            if (UserSession.role(activity) == com.project.avisensandroid.model.UserRole.PROPIETARIO) {
                View.GONE
            } else {
                View.VISIBLE
            }

        // El mismo FrameLayout de perfil abre Configuración para ambos roles.
        binding.btnPerfil.setOnClickListener {
            activity.mostrarConfiguracion()
        }

        cargarDatosIniciales()
    }

    private fun configurarEncabezado(activity: MainActivity) {
        binding.txtNombreUsuario.text = UserSession.name(activity)
        binding.txtRolUsuario.text = UserSession.role(activity)?.displayName ?: "Usuario"
        binding.txtSaludo.text = obtenerSaludo()
    }

    private fun obtenerSaludo(): String {
        return when (java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)) {
            in 5..11 -> "Buenos días"
            in 12..17 -> "Buenas tardes"
            else -> "Buenas noches"
        }
    }

    private fun cargarDatosIniciales() {
        val activity = requireActivity() as MainActivity

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val responseGranjas = activity.obtenerGranjas()
                if (!responseGranjas.isSuccessful) {
                    mostrarMensaje("No se pudieron cargar las granjas (${responseGranjas.code()})")
                    return@launch
                }

                granjas = responseGranjas.body()?.data.orEmpty().filter { it.activa }

                val responseGalpones = activity.obtenerGalpones()
                if (!responseGalpones.isSuccessful) {
                    mostrarMensaje("No se pudieron cargar los galpones (${responseGalpones.code()})")
                    return@launch
                }

                galpones = responseGalpones.body()?.data.orEmpty().filter { it.activo }

                configurarSpinnerGranjas()

                if (granjas.isEmpty()) {
                    granjaSeleccionada = null
                    activity.limpiarGranjaSeleccionada()
                    binding.txtCantidadGalpones.text = "0 galpones"
                    binding.containerGalpones.removeAllViews()
                    mostrarMensaje("No hay granjas activas disponibles")
                    return@launch
                }

                val idGuardado = activity.obtenerGranjaSeleccionadaId()
                val seleccionInicial = granjas.firstOrNull { it.id == idGuardado } ?: granjas.first()
                seleccionarGranjaEnInicio(seleccionInicial)

            } catch (e: Exception) {
                mostrarMensaje("Error al cargar inicio: ${e.message ?: "error desconocido"}")
            }
        }
    }

    private fun configurarSpinnerGranjas() {
        val nombres = granjas.map { it.nombre }
        val adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            nombres
        )
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        binding.spinnerGranjas.adapter = adapter

        binding.spinnerGranjas.onItemSelectedListener =
            object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: AdapterView<*>?,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    if (position in granjas.indices) {
                        seleccionarGranjaEnInicio(granjas[position])
                    }
                }

                override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            }
    }

    private fun seleccionarGranjaEnInicio(granja: GranjaResponse) {
        granjaSeleccionada = granja

        val activity = requireActivity() as MainActivity
        activity.seleccionarGranja(granja.id)

        val posicion = granjas.indexOfFirst { it.id == granja.id }
        if (posicion >= 0 && binding.spinnerGranjas.selectedItemPosition != posicion) {
            binding.spinnerGranjas.setSelection(posicion, false)
        }

        mostrarGalponesDeGranja(granja.id)
    }

    private fun mostrarGalponesDeGranja(granjaId: Int) {
        val galponesDeGranja = galpones.filter { it.granja.id == granjaId }

        binding.txtCantidadGalpones.text = when (galponesDeGranja.size) {
            1 -> "1 galpón"
            else -> "${galponesDeGranja.size} galpones"
        }

        binding.containerGalpones.removeAllViews()

        if (galponesDeGranja.isEmpty()) {
            binding.containerGalpones.addView(
                TextView(requireContext()).apply {
                    text = "No hay galpones activos"
                    textSize = 12f
                    setTextColor(Color.WHITE)
                    gravity = Gravity.CENTER_VERTICAL
                },
                LinearLayout.LayoutParams(dp(150), dp(42))
            )
            return
        }

        galponesDeGranja.forEachIndexed { index, galpon ->
            if (index > 0) {
                binding.containerGalpones.addView(
                    View(requireContext()),
                    LinearLayout.LayoutParams(dp(8), dp(1))
                )
            }
            binding.containerGalpones.addView(crearChipGalpon(galpon, index == 0))
        }
    }

    private fun crearChipGalpon(galpon: GalponResponse, seleccionadoInicial: Boolean): View {
        val chip = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                dp(42)
            )
            setPadding(dp(14), 0, dp(16), 0)
            isClickable = true
            isFocusable = true
        }

        val punto = View(requireContext()).apply {
            layoutParams = LinearLayout.LayoutParams(dp(8), dp(8))
            setBackgroundResource(R.drawable.dot_galpon_selected)
            visibility = if (seleccionadoInicial) View.VISIBLE else View.GONE
        }

        val texto = TextView(requireContext()).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { marginStart = dp(8) }
            text = "${galpon.nombre} · ${galpon.codigo}"
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
        }

        chip.addView(punto)
        chip.addView(texto)
        aplicarFondoChip(chip, seleccionadoInicial)

        chip.setOnClickListener {
            for (i in 0 until binding.containerGalpones.childCount) {
                val child = binding.containerGalpones.getChildAt(i)
                if (child is LinearLayout && child !== chip) {
                    aplicarFondoChip(child, false)
                    if (child.childCount > 0) child.getChildAt(0).visibility = View.GONE
                }
            }
            aplicarFondoChip(chip, true)
            punto.visibility = View.VISIBLE
            Toast.makeText(requireContext(), "${galpon.nombre} - ${galpon.codigo}", Toast.LENGTH_SHORT).show()
        }

        return chip
    }

    private fun aplicarFondoChip(chip: LinearLayout, seleccionado: Boolean) {
        chip.setBackgroundResource(
            if (seleccionado) {
                R.drawable.bg_galpon_selected
            } else {
                R.drawable.bg_galpon_unselected
            }
        )
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    private fun mostrarMensaje(mensaje: String) {
        if (isAdded) {
            Toast.makeText(requireContext(), mensaje, Toast.LENGTH_LONG).show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
