package com.project.avisensandroid.ui.fragments

import android.graphics.Color
import android.os.Bundle
import android.content.Context
import android.content.ActivityNotFoundException
import android.content.Intent
import android.view.Gravity
import android.widget.TextView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.net.Uri
import android.widget.LinearLayout
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.ItemProveedorBinding
import com.project.avisensandroid.databinding.Po04BodegaProveedoresOpBinding
import com.project.avisensandroid.model.ProveedorResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.launch

class ProveedoresFragment : BaseBottomNavFragment() {

    private var _binding: Po04BodegaProveedoresOpBinding? = null
    private val binding get() = _binding!!

    private val calificacionesPrefs by lazy {
        requireContext().getSharedPreferences(
            "proveedores_calificaciones",
            Context.MODE_PRIVATE
        )
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po04BodegaProveedoresOpBinding.inflate(
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
        super.onViewCreated(view, savedInstanceState)

        configurarBottomNav(R.id.nav_bodega)

        binding.btnInsumos.setOnClickListener {
            (requireActivity() as MainActivity)
                .mostrarFragment(BodegaFragment())
        }

        cargarProveedores()
    }

    private fun cargarProveedores() {
        binding.contenedorProveedores.removeAllViews()

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.listarProveedores(
                    page = 1,
                    limit = 100
                )

                if (!isAdded || _binding == null) return@launch

                if (response.isSuccessful) {
                    val proveedores = response.body()?.data.orEmpty()

                    if (proveedores.isEmpty()) {
                        mostrarMensajeSinProveedores()
                    } else {
                        proveedores.forEach { proveedor ->
                            agregarTarjetaProveedor(proveedor)
                        }
                    }
                } else {
                    mostrarError(
                        "No se pudieron cargar los proveedores (${response.code()})"
                    )
                }
            } catch (e: Exception) {
                if (!isAdded || _binding == null) return@launch
                mostrarError(
                    "Error de conexión al cargar proveedores"
                )
            }
        }
    }

    private fun agregarTarjetaProveedor(
        proveedor: ProveedorResponse
    ) {
        val itemBinding = ItemProveedorBinding.inflate(
            layoutInflater,
            binding.contenedorProveedores,
            false
        )

        itemBinding.txtNombreProveedor.text =
            proveedor.nombre

        itemBinding.txtContactoProveedor.text =
            when {
                !proveedor.contacto_persona.isNullOrBlank() &&
                        !proveedor.telefono.isNullOrBlank() ->
                    "${proveedor.contacto_persona} · ${proveedor.telefono}"

                !proveedor.contacto_persona.isNullOrBlank() ->
                    proveedor.contacto_persona

                !proveedor.telefono.isNullOrBlank() ->
                    proveedor.telefono

                else ->
                    "Contacto no registrado"
            }

        itemBinding.txtNitProveedor.text =
            if (!proveedor.nit.isNullOrBlank()) {
                "NIT: ${proveedor.nit}"
            } else {
                "NIT: no registrado"
            }

        val detalles = listOfNotNull(
            proveedor.tipo_proveedor
                ?.trim()
                ?.takeIf { it.isNotEmpty() },
            proveedor.email
                ?.trim()
                ?.takeIf { it.isNotEmpty() },
            proveedor.direccion
                ?.trim()
                ?.takeIf { it.isNotEmpty() }
        )

        itemBinding.txtDetalleProveedor.text =
            if (detalles.isEmpty()) {
                "Información adicional no registrada"
            } else {
                detalles.joinToString(" · ")
            }

        if (proveedor.activo) {
            itemBinding.txtEstadoProveedor.text =
                "● Activo"
            itemBinding.txtEstadoProveedor.setTextColor(
                Color.parseColor("#18875A")
            )
            itemBinding.txtEstadoProveedor.setBackgroundResource(
                R.drawable.bg_provider_excellent
            )
        } else {
            itemBinding.txtEstadoProveedor.text =
                "● Inactivo"
            itemBinding.txtEstadoProveedor.setTextColor(
                Color.parseColor("#C93B32")
            )
            itemBinding.txtEstadoProveedor.setBackgroundResource(
                R.drawable.bg_bodega_critico
            )
        }

        configurarCalificacion(itemBinding, proveedor.id)
        configurarAccionesContacto(itemBinding, proveedor)

        binding.contenedorProveedores.addView(
            itemBinding.root
        )
    }



    private fun configurarAccionesContacto(
        itemBinding: ItemProveedorBinding,
        proveedor: ProveedorResponse
    ) {
        val telefono = proveedor.telefono?.trim().orEmpty()
        val direccion = proveedor.direccion?.trim().orEmpty()

        itemBinding.btnLlamarProveedor.isEnabled = telefono.isNotBlank()
        itemBinding.btnVerDireccionProveedor.isEnabled = direccion.isNotBlank()

        itemBinding.btnLlamarProveedor.setOnClickListener {
            if (telefono.isBlank()) {
                Toast.makeText(
                    requireContext(),
                    "Este proveedor no tiene teléfono registrado",
                    Toast.LENGTH_SHORT
                ).show()
                return@setOnClickListener
            }

            try {
                val intent = Intent(Intent.ACTION_DIAL).apply {
                    data = Uri.parse("tel:${Uri.encode(telefono)}")
                }
                startActivity(intent)
            } catch (_: ActivityNotFoundException) {
                Toast.makeText(
                    requireContext(),
                    "No se encontró una aplicación para realizar llamadas",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }

        itemBinding.btnVerDireccionProveedor.setOnClickListener {
            if (direccion.isBlank()) {
                Toast.makeText(
                    requireContext(),
                    "Este proveedor no tiene dirección registrada",
                    Toast.LENGTH_SHORT
                ).show()
                return@setOnClickListener
            }

            try {
                val uri = Uri.parse("geo:0,0?q=${Uri.encode(direccion)}")
                val intent = Intent(Intent.ACTION_VIEW, uri)
                startActivity(intent)
            } catch (_: ActivityNotFoundException) {
                Toast.makeText(
                    requireContext(),
                    "No se encontró una aplicación de mapas",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    private fun configurarCalificacion(
        itemBinding: ItemProveedorBinding,
        proveedorId: Int
    ) {
        val contenedor = itemBinding.contenedorEstrellasProveedor
        contenedor.removeAllViews()

        val puntuacionGuardada = calificacionesPrefs.getInt(
            "proveedor_$proveedorId",
            0
        )

        fun actualizarEstrellas(puntuacion: Int) {
            for (i in 0 until contenedor.childCount) {
                val estrella = contenedor.getChildAt(i) as TextView
                estrella.text = if (i < puntuacion) "★" else "☆"
                estrella.setTextColor(
                    if (i < puntuacion) {
                        Color.parseColor("#E3A629")
                    } else {
                        Color.parseColor("#B8C1BC")
                    }
                )
            }
            itemBinding.txtCalificacionProveedor.text =
                if (puntuacion > 0) {
                    "Tu calificación: $puntuacion/5"
                } else {
                    "Sin calificación"
                }
        }

        for (i in 1..5) {
            val estrella = TextView(requireContext()).apply {
                layoutParams = LinearLayout.LayoutParams(
                    dp(25),
                    dp(30)
                )
                gravity = Gravity.CENTER
                textSize = 20f
                text = if (i <= puntuacionGuardada) "★" else "☆"
                setTextColor(
                    if (i <= puntuacionGuardada) {
                        Color.parseColor("#E3A629")
                    } else {
                        Color.parseColor("#B8C1BC")
                    }
                )
                isClickable = true
                isFocusable = true

                setOnClickListener {
                    calificacionesPrefs.edit()
                        .putInt("proveedor_$proveedorId", i)
                        .apply()
                    actualizarEstrellas(i)
                    Toast.makeText(
                        requireContext(),
                        "Calificación guardada",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
            contenedor.addView(estrella)
        }

        actualizarEstrellas(puntuacionGuardada)
    }

    private fun mostrarMensajeSinProveedores() {
        val mensaje = android.widget.TextView(requireContext()).apply {
            text = "Aún no hay proveedores registrados"
            setTextColor(
                ContextCompat.getColor(
                    requireContext(),
                    R.color.text_secondary
                )
            )
            textSize = 13f
            setPadding(dp(4), dp(18), dp(4), dp(18))
        }

        binding.contenedorProveedores.addView(mensaje)
    }

    private fun mostrarError(mensaje: String) {
        if (!isAdded || _binding == null) return

        Toast.makeText(
            requireContext(),
            mensaje,
            Toast.LENGTH_LONG
        ).show()

        mostrarMensajeSinProveedores()
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
