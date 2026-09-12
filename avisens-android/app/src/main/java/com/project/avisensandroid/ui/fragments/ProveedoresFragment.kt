package com.project.avisensandroid.ui.fragments

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
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

        binding.contenedorProveedores.addView(
            itemBinding.root
        )
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
