package com.project.avisensandroid.ui.fragments

import android.graphics.Typeface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.ProgressBar
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.ItemInsumoBinding
import com.project.avisensandroid.databinding.Po03BodegaOpBinding
import com.project.avisensandroid.model.InsumoResponse
import com.project.avisensandroid.model.ProveedorResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

class BodegaFragment : BaseBottomNavFragment() {

    private var _binding: Po03BodegaOpBinding? = null
    private val binding get() = _binding!!

    private val proveedoresPorId = mutableMapOf<Int, ProveedorResponse>()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po03BodegaOpBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val activity = requireActivity() as MainActivity
        configurarBottomNav(R.id.nav_bodega)

        binding.btnProveedores.setOnClickListener {
            activity.mostrarFragment(ProveedoresFragment())
        }

        binding.btnInsumos.setOnClickListener {
            // Ya estamos en insumos.
        }

        binding.btnNuevoInsumo.setOnClickListener {
            activity.mostrarDialogNuevoInsumo()
        }

        cargarDatosBodega()
    }

    private fun cargarDatosBodega() {
        binding.progressInsumos.visibility = View.VISIBLE
        binding.txtSinInsumos.visibility = View.GONE

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                cargarProveedores()

                val response = RetrofitClient.api.listarInsumos(page = 1, limit = 100)

                if (!response.isSuccessful) {
                    Toast.makeText(
                        requireContext(),
                        "No se pudieron cargar los insumos. Código: ${response.code()}",
                        Toast.LENGTH_LONG
                    ).show()
                    return@launch
                }

                val insumos = response.body()?.data
                if (insumos == null) {
                    Toast.makeText(
                        requireContext(),
                        "La API no devolvió información de insumos",
                        Toast.LENGTH_LONG
                    ).show()
                    return@launch
                }

                mostrarInsumos(insumos)

            } catch (e: Exception) {
                if (isAdded) {
                    Toast.makeText(
                        requireContext(),
                        "Error al cargar bodega: ${e.message ?: "error desconocido"}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } finally {
                if (_binding != null) {
                    binding.progressInsumos.visibility = View.GONE
                }
            }
        }
    }

    private suspend fun cargarProveedores() {
        try {
            val response = RetrofitClient.api.listarProveedores(page = 1, limit = 100)
            if (response.isSuccessful) {
                proveedoresPorId.clear()
                response.body()?.data
                    ?.filter { it.activo }
                    ?.forEach { proveedor ->
                        proveedoresPorId[proveedor.id] = proveedor
                    }
            }
        } catch (_: Exception) {
            // Si proveedores falla, la tarjeta conserva el ID como respaldo.
        }
    }

    private fun mostrarInsumos(insumos: List<InsumoResponse>) {
        binding.contenedorInsumos.removeAllViews()

        val activos = insumos.filter { it.activo }

        if (activos.isEmpty()) {
            binding.txtSinInsumos.visibility = View.VISIBLE
            binding.txtCriticos.text = "● 0 críticos"
            return
        }

        binding.txtSinInsumos.visibility = View.GONE

        val cantidadCriticos = activos.count { insumo ->
            val stock = insumo.stock_actual ?: 0.0
            val minimo = insumo.stock_minimo ?: 0.0
            minimo > 0.0 && stock <= minimo
        }

        binding.txtCriticos.text = "● $cantidadCriticos críticos"

        activos.forEach { insumo ->
            agregarTarjetaInsumo(insumo)
        }
    }

    private fun agregarTarjetaInsumo(insumo: InsumoResponse) {
        val itemBinding = ItemInsumoBinding.inflate(
            layoutInflater,
            binding.contenedorInsumos,
            false
        )

        val stockActual = (insumo.stock_actual ?: 0.0).coerceAtLeast(0.0)
        val stockMinimo = (insumo.stock_minimo ?: 0.0).coerceAtLeast(0.0)
        val esCritico = stockMinimo > 0.0 && stockActual <= stockMinimo

        itemBinding.txtNombreInsumo.text = insumo.nombre
        itemBinding.txtTipoInsumo.text = insumo.tipo
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?: "Sin categoría"

        itemBinding.txtCantidadInsumo.text = formatearNumero(stockActual)
        itemBinding.txtUnidadInsumo.text = insumo.unidad_medida

        // La barra representa qué tan cerca está el stock actual del mínimo.
        // Al llegar al mínimo o superarlo, queda completa y el estado pasa a OK.
        val porcentaje = if (stockMinimo > 0.0) {
            ((stockActual / stockMinimo) * 100.0)
                .coerceIn(0.0, 100.0)
                .toInt()
        } else {
            100
        }

        itemBinding.progressStock.max = 100
        itemBinding.progressStock.progress = porcentaje
        itemBinding.progressStock.progressDrawable = ContextCompat.getDrawable(
            requireContext(),
            if (esCritico) R.drawable.progress_stock_red
            else R.drawable.progress_stock_green
        )

        itemBinding.txtMinimoAutonomia.text = if (stockMinimo > 0.0) {
            "Mínimo: ${formatearNumero(stockMinimo)} ${insumo.unidad_medida}"
        } else {
            "Mínimo: no configurado"
        }

        val proveedorId = insumo.proveedor_habitual_id
        itemBinding.txtProveedorInsumo.text = when {
            proveedorId == null -> "Sin proveedor"
            proveedoresPorId[proveedorId] != null -> proveedoresPorId[proveedorId]!!.nombre
            else -> "Proveedor #$proveedorId"
        }

        itemBinding.txtEstadoInsumo.text = if (esCritico) {
            "Stock crítico"
        } else {
            "Stock OK"
        }

        itemBinding.txtEstadoInsumo.setTextColor(
            ContextCompat.getColor(
                requireContext(),
                if (esCritico) R.color.badge_red_text else R.color.badge_green_text
            )
        )

        itemBinding.txtEstadoInsumo.setBackgroundResource(
            if (esCritico) R.drawable.bg_stock_critico
            else R.drawable.bg_stock_ok
        )

        itemBinding.cardInsumo.setBackgroundResource(
            if (esCritico) R.drawable.bg_bodega_card_critico
            else R.drawable.bg_bodega_card
        )

        val params = itemBinding.cardInsumo.layoutParams as ViewGroup.MarginLayoutParams
        params.topMargin = dp(11)
        itemBinding.cardInsumo.layoutParams = params

        binding.contenedorInsumos.addView(itemBinding.root)
    }

    private fun formatearNumero(numero: Double): String {
        val formato = NumberFormat.getNumberInstance(Locale.US).apply {
            maximumFractionDigits = 2
            minimumFractionDigits = 0
        }
        return formato.format(numero)
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
