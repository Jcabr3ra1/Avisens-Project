
package com.project.avisensandroid.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.ItemInsumoBinding
import com.project.avisensandroid.databinding.Po03BodegaOpBinding
import com.project.avisensandroid.model.InsumoResponse
import com.project.avisensandroid.model.UserRole
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

class BodegaFragment : BaseBottomNavFragment() {

    private var _binding: Po03BodegaOpBinding? = null
    private val binding get() = _binding!!

    private var cargando = false
    private val preferenciasStock by lazy {
        requireContext().getSharedPreferences("bodega_referencia_stock", android.content.Context.MODE_PRIVATE)
    }

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
        binding.btnNuevoInsumo.visibility =
            if (activity.obtenerRolActual() == com.project.avisensandroid.model.UserRole.PROPIETARIO) {
                View.VISIBLE
            } else {
                View.GONE
            }

        binding.btnNuevoInsumo.setOnClickListener {
            activity.mostrarDialogNuevoInsumo()
        }

        // onResume realiza la carga inicial y las recargas al volver de un diálogo.
    }


    override fun onResume() {
        super.onResume()
        if (_binding != null) {
            cargarDatosBodega()
        }
    }

    fun actualizarAlRecuperarInternet() {
        if (_binding != null && isAdded) cargarDatosBodega()
    }

    fun actualizarSilenciosamente() {
        if (_binding != null && isAdded) cargarDatosBodega(silenciosa = true)
    }

    private fun cargarDatosBodega(silenciosa: Boolean = false) {
        if (cargando || _binding == null) return
        val activity = requireActivity() as MainActivity
        binding.btnNuevoInsumo.visibility =
            if (activity.obtenerRolActual() == UserRole.PROPIETARIO)
                View.VISIBLE else View.GONE
        cargando = true
        if (!silenciosa) {
            binding.progressInsumos.visibility = View.VISIBLE
            binding.txtSinInsumos.visibility = View.GONE
        }
        binding.txtSinInsumos.text = "No hay insumos registrados"

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val insumos = cargarTodosLosInsumos()
                mostrarInsumos(insumos)
            } catch (e: Exception) {
                if (!silenciosa && _binding != null && isAdded) {
                    binding.txtSinInsumos.text = "No se pudieron cargar los alimentos. ${e.message ?: "Intenta nuevamente."}"
                    binding.txtSinInsumos.visibility = View.VISIBLE
                    Toast.makeText(
                        requireContext(),
                        "Error al cargar bodega: ${e.message ?: "error desconocido"}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } finally {
                cargando = false
                _binding?.progressInsumos?.visibility = View.GONE
            }
        }
    }

    private suspend fun cargarTodosLosInsumos(): List<InsumoResponse> {
        val todos = mutableListOf<InsumoResponse>()
        var page = 1
        var totalPages = 1

        do {
            val response = RetrofitClient.api.listarInsumos(
                page = page,
                limit = 100
            )

            if (!response.isSuccessful) {
                val detalle = response.errorBody()?.string()?.take(180).orEmpty()
                throw IllegalStateException(
                    if (detalle.isBlank()) {
                        "No se pudieron cargar los insumos. Código: ${response.code()}"
                    } else {
                        "No se pudieron cargar los insumos. Código: ${response.code()} $detalle"
                    }
                )
            }

            val body = response.body()
                ?: throw IllegalStateException("La API no devolvió información de insumos")

            todos += body.data
            totalPages = body.meta.totalPages
            page++
        } while (page <= totalPages)

        return todos.distinctBy { it.id }
    }


    private fun mostrarInsumos(insumos: List<InsumoResponse>) {
        binding.contenedorInsumos.removeAllViews()

        val activity = requireActivity() as MainActivity
        val granjaIdSeleccionada = activity.obtenerGranjaSeleccionadaId()

        val disponibles = insumos.filter { it.activo }
        // Si hay selección, muestra esa granja. Si aún no existe, muestra
        // los insumos autorizados por el backend para el usuario.
        val activos = disponibles.filter { insumo ->
            granjaIdSeleccionada == null || insumo.granja_id == granjaIdSeleccionada
        }

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

        // Si existe mínimo, la barra representa el stock disponible frente a ese
        // umbral: 180 kg / 300 kg = 60 %. No depender del máximo observado.
        // Si no hay mínimo configurado, usar la referencia real del backend.
        val referencia = if (stockMinimo > 0.0) stockMinimo else {
            insumo.stock_referencia?.takeIf { it.isFinite() && it > 0.0 }
                ?: stockActual
        }
        val porcentaje = if (referencia > 0.0) {
            ((stockActual / referencia) * 100.0).coerceIn(0.0, 100.0).toInt()
        } else 0

        // La barra debe verse siempre, incluso en insumos antiguos o agotados.
        itemBinding.progressStock.visibility = View.VISIBLE
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
