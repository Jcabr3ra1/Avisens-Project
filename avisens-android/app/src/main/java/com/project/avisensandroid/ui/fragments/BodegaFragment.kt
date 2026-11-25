
package com.project.avisensandroid.ui.fragments

import android.app.Dialog
import android.text.Editable
import android.text.TextWatcher
import android.widget.ArrayAdapter
import android.widget.AdapterView
import android.view.WindowManager
import com.project.avisensandroid.databinding.R03MovimientoInsumoBinding
import com.project.avisensandroid.model.RegistrarMovimientoRequest
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.async
import java.text.NumberFormat
import java.util.Locale

class BodegaFragment : BaseBottomNavFragment() {

    private var _binding: Po03BodegaOpBinding? = null
    private val binding get() = _binding!!

    private var cargando = false
    private var datosMostrados = false
    private var ultimosInsumos: List<InsumoResponse>? = null
    private var ultimaGranja: Int? = null
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
        binding.progressInsumos.visibility = View.GONE
        if (!datosMostrados) binding.txtSinInsumos.visibility = View.GONE
        binding.txtSinInsumos.text = "No hay insumos registrados"

        viewLifecycleOwner.lifecycleScope.launch {
            val indicador = launch {
                delay(180L)
                if (!datosMostrados && !silenciosa) _binding?.progressInsumos?.visibility = View.VISIBLE
            }
            try {
                val remoto = async {
                    try { Result.success(cargarTodosLosInsumos()) }
                    catch (e: kotlinx.coroutines.CancellationException) { throw e }
                    catch (e: Exception) { Result.failure<List<InsumoResponse>>(e) }
                }
                if (!datosMostrados) {
                    try {
                        val locales = cargarTodosLosInsumos(RetrofitClient.apiCache)
                        mostrarInsumos(locales)
                        datosMostrados = true
                        binding.progressInsumos.visibility = View.GONE
                    } catch (e: kotlinx.coroutines.CancellationException) {
                        throw e
                    } catch (_: Exception) { /* Primera visita sin copia completa. */ }
                }
                val insumos = remoto.await().getOrThrow()
                mostrarInsumos(insumos)
                datosMostrados = true
            } catch (e: kotlinx.coroutines.CancellationException) {
                throw e
            } catch (e: Exception) {
                if (!silenciosa && !datosMostrados && _binding != null && isAdded) {
                    binding.txtSinInsumos.text = "No se pudieron cargar los alimentos. ${e.message ?: "Intenta nuevamente."}"
                    binding.txtSinInsumos.visibility = View.VISIBLE
                    Toast.makeText(
                        requireContext(),
                        "Error al cargar bodega: ${e.message ?: "error desconocido"}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } finally {
                indicador.cancel()
                cargando = false
                _binding?.progressInsumos?.visibility = View.GONE
            }
        }
    }

    private suspend fun cargarTodosLosInsumos(api: com.project.avisensandroid.controller.ApiService = RetrofitClient.api): List<InsumoResponse> {
        val todos = mutableListOf<InsumoResponse>()
        var page = 1
        var totalPages = 1

        do {
            val response = api.listarInsumos(
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

        val activity = requireActivity() as MainActivity
        val granjaIdSeleccionada = activity.obtenerGranjaSeleccionadaId()
        if (ultimosInsumos == insumos && ultimaGranja == granjaIdSeleccionada) {
            binding.txtSinInsumos.visibility = if (binding.contenedorInsumos.childCount == 0) View.VISIBLE else View.GONE
            return
        }
        ultimosInsumos = insumos.toList()
        ultimaGranja = granjaIdSeleccionada
        binding.contenedorInsumos.removeAllViews()

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

        itemBinding.btnEntradaInsumo.visibility = if (
            (requireActivity() as MainActivity).obtenerRolActual() == UserRole.PROPIETARIO
        ) View.VISIBLE else View.GONE
        itemBinding.btnEntradaInsumo.setOnClickListener { mostrarDialogEntrada(insumo) }
        binding.contenedorInsumos.addView(itemBinding.root)
    }

    private fun mostrarDialogEntrada(insumo: InsumoResponse) {
        if ((requireActivity() as MainActivity).obtenerRolActual() != UserRole.PROPIETARIO) return
        val unidadBase = normalizarUnidad(insumo.unidad_medida)
        if (unidadBase == null) {
            Toast.makeText(requireContext(), "Unidad del insumo no compatible: ${insumo.unidad_medida}", Toast.LENGTH_LONG).show()
            return
        }
        val dialog = Dialog(requireContext())
        val form = R03MovimientoInsumoBinding.inflate(layoutInflater)
        dialog.setContentView(form.root)
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
        form.txtNombreMovimiento.text = insumo.nombre
        val stock = insumo.stock_actual ?: 0.0
        form.txtStockMovimiento.text = "Stock actual: ${formatearNumero(stock)} ${insumo.unidad_medida}"

        val unidades = listOf("Kg", "Gramos", "Bultos", "Toneladas")
        val adapter = ArrayAdapter(
            requireContext(), R.layout.spinner_item, unidades
        )
        adapter.setDropDownViewResource(R.layout.spinner_dropdown_item)
        form.spinnerUnidadMovimiento.adapter = adapter
        form.spinnerUnidadMovimiento.setSelection(unidades.indexOf(unidadBase).coerceAtLeast(0))

        fun actualizarVistaPrevia() {
            val seleccion = unidades[form.spinnerUnidadMovimiento.selectedItemPosition.coerceAtLeast(0)]
            form.txtCantidadMovimiento.text = if (seleccion == "Bultos") "Número de bultos" else "Cantidad a ingresar"
            form.edtCantidadMovimiento.hint = if (seleccion == "Bultos") "Ej. 5" else "Ej. 100"
            val usaBultos = seleccion == "Bultos" || unidadBase == "Bultos"
            form.contenedorPesoBulto.visibility = if (usaBultos) View.VISIBLE else View.GONE
            form.txtAyudaBulto.text = if (unidadBase == "Bultos") {
                "Indica el peso de un bulto de este insumo para convertir la entrada a bultos."
            } else {
                "Indica cuántos kilogramos contiene cada bulto comprado."
            }
            val cantidad = leerDecimal(form.edtCantidadMovimiento.text.toString())
            val peso = leerDecimal(form.edtPesoBulto.text.toString())
            val convertido = if (cantidad != null && cantidad > 0 && cantidad.isFinite() &&
                (!usaBultos || (peso != null && peso > 0 && peso.isFinite()))) {
                convertirCantidad(cantidad, seleccion, unidadBase, peso)
            } else null
            form.txtVistaPreviaMovimiento.text = if (convertido != null && convertido.isFinite() && convertido > 0) {
                "Entrada: ${formatearNumero(convertido)} ${insumo.unidad_medida}\n" +
                        "Nuevo stock estimado: ${formatearNumero(stock + convertido)} ${insumo.unidad_medida}"
            } else {
                "Ingresa la cantidad${if (usaBultos) " y el peso por bulto" else ""} para calcular el nuevo stock."
            }
        }

        val watcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = actualizarVistaPrevia()
            override fun afterTextChanged(s: Editable?) = Unit
        }
        form.edtCantidadMovimiento.addTextChangedListener(watcher)
        form.edtPesoBulto.addTextChangedListener(watcher)
        form.spinnerUnidadMovimiento.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) = actualizarVistaPrevia()
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }
        actualizarVistaPrevia()
        form.btnCancelarMovimiento.setOnClickListener { dialog.dismiss() }
        form.btnGuardarMovimiento.setOnClickListener {
            val cantidad = leerDecimal(form.edtCantidadMovimiento.text.toString())
            if (cantidad == null || !cantidad.isFinite() || cantidad <= 0.0) {
                form.edtCantidadMovimiento.error = "Ingresa una cantidad mayor que cero"
                return@setOnClickListener
            }
            val seleccion = unidades[form.spinnerUnidadMovimiento.selectedItemPosition.coerceAtLeast(0)]
            val usaBultos = seleccion == "Bultos" || unidadBase == "Bultos"
            val peso = leerDecimal(form.edtPesoBulto.text.toString())
            if (usaBultos && (peso == null || !peso.isFinite() || peso <= 0.0)) {
                form.edtPesoBulto.error = "Indica el peso en kg de cada bulto"
                return@setOnClickListener
            }
            val cantidadConvertida = convertirCantidad(cantidad, seleccion, unidadBase, peso)
            if (cantidadConvertida == null || !cantidadConvertida.isFinite() || cantidadConvertida <= 0.0) {
                Toast.makeText(requireContext(), "No se pudo convertir la cantidad", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            form.btnGuardarMovimiento.isEnabled = false
            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val response = RetrofitClient.api.registrarMovimientoInsumo(
                        insumo.id, RegistrarMovimientoRequest("entrada", cantidadConvertida, null)
                    )
                    if (!response.isSuccessful) {
                        throw IllegalStateException("No se pudo registrar la entrada (HTTP ${response.code()})")
                    }
                    if (isAdded) {
                        Toast.makeText(requireContext(), "Entrada registrada", Toast.LENGTH_SHORT).show()
                        dialog.dismiss()
                        cargarDatosBodega(silenciosa = true)
                    }
                } catch (e: Exception) {
                    if (isAdded) {
                        Toast.makeText(requireContext(), e.message ?: "Error al registrar entrada", Toast.LENGTH_LONG).show()
                        form.btnGuardarMovimiento.isEnabled = true
                    }
                }
            }
        }
        dialog.show()
        dialog.window?.setLayout((resources.displayMetrics.widthPixels * 0.92f).toInt(), WindowManager.LayoutParams.WRAP_CONTENT)
    }

    private fun leerDecimal(texto: String): Double? = texto.trim().replace(',', '.').toDoubleOrNull()

    private fun normalizarUnidad(unidad: String): String? = when (unidad.trim().lowercase(Locale.ROOT)) {
        "kg", "kilogramo", "kilogramos" -> "Kg"
        "g", "gr", "gramo", "gramos" -> "Gramos"
        "bulto", "bultos" -> "Bultos"
        "t", "ton", "tonelada", "toneladas" -> "Toneladas"
        else -> null
    }

    private fun convertirCantidad(cantidad: Double, origen: String, destino: String, pesoBulto: Double?): Double? {
        fun aKg(valor: Double, unidad: String): Double? = when (unidad) {
            "Kg" -> valor
            "Gramos" -> valor / 1000.0
            "Toneladas" -> valor * 1000.0
            "Bultos" -> pesoBulto?.let { valor * it }
            else -> null
        }
        val kg = aKg(cantidad, origen) ?: return null
        return when (destino) {
            "Kg" -> kg
            "Gramos" -> kg * 1000.0
            "Toneladas" -> kg / 1000.0
            "Bultos" -> pesoBulto?.let { kg / it }
            else -> null
        }
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
        ultimosInsumos = null
        ultimaGranja = null
        datosMostrados = false
        cargando = false
    }
}