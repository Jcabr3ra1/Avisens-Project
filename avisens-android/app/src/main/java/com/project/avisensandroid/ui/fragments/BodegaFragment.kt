
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
import com.project.avisensandroid.model.ProveedorResponse
import com.project.avisensandroid.model.UserRole
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.Locale

class BodegaFragment : BaseBottomNavFragment() {

    private var _binding: Po03BodegaOpBinding? = null
    private val binding get() = _binding!!

    private val proveedoresPorId = mutableMapOf<Int, ProveedorResponse>()
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
        val esOperario = activity.obtenerRolActual() == UserRole.OPERARIO

        // El Operario solo trabaja con Insumos: no se muestra la barra de pestañas.
        // Propietario/Admin conservan ambas pestañas y el diseño original.
        binding.tabsBodega.visibility = if (esOperario) View.GONE else View.VISIBLE
        binding.btnProveedores.visibility = View.VISIBLE
        binding.btnInsumos.visibility = View.VISIBLE
        actualizarPestanaActiva(insumosActivos = true)

        binding.btnInsumos.setOnClickListener {
            actualizarPestanaActiva(insumosActivos = true)
        }

        binding.btnProveedores.setOnClickListener {
            if (!esOperario) {
                activity.mostrarFragment(ProveedoresFragment())
            }
        }

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


    private fun actualizarPestanaActiva(insumosActivos: Boolean) {
        val colorActivo = android.graphics.Color.parseColor("#2E7D5B")
        val colorInactivo = android.graphics.Color.parseColor("#89938E")

        binding.btnInsumos.setBackgroundResource(
            if (insumosActivos) R.drawable.bg_bodega_tab_selected else android.R.color.transparent
        )
        binding.btnProveedores.setBackgroundResource(
            if (!insumosActivos) R.drawable.bg_bodega_tab_selected else android.R.color.transparent
        )
        binding.btnInsumos.setTextColor(if (insumosActivos) colorActivo else colorInactivo)
        binding.btnProveedores.setTextColor(if (!insumosActivos) colorActivo else colorInactivo)
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) {
            cargarDatosBodega()
        }
    }

    private fun cargarDatosBodega() {
        if (cargando || _binding == null) return
        val activity = requireActivity() as MainActivity
        binding.btnNuevoInsumo.visibility =
            if (activity.obtenerRolActual() == UserRole.PROPIETARIO)
                View.VISIBLE else View.GONE
        cargando = true
        binding.progressInsumos.visibility = View.VISIBLE
        binding.txtSinInsumos.visibility = View.GONE
        binding.txtSinInsumos.text = "No hay insumos registrados"

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                cargarProveedores()
                val insumos = cargarTodosLosInsumos()
                mostrarInsumos(insumos)
            } catch (e: Exception) {
                if (_binding != null && isAdded) {
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
            // El nombre del proveedor es solo informativo.
        }
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

        // Si el backend ya entrega el máximo histórico, utilizarlo.
        // En versiones anteriores de la API ese campo no existe. En ese caso,
        // guardar el MAYOR STOCK REAL observado por esta instalación, nunca
        // un multiplicador inventado ni una capacidad ficticia.
        val claveReferencia = "insumo_${insumo.id}_max_observado"
        val observadoAnterior = preferenciasStock.getString(claveReferencia, null)
            ?.toDoubleOrNull()
            ?.takeIf { it.isFinite() && it > 0.0 }
            ?: 0.0
        val referenciaBackend = insumo.stock_referencia
            ?.takeIf { it.isFinite() && it > 0.0 }
            ?: 0.0
        val referencia = maxOf(stockActual, observadoAnterior, referenciaBackend)
        if (referencia > observadoAnterior) {
            preferenciasStock.edit()
                .putString(claveReferencia, referencia.toString())
                .apply()
        }
        val porcentaje = if (referencia > 0.0) {
            ((stockActual / referencia) * 100.0)
                .coerceIn(0.0, 100.0)
                .toInt()
        } else {
            0
        }

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

        itemBinding.btnMovimientoInsumo.setOnClickListener {
            (requireActivity() as MainActivity).mostrarDialogMovimientoInsumo(insumo)
        }

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
