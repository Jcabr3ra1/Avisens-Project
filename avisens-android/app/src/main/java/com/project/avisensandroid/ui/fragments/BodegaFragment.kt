package com.project.avisensandroid.ui.fragments

import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.Po03BodegaOpBinding
import com.project.avisensandroid.model.InsumoResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.launch
import java.util.Locale

class BodegaFragment : BaseBottomNavFragment() {

    private var _binding: Po03BodegaOpBinding? = null
    private val binding
        get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {

        _binding = Po03BodegaOpBinding.inflate(
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

        val activity =
            requireActivity() as MainActivity

        configurarBottomNav(R.id.nav_bodega)

        // =====================================================
        // PROVEEDORES
        // =====================================================

        binding.btnProveedores.setOnClickListener {

            activity.mostrarFragment(
                ProveedoresFragment()
            )
        }

        // =====================================================
        // INSUMOS
        // =====================================================

        binding.btnInsumos.setOnClickListener {
            // Ya estamos en insumos.
        }

        // =====================================================
        // NUEVO INSUMO
        // =====================================================

        binding.btnNuevoInsumo.setOnClickListener {

            activity.mostrarDialogNuevoInsumo()
        }

        // =====================================================
        // CARGAR INSUMOS
        // =====================================================

        cargarInsumos()
    }

    // =========================================================
    // CONSULTAR API
    // =========================================================

    private fun cargarInsumos() {

        binding.progressInsumos.visibility =
            View.VISIBLE

        binding.txtSinInsumos.visibility =
            View.GONE

        viewLifecycleOwner.lifecycleScope.launch {

            try {

                val response =
                    RetrofitClient.api.listarInsumos(
                        page = 1,
                        limit = 100
                    )

                if (!response.isSuccessful) {

                    binding.progressInsumos.visibility =
                        View.GONE

                    Toast.makeText(
                        requireContext(),
                        "No se pudieron cargar los insumos. Código: ${response.code()}",
                        Toast.LENGTH_LONG
                    ).show()

                    return@launch
                }

                val body =
                    response.body()

                if (body == null) {

                    binding.progressInsumos.visibility =
                        View.GONE

                    Toast.makeText(
                        requireContext(),
                        "La API no devolvió información de insumos",
                        Toast.LENGTH_LONG
                    ).show()

                    return@launch
                }

                mostrarInsumos(
                    body.data
                )

            } catch (e: Exception) {

                if (isAdded) {

                    Toast.makeText(
                        requireContext(),
                        "Error al cargar insumos: ${e.message ?: "error desconocido"}",
                        Toast.LENGTH_LONG
                    ).show()
                }

            } finally {

                if (_binding != null) {

                    binding.progressInsumos.visibility =
                        View.GONE
                }
            }
        }
    }

    // =========================================================
    // MOSTRAR INSUMOS
    // =========================================================

    private fun mostrarInsumos(
        insumos: List<InsumoResponse>
    ) {

        binding.contenedorInsumos.removeAllViews()

        if (insumos.isEmpty()) {

            binding.txtSinInsumos.visibility =
                View.VISIBLE

            binding.txtCriticos.text =
                "● 0 críticos"

            return
        }

        binding.txtSinInsumos.visibility =
            View.GONE

        var cantidadCriticos = 0

        insumos
            .filter { it.activo }
            .forEach { insumo ->

                val stockActual =
                    insumo.stock_actual ?: 0.0

                val stockMinimo =
                    insumo.stock_minimo ?: 0.0

                val esCritico =
                    stockMinimo > 0 &&
                            stockActual <= stockMinimo

                if (esCritico) {
                    cantidadCriticos++
                }

                agregarTarjetaInsumo(
                    insumo
                )
            }

        binding.txtCriticos.text =
            "● $cantidadCriticos críticos"
    }

    // =========================================================
    // CREAR TARJETA
    // =========================================================

    private fun agregarTarjetaInsumo(
        insumo: InsumoResponse
    ) {

        val context =
            requireContext()

        val stockActual =
            insumo.stock_actual ?: 0.0

        val stockMinimo =
            insumo.stock_minimo ?: 0.0

        val esCritico =
            stockMinimo > 0 &&
                    stockActual <= stockMinimo

        // =====================================================
        // TARJETA
        // =====================================================

        val tarjeta =
            LinearLayout(context).apply {

                orientation =
                    LinearLayout.VERTICAL

                setPadding(
                    14,
                    14,
                    14,
                    14
                )

                setBackgroundResource(
                    if (esCritico) {
                        R.drawable.bg_bodega_card_critico
                    } else {
                        R.drawable.bg_bodega_card
                    }
                )

                layoutParams =
                    LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {

                        topMargin = 11
                    }
            }

        // =====================================================
        // NOMBRE
        // =====================================================

        val nombre =
            TextView(context).apply {

                text =
                    insumo.nombre

                textSize =
                    16f

                setTextColor(
                    Color.parseColor("#171D1A")
                )

                setTypeface(
                    null,
                    Typeface.BOLD
                )
            }

        tarjeta.addView(
            nombre
        )

        // =====================================================
        // TIPO
        // =====================================================

        val tipo =
            TextView(context).apply {

                text =
                    insumo.tipo
                        ?.takeIf { it.isNotBlank() }
                        ?: "Sin categoría"

                textSize =
                    11f

                setTextColor(
                    Color.parseColor("#7D8782")
                )

                setPadding(
                    7,
                    3,
                    7,
                    3
                )

                setBackgroundResource(
                    R.drawable.bg_bodega_tipo
                )
            }

        val tipoParams =
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {

                topMargin = 6
            }

        tarjeta.addView(
            tipo,
            tipoParams
        )

        // =====================================================
        // CANTIDAD
        // =====================================================

        val cantidad =
            TextView(context).apply {

                val cantidadTexto =
                    if (
                        stockActual % 1.0 == 0.0
                    ) {
                        stockActual
                            .toInt()
                            .toString()
                    } else {
                        String.format(
                            Locale.getDefault(),
                            "%.2f",
                            stockActual
                        )
                    }

                text =
                    "$cantidadTexto ${insumo.unidad_medida}"

                textSize =
                    22f

                setTextColor(
                    Color.parseColor("#171D1A")
                )

                setTypeface(
                    null,
                    Typeface.BOLD
                )
            }

        val cantidadParams =
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {

                topMargin = 7
            }

        tarjeta.addView(
            cantidad,
            cantidadParams
        )

        // =====================================================
        // BARRA DE STOCK
        // =====================================================

        val progreso =
            if (stockMinimo > 0) {

                ((stockActual / stockMinimo) * 100)
                    .coerceIn(0.0, 100.0)
                    .toInt()

            } else {

                100
            }

        val progressBar =
            ProgressBar(
                context,
                null,
                android.R.attr.progressBarStyleHorizontal
            ).apply {

                max = 100

                progress =
                    progreso

                progressTintList =
                    ColorStateList.valueOf(
                        if (esCritico) {
                            Color.parseColor("#E85A4F")
                        } else {
                            Color.parseColor("#22965F")
                        }
                    )

                backgroundTintList =
                    ColorStateList.valueOf(
                        Color.parseColor("#E8ECEA")
                    )
            }

        val progressParams =
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                7
            ).apply {

                topMargin = 7
            }

        tarjeta.addView(
            progressBar,
            progressParams
        )

        // =====================================================
        // STOCK MÍNIMO
        // =====================================================

        val minimo =
            TextView(context).apply {

                text =
                    if (stockMinimo > 0) {

                        "Mínimo: ${
                            formatearNumero(stockMinimo)
                        } ${insumo.unidad_medida}"

                    } else {

                        "Mínimo: no configurado"
                    }

                textSize =
                    11f

                setTextColor(
                    Color.parseColor("#89938E")
                )
            }

        val minimoParams =
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {

                topMargin = 5
            }

        tarjeta.addView(
            minimo,
            minimoParams
        )

        // =====================================================
        // PROVEEDOR
        // =====================================================

        val proveedor =
            TextView(context).apply {

                text =
                    if (
                        insumo.proveedor_habitual_id != null
                    ) {

                        "Proveedor #${insumo.proveedor_habitual_id}"

                    } else {

                        "Sin proveedor"
                    }

                textSize =
                    11f

                setTextColor(
                    Color.parseColor("#69746F")
                )
            }

        val proveedorParams =
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {

                topMargin = 8
            }

        tarjeta.addView(
            proveedor,
            proveedorParams
        )

        // =====================================================
        // ESTADO
        // =====================================================

        val estado =
            TextView(context).apply {

                text =
                    if (esCritico) {
                        "Stock crítico"
                    } else {
                        "Stock OK"
                    }

                textSize =
                    10f

                setTypeface(
                    null,
                    Typeface.BOLD
                )

                setTextColor(
                    if (esCritico) {
                        Color.parseColor("#C93B32")
                    } else {
                        Color.parseColor("#18875A")
                    }
                )

                setPadding(
                    8,
                    5,
                    8,
                    5
                )

                setBackgroundResource(
                    if (esCritico) {
                        R.drawable.bg_stock_critico
                    } else {
                        R.drawable.bg_stock_ok
                    }
                )
            }

        val estadoParams =
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {

                topMargin = 6
            }

        tarjeta.addView(
            estado,
            estadoParams
        )

        // =====================================================
        // AGREGAR TARJETA AL CONTENEDOR
        // =====================================================

        binding.contenedorInsumos.addView(
            tarjeta
        )
    }

    // =========================================================
    // FORMATEAR NÚMEROS
    // =========================================================

    private fun formatearNumero(
        numero: Double
    ): String {

        return if (numero % 1.0 == 0.0) {

            numero
                .toInt()
                .toString()

        } else {

            String.format(
                Locale.getDefault(),
                "%.2f",
                numero
            )
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