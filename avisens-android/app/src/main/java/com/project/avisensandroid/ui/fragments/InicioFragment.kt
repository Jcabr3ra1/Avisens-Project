package com.project.avisensandroid.ui.fragments

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.databinding.Po01InicioOpBinding
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.GranjaResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.launch

class InicioFragment : BaseBottomNavFragment() {

    private var _binding: Po01InicioOpBinding? = null
    private val binding get() = _binding!!

    // =========================================================
    // DATOS
    // =========================================================

    private var granjas: List<GranjaResponse> = emptyList()
    private var galpones: List<GalponResponse> = emptyList()

    private var granjaSeleccionada: GranjaResponse? = null

    // =========================================================
    // CICLO DE VIDA
    // =========================================================

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {

        _binding = Po01InicioOpBinding.inflate(
            inflater,
            container,
            false
        )

        return binding.root
    }

    override fun onViewCreated(
        view: View,
        savedInstanceState: Bundle?
    ) {

        super.onViewCreated(
            view,
            savedInstanceState
        )

        val activity =
            requireActivity() as MainActivity

        // =====================================================
        // BOTTOM NAVIGATION
        // =====================================================

        configurarBottomNav(
            R.id.nav_inicio
        )

        // =====================================================
        // PERFIL
        // =====================================================

        binding.btnPerfil.setOnClickListener {

            activity.mostrarConfiguracion()
        }

        // =====================================================
        // CARGAR DATOS DESDE API
        // =====================================================

        cargarDatosIniciales()
    }

    // =========================================================
    // CARGAR GRANJAS Y GALPONES
    // =========================================================

    private fun cargarDatosIniciales() {

        val activity =
            requireActivity() as MainActivity

        lifecycleScope.launch {

            try {

                // -------------------------------------------------
                // CARGAR GRANJAS
                // -------------------------------------------------

                val responseGranjas =
                    activity.obtenerGranjas()

                if (!responseGranjas.isSuccessful) {

                    Toast.makeText(
                        requireContext(),
                        "No se pudieron cargar las granjas. Código: ${responseGranjas.code()}",
                        Toast.LENGTH_LONG
                    ).show()

                    return@launch
                }

                granjas =
                    responseGranjas.body()
                        ?.data
                        ?.filter { it.activa }
                        ?: emptyList()

                // -------------------------------------------------
                // CARGAR GALPONES
                // -------------------------------------------------

                val responseGalpones =
                    activity.obtenerGalpones()

                if (!responseGalpones.isSuccessful) {

                    Toast.makeText(
                        requireContext(),
                        "No se pudieron cargar los galpones. Código: ${responseGalpones.code()}",
                        Toast.LENGTH_LONG
                    ).show()

                    return@launch
                }

                galpones =
                    responseGalpones.body()
                        ?.data
                        ?.filter { it.activo }
                        ?: emptyList()

                // -------------------------------------------------
                // CONFIGURAR SPINNER
                // -------------------------------------------------

                configurarSpinnerGranjas()

                // -------------------------------------------------
                // MOSTRAR PRIMERA GRANJA
                // -------------------------------------------------

                if (granjas.isNotEmpty()) {

                    granjaSeleccionada =
                        granjas.first()

                    mostrarGalponesDeGranja(
                        granjaSeleccionada!!.id
                    )

                } else {

                    limpiarGalpones()

                    Toast.makeText(
                        requireContext(),
                        "No hay granjas activas disponibles",
                        Toast.LENGTH_SHORT
                    ).show()
                }

            } catch (e: Exception) {

                Toast.makeText(
                    requireContext(),
                    "Error al cargar inicio: ${e.message ?: "error desconocido"}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    // =========================================================
    // SPINNER DE GRANJAS
    // =========================================================

    private fun configurarSpinnerGranjas() {

        val nombresGranjas =
            granjas.map {
                it.nombre
            }

        val adapter =
            ArrayAdapter(
                requireContext(),
                android.R.layout.simple_spinner_item,
                nombresGranjas
            )

        adapter.setDropDownViewResource(
            android.R.layout.simple_spinner_dropdown_item
        )

        binding.spinnerGranjas.adapter =
            adapter

        binding.spinnerGranjas.setSelection(0)

        binding.spinnerGranjas.onItemSelectedListener =
            object :
                android.widget.AdapterView.OnItemSelectedListener {

                override fun onItemSelected(
                    parent: android.widget.AdapterView<*>?,
                    view: View?,
                    position: Int,
                    id: Long
                ) {

                    if (
                        position >= 0 &&
                        position < granjas.size
                    ) {

                        granjaSeleccionada =
                            granjas[position]

                        mostrarGalponesDeGranja(
                            granjas[position].id
                        )
                    }
                }

                override fun onNothingSelected(
                    parent: android.widget.AdapterView<*>?
                ) {
                    // No se requiere acción
                }
            }
    }

    // =========================================================
    // MOSTRAR GALPONES DE LA GRANJA
    // =========================================================

    private fun mostrarGalponesDeGranja(
        granjaId: Int
    ) {

        val galponesDeGranja =
            galpones.filter { galpon ->

                galpon.granja.id == granjaId
            }

        configurarGalpon(
            binding.btnGalponNorte,
            buscarGalpon(
                galponesDeGranja,
                0
            )
        )

        configurarGalpon(
            binding.btnGalponSur,
            buscarGalpon(
                galponesDeGranja,
                1
            )
        )

        configurarGalpon(
            binding.btnGalponEste,
            buscarGalpon(
                galponesDeGranja,
                2
            )
        )

        configurarGalpon(
            binding.btnGalponOeste,
            buscarGalpon(
                galponesDeGranja,
                3
            )
        )
    }

    // =========================================================
    // BUSCAR GALPÓN
    // =========================================================
    //
    // El backend actualmente devuelve:
    //
    // id
    // codigo
    // nombre
    // capacidad_aves
    // ancho_metros
    // largo_metros
    // orientacion
    // tipo_techo
    // plano_url
    // activo
    // fecha_construccion
    // granja
    //
    // Como el backend no tiene un campo explícito
    // "norte/sur/este/oeste", usamos el orden de los
    // galpones para ocupar los cuatro espacios de la UI.
    //
    // Si después el backend agrega orientación real,
    // podemos cambiar esta lógica.
    // =========================================================

    private fun buscarGalpon(
        galpones: List<GalponResponse>,
        posicion: Int
    ): GalponResponse? {

        return if (
            posicion >= 0 &&
            posicion < galpones.size
        ) {
            galpones[posicion]
        } else {
            null
        }
    }

    // =========================================================
    // CONFIGURAR GALPÓN
    // =========================================================

    private fun configurarGalpon(
        galpon: LinearLayout,
        datos: GalponResponse?
    ) {

        if (datos == null) {

            galpon.visibility =
                View.GONE

            return
        }

        galpon.visibility =
            View.VISIBLE

        // -----------------------------------------------------
        // NOMBRE
        // -----------------------------------------------------

        actualizarTextoGalpon(
            galpon,
            datos
        )

        // -----------------------------------------------------
        // ESTADO INICIAL
        // -----------------------------------------------------

        galpon.setBackgroundResource(
            R.drawable.bg_galpon_unselected
        )

        if (galpon.childCount > 0) {

            galpon
                .getChildAt(0)
                .visibility =
                View.INVISIBLE
        }

        cambiarColorTexto(
            galpon,
            Color.WHITE
        )

        // -----------------------------------------------------
        // CLICK
        // -----------------------------------------------------

        galpon.setOnClickListener {

            seleccionarGalpon(
                galpon
            )

            Toast.makeText(
                requireContext(),
                "${datos.nombre} - ${datos.codigo}",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    // =========================================================
    // ACTUALIZAR TEXTO DEL GALPÓN
    // =========================================================

    private fun actualizarTextoGalpon(
        galpon: LinearLayout,
        datos: GalponResponse
    ) {

        for (
        i in 0 until galpon.childCount
        ) {

            val child =
                galpon.getChildAt(i)

            if (child is TextView) {

                child.text =
                    datos.nombre

                child.setTextColor(
                    Color.WHITE
                )

                return
            }
        }
    }

    // =========================================================
    // SELECCIONAR GALPÓN
    // =========================================================

    private fun seleccionarGalpon(
        galponSeleccionado: LinearLayout
    ) {

        val galpones =
            listOf(
                binding.btnGalponNorte,
                binding.btnGalponSur,
                binding.btnGalponEste,
                binding.btnGalponOeste
            )

        galpones.forEach { otroGalpon ->

            val seleccionado =
                otroGalpon ==
                        galponSeleccionado

            otroGalpon.setBackgroundResource(

                if (seleccionado) {

                    R.drawable.bg_galpon_selected

                } else {

                    R.drawable.bg_galpon_unselected
                }
            )

            if (
                otroGalpon.childCount > 0
            ) {

                otroGalpon
                    .getChildAt(0)
                    .visibility =

                    if (seleccionado) {

                        View.VISIBLE

                    } else {

                        View.INVISIBLE
                    }
            }

            cambiarColorTexto(
                otroGalpon,
                Color.WHITE
            )
        }
    }

    // =========================================================
    // CAMBIAR COLOR DE TEXTO
    // =========================================================

    private fun cambiarColorTexto(
        galpon: LinearLayout,
        color: Int
    ) {

        for (
        i in 0 until galpon.childCount
        ) {

            val child =
                galpon.getChildAt(i)

            if (child is TextView) {

                child.setTextColor(
                    color
                )
            }
        }
    }

    // =========================================================
    // LIMPIAR GALPONES
    // =========================================================

    private fun limpiarGalpones() {

        val galpones =
            listOf(
                binding.btnGalponNorte,
                binding.btnGalponSur,
                binding.btnGalponEste,
                binding.btnGalponOeste
            )

        galpones.forEach {

            it.visibility =
                View.GONE
        }
    }

    // =========================================================
    // DESTRUIR VISTA
    // =========================================================

    override fun onDestroyView() {

        super.onDestroyView()

        _binding = null
    }
}