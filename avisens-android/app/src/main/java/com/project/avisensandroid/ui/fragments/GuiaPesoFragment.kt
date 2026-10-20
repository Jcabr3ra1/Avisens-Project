package com.project.avisensandroid.ui.fragments

import android.content.Context
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.FragmentGuiaPesoBinding
import com.project.avisensandroid.model.AlimentoEstimadoApi
import com.project.avisensandroid.model.CrearEstimacionAlimentoRequest
import com.project.avisensandroid.model.CrearPlanLoteRequest
import com.project.avisensandroid.model.CurvaGeneticaApiResponse
import com.project.avisensandroid.model.EstimacionAlimentoApiResponse
import com.project.avisensandroid.model.LoteResponse
import com.project.avisensandroid.model.PesajeResponse
import com.project.avisensandroid.model.PlanLoteApiResponse
import com.project.avisensandroid.model.RegistroMortalidadResponse
import com.project.avisensandroid.model.RecalcularPlanLoteRequest
import com.project.avisensandroid.model.UserRole
import com.project.avisensandroid.model.valorCurvaEnDia
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import retrofit2.Response
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.abs
import kotlin.math.ceil

class GuiaPesoFragment : BaseBottomNavFragment() {

    private data class FuenteCarga<T>(val datos: List<T>, val error: String? = null)

    private var _binding: FragmentGuiaPesoBinding? = null
    private val binding get() = _binding!!

    private var galponId: Int? = null
    private var lotesActivos: List<LoteResponse> = emptyList()
    private var loteSeleccionado: LoteResponse? = null
    private var pesajes: List<PesajeResponse> = emptyList()
    private var consumos: List<com.project.avisensandroid.model.ConsumoDiarioResponse> = emptyList()
    private var mortalidades: List<RegistroMortalidadResponse> = emptyList()
    private var planActual: PlanLoteApiResponse? = null
    private var curvaActual: CurvaGeneticaApiResponse? = null
    private var alimentoActual: EstimacionAlimentoApiResponse? = null
    private var configurandoSpinnerLotes = false
    private var programandoObjetivo = false
    private var datosListos = false
    private val puedeEditarPlan: Boolean
        get() = (activity as? MainActivity)?.obtenerRolActual() == UserRole.PROPIETARIO

    private val formatoDecimal = DecimalFormat("#,##0.0", DecimalFormatSymbols(Locale("es", "CO")))
    private val formatoEntero = DecimalFormat("#,##0", DecimalFormatSymbols(Locale("es", "CO")))
    private val formatoFecha = SimpleDateFormat("dd/MM/yyyy", Locale("es", "CO")).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    private val formatoIso = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        isLenient = false
        timeZone = TimeZone.getTimeZone("UTC")
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentGuiaPesoBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        configurarBottomNav(R.id.nav_inicio)

        binding.btnVolverGuia.setOnClickListener {
            val manager = parentFragmentManager
            if (manager.backStackEntryCount > 0) manager.popBackStack()
            else (requireActivity() as MainActivity).mostrarFragment(InicioFragment())
        }

        binding.edtPesoObjetivoLb.isEnabled = puedeEditarPlan
        binding.btnCalcularProyeccion.visibility = if (puedeEditarPlan) View.VISIBLE else View.GONE
        binding.btnRecalcularPlanGuia.visibility = if (puedeEditarPlan) View.VISIBLE else View.GONE
        binding.btnCalcularProyeccion.setOnClickListener {
            ocultarTeclado()
            viewLifecycleOwner.lifecycleScope.launch {
                guardarObjetivoYCalcular()
            }
        }
        binding.btnRecalcularPlanGuia.setOnClickListener {
            ocultarTeclado()
            viewLifecycleOwner.lifecycleScope.launch {
                recalcularPlanYAlimento()
            }
        }
        binding.edtPesoObjetivoLb.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                if (programandoObjetivo) return
                val libras = leerLibras()
                binding.txtPesoConvertidoG.text = if (libras != null && libras > 0 && libras.isFinite()) {
                    "≈ ${formatoEntero.format(libras * GRAMOS_POR_LIBRA)} g"
                } else {
                    "≈ — g"
                }
                loteSeleccionado?.let { lote ->
                    val edad = planActual?.tiempo?.dia_actual ?: diaVida(lote)
                    val ultimo = pesajesDeLote(lote.id).lastOrNull()
                    actualizarResumenObjetivo(planActual)
                    actualizarProyeccion(lote, planActual, edad, ultimo)
                    actualizarNecesidadParaObjetivo(lote, planActual, edad, ultimo)
                    actualizarAlimentoEstimado(planActual)
                }
            }
            override fun afterTextChanged(s: Editable?) = Unit
        })

        galponId = (requireActivity() as MainActivity).obtenerGalponSeleccionadoId()
        cargarDatos()
    }

    private fun cargarDatos() {
        viewLifecycleOwner.lifecycleScope.launch {
            val galponSeleccionado = galponId
            if (galponSeleccionado == null) {
                binding.txtEstadoCargaGuia.text = "Primero selecciona un galpón en Inicio para consultar su lote activo."
                binding.txtEstadoPlanGuia.text = "No se puede consultar el plan sin un galpón seleccionado."
                binding.btnCalcularProyeccion.isEnabled = false
                return@launch
            }

            binding.txtEstadoCargaGuia.text = "Consultando lote, pesajes, alimento y curva genética..."
            binding.btnCalcularProyeccion.isEnabled = false
            try {
                val todosLosLotes = cargarPaginas { pagina ->
                    RetrofitClient.api.listarLotesCompletos(page = pagina, limit = 100)
                }
                lotesActivos = todosLosLotes
                    .filter {
                        it.galpon.id == galponSeleccionado &&
                                it.estado.equals("activo", ignoreCase = true)
                    }
                    .sortedByDescending { parseFecha(it.fecha_ingreso)?.time ?: 0L }

                if (lotesActivos.isEmpty()) {
                    binding.txtEstadoCargaGuia.text = "No hay un lote activo en el galpón seleccionado."
                    binding.txtCodigoLote.text = "Lote activo: no encontrado"
                    binding.txtEstadoPlanGuia.text = "No se encontró un lote al que consultar o asignar un objetivo."
                    mostrarProyeccionNoDisponible("No hay un lote activo en el galpón seleccionado.")
                    return@launch
                }

                val fuentes = supervisorScope {
                    val pesajesDeferred = async {
                        cargarOpcional("pesajes") {
                            cargarPaginas { p -> RetrofitClient.api.listarPesajes(page = p, limit = 100) }
                        }
                    }
                    val consumosDeferred = async {
                        cargarOpcional("consumo") {
                            cargarPaginas { p -> RetrofitClient.api.listarConsumosDiarios(page = p, limit = 100) }
                        }
                    }
                    val mortalidadDeferred = async {
                        cargarOpcional("mortalidad") {
                            cargarPaginas { p -> RetrofitClient.api.listarRegistrosMortalidad(page = p, limit = 100) }
                        }
                    }
                    Triple(pesajesDeferred.await(), consumosDeferred.await(), mortalidadDeferred.await())
                }
                pesajes = fuentes.first.datos
                consumos = fuentes.second.datos
                mortalidades = fuentes.third.datos
                datosListos = true
                configurarSpinnerLotes()
                binding.btnCalcularProyeccion.isEnabled = puedeEditarPlan
                val fallos = listOfNotNull(
                    fuentes.first.error,
                    fuentes.second.error,
                    fuentes.third.error
                )
                binding.txtEstadoCargaGuia.text = if (fallos.isEmpty()) {
                    "Datos actualizados"
                } else {
                    "Datos parciales: ${fallos.joinToString(" · ")}. Revisa conexión o permisos."
                }
            } catch (cancelacion: CancellationException) {
                throw cancelacion
            } catch (e: Exception) {
                binding.txtEstadoCargaGuia.text = "No se pudo cargar el lote: ${e.message ?: "error de conexión"}"
                binding.btnCalcularProyeccion.isEnabled = false
            }
        }
    }

    private suspend fun <T> cargarOpcional(
        nombre: String,
        bloque: suspend () -> List<T>
    ): FuenteCarga<T> = try {
        FuenteCarga(datos = bloque())
    } catch (cancelacion: CancellationException) {
        throw cancelacion
    } catch (error: Exception) {
        FuenteCarga(emptyList(), "$nombre: ${error.message?.take(55) ?: "sin respuesta"}")
    }

    private fun configurarSpinnerLotes() {
        val labels = lotesActivos.map { lote ->
            val ingreso = parseFecha(lote.fecha_ingreso)?.let { formatoFecha.format(it) } ?: "fecha sin dato"
            "${lote.codigo} · ingreso $ingreso"
        }
        binding.spinnerLotesActivos.adapter = ArrayAdapter(
            requireContext(), android.R.layout.simple_spinner_item, labels
        ).also { it.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item) }
        binding.spinnerLotesActivos.visibility = if (lotesActivos.size > 1) View.VISIBLE else View.GONE
        binding.spinnerLotesActivos.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (!configurandoSpinnerLotes && position in lotesActivos.indices) {
                    seleccionarLote(lotesActivos[position])
                }
            }
        }
        configurandoSpinnerLotes = true
        binding.spinnerLotesActivos.setSelection(0, false)
        configurandoSpinnerLotes = false
        seleccionarLote(lotesActivos.first())
    }

    private fun seleccionarLote(lote: LoteResponse) {
        if (loteSeleccionado?.id == lote.id && planActual != null) return
        loteSeleccionado = lote
        planActual = null
        curvaActual = null
        alimentoActual = null
        actualizarContextoLote(lote)
        programarTextoObjetivo("")
        mostrarProyeccionNoDisponible("Consultando el plan vigente del lote.")
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                cargarPlanCurvaYAlimento(lote, conservarObjetivoActual = false)
            } catch (cancelacion: CancellationException) {
                throw cancelacion
            } catch (error: Exception) {
                if (loteSeleccionado?.id == lote.id) {
                    binding.txtEstadoPlanGuia.text = error.message ?: "No se pudo consultar el plan del lote."
                }
            }
        }
    }

    private fun actualizarContextoLote(lote: LoteResponse) {
        val edad = planActual?.tiempo?.dia_actual ?: diaVida(lote)
        val muertes = mortalidadesDeLote(lote.id).sumOf { it.cantidad_aves }
        val vivas = (lote.cantidad_inicial - muertes).coerceAtLeast(0)
        val lineaGenetica = lote.linea_genetica?.nombre?.takeIf { it.isNotBlank() } ?: "Sin asignar"
        val sexo = lote.sexo?.takeIf { it.isNotBlank() }
            ?.lowercase(Locale.ROOT)
            ?.replaceFirstChar { it.titlecase(Locale("es", "CO")) }
            ?: "—"
        binding.txtTituloGuiaPeso.text = "Guía de peso · ${lote.codigo}"
        binding.txtBreadcrumbGuia.text = "Lotes  ›  ${lote.codigo}  ›  Guía de peso"
        binding.txtCodigoLote.text = lote.codigo
        binding.txtGalponGuia.text = lote.galpon.nombre
        binding.txtDiaVidaGuia.text = edad?.toString() ?: "—"
        binding.txtDiaActualSeguimientoGuia.text = edad?.toString() ?: "—"
        binding.txtDiaVidaDetalleGuia.text = edad?.toString() ?: "—"
        binding.txtAvesAlojadasGuia.text = formatoEntero.format(lote.cantidad_inicial)
        binding.txtAvesVivasActuales.text = formatoEntero.format(vivas)
        binding.txtSexoGuia.text = sexo
        binding.txtLineaGeneticaGuia.text = lineaGenetica
        binding.txtLineaGeneticaDetalleGuia.text = lineaGenetica
    }

    private suspend fun cargarPlanCurvaYAlimento(lote: LoteResponse, conservarObjetivoActual: Boolean) {
        binding.txtEstadoPlanGuia.text = "Consultando el plan vigente..."
        val response = RetrofitClient.api.obtenerPlanLote(lote.id)
        if (loteSeleccionado?.id != lote.id) return

        if (!response.isSuccessful || response.body() == null) {
            if (response.code() == 404) {
                planActual = null
                alimentoActual = null
                curvaActual = cargarCurvaVigenteLote(lote)
                if (!conservarObjetivoActual) programarTextoObjetivo("")
                binding.txtEstadoPlanGuia.text = if (curvaActual == null) {
                    "Sin curva de referencia"
                } else {
                    "Objetivo pendiente"
                }
                actualizarResumen()
                return
            }
            binding.txtEstadoPlanGuia.text = "Plan no disponible (HTTP ${response.code()})."
            curvaActual = cargarCurvaVigenteLote(lote)
            actualizarResumen()
            return
        }

        planActual = response.body()
        val plan = planActual ?: return
        if (!conservarObjetivoActual) {
            plan.peso_objetivo_g?.let { programarTextoObjetivo(String.format(Locale.US, "%.2f", it / GRAMOS_POR_LIBRA).trimEnd('0').trimEnd('.')) }
        }

        curvaActual = cargarCurvaDelPlan(plan) ?: cargarCurvaVigenteLote(lote)
        if (loteSeleccionado?.id != lote.id) return

        alimentoActual = cargarEstimacionAlimentoSiDisponible(lote.id)
        if (loteSeleccionado?.id != lote.id) return

        binding.btnCalcularProyeccion.isEnabled = puedeEditarPlan
        if (plan.desactualizado) {
            binding.txtEstadoPlanGuia.text = "Requiere recálculo"
            mostrarAdvertencia("La configuración del lote cambió. Recalcula el plan.")
        } else {
            binding.txtEstadoPlanGuia.text = when (plan.estado_dia) {
                "calculado" -> "Calculado"
                "sin_curva" -> "Sin curva de referencia"
                "fuera_de_rango" -> "Fuera de rango"
                "datos_insuficientes" -> "Datos insuficientes"
                else -> "Pendiente"
            }
        }
        actualizarResumen()
    }


    private suspend fun cargarCurvaDelPlan(plan: PlanLoteApiResponse): CurvaGeneticaApiResponse? {
        val curvaId = plan.curva?.version_id?.takeIf { it > 0 } ?: return null
        return try {
            val response = RetrofitClient.api.obtenerCurvaGenetica(curvaId)
            if (response.isSuccessful) response.body() else null
        } catch (cancelacion: CancellationException) {
            throw cancelacion
        } catch (_: Exception) {
            null
        }
    }

    /** Carga la curva vigente aunque el lote aún no tenga un PlanLote creado. */
    private suspend fun cargarCurvaVigenteLote(lote: LoteResponse): CurvaGeneticaApiResponse? {
        val lineaId = lote.linea_genetica?.id?.takeIf { it > 0 } ?: return null
        val sexoLote = lote.sexo?.lowercase(Locale.ROOT)?.takeIf { it.isNotBlank() } ?: "mixto"
        return try {
            val curvas = cargarPaginas { pagina ->
                RetrofitClient.api.listarCurvasGeneticas(page = pagina, limit = 100)
            }
            val vigente = curvas
                .filter {
                    it.linea_genetica_id == lineaId &&
                            it.sexo.equals(sexoLote, ignoreCase = true) &&
                            it.vigente &&
                            it.estado.equals("publicada", ignoreCase = true)
                }
                .maxByOrNull { it.version ?: 0 }
                ?: return null

            val respuesta = RetrofitClient.api.obtenerCurvaGenetica(vigente.id)
            if (respuesta.isSuccessful) respuesta.body() else null
        } catch (cancelacion: CancellationException) {
            throw cancelacion
        } catch (_: Exception) {
            null
        }
    }

    private suspend fun cargarEstimacionAlimentoSiDisponible(loteId: Int): EstimacionAlimentoApiResponse? = try {
        val response = RetrofitClient.api.obtenerEstimacionAlimento(loteId)
        if (response.isSuccessful) response.body() else null
    } catch (cancelacion: CancellationException) {
        throw cancelacion
    } catch (_: Exception) {
        null
    }

    private suspend fun guardarObjetivoYCalcular() {
        val lote = loteSeleccionado
        if (lote == null) {
            Toast.makeText(requireContext(), "No hay lote seleccionado.", Toast.LENGTH_SHORT).show()
            return
        }
        if (!puedeEditarPlan) {
            Toast.makeText(requireContext(), "Solo el propietario puede cambiar el objetivo.", Toast.LENGTH_SHORT).show()
            return
        }
        val libras = leerLibras()
        if (libras == null || libras <= 0.0 || !libras.isFinite()) {
            Toast.makeText(requireContext(), "Escribe un peso objetivo válido en lb.", Toast.LENGTH_SHORT).show()
            return
        }

        val objetivoG = libras * GRAMOS_POR_LIBRA
        binding.btnCalcularProyeccion.isEnabled = false
        binding.txtEstadoCargaGuia.text = "Guardando objetivo…"
        var avisoAlimento: String? = null

        try {
            val planExistente = planActual
            val hayCambioObjetivo = planExistente?.peso_objetivo_g?.let {
                abs(it - objetivoG) > 0.5
            } ?: true

            val respuestaPlan = when {
                planExistente == null || hayCambioObjetivo -> RetrofitClient.api.crearPlanLote(
                    lote.id,
                    CrearPlanLoteRequest(
                        peso_objetivo_g = objetivoG,
                        motivo = "Objetivo actualizado desde Guía de peso"
                    )
                )
                planExistente.desactualizado -> RetrofitClient.api.recalcularPlanLote(
                    lote.id,
                    RecalcularPlanLoteRequest("Recalculo desde Guía de peso")
                )
                else -> null
            }

            if (respuestaPlan != null) {
                if (!respuestaPlan.isSuccessful || respuestaPlan.body() == null) {
                    throw IllegalStateException(
                        "No se guardó el objetivo (HTTP ${respuestaPlan.code()}): ${detalleError(respuestaPlan)}"
                    )
                }
                planActual = respuestaPlan.body()
            }

            val planActualizado = planActual
                ?: throw IllegalStateException("El backend no devolvió el plan.")

            curvaActual = cargarCurvaDelPlan(planActualizado) ?: cargarCurvaVigenteLote(lote)
            // Actualiza fecha y requisitos aunque el cálculo de alimento falle después.
            actualizarResumen()

            val comidaAnterior = if (respuestaPlan != null) {
                null
            } else {
                alimentoActual ?: cargarEstimacionAlimentoSiDisponible(lote.id)
            }
            val necesitaAlimentoNuevo = respuestaPlan != null || comidaAnterior == null ||
                    comidaAnterior.desactualizado ||
                    comidaAnterior.alimento_estimado?.requiere_recalculo == true ||
                    comidaAnterior.plan_vigente?.es_el_mismo == false

            alimentoActual = comidaAnterior
            if (necesitaAlimentoNuevo) {
                alimentoActual = null
                try {
                    val responseAlimento = RetrofitClient.api.crearEstimacionAlimento(
                        lote.id,
                        CrearEstimacionAlimentoRequest("Estimación actualizada desde Guía de peso")
                    )
                    if (responseAlimento.isSuccessful && responseAlimento.body() != null) {
                        alimentoActual = responseAlimento.body()
                    } else {
                        avisoAlimento = "Alimento no calculado (HTTP ${responseAlimento.code()})."
                    }
                } catch (cancelacion: CancellationException) {
                    throw cancelacion
                } catch (error: Exception) {
                    avisoAlimento = "Alimento no calculado: ${error.message?.take(90) ?: "error de conexión"}."
                }
            }

            actualizarResumen()
            binding.txtEstadoCargaGuia.text = if (avisoAlimento == null) {
                "Objetivo y proyección actualizados"
            } else {
                "Objetivo guardado · alimento pendiente"
            }

            if (avisoAlimento != null) {
                mostrarAdvertencia("La proyección de peso está actualizada, pero el alimento no: $avisoAlimento")
                Toast.makeText(requireContext(), "Objetivo guardado; revisa el cálculo de alimento.", Toast.LENGTH_LONG).show()
            } else {
                Toast.makeText(requireContext(), "Objetivo y proyección actualizados.", Toast.LENGTH_SHORT).show()
            }

        } catch (cancelacion: CancellationException) {
            throw cancelacion
        } catch (e: Exception) {
            // Si el plan ya quedó guardado, conserva sus datos visibles y permite reintentar.
            actualizarResumen()
            binding.txtEstadoCargaGuia.text = e.message ?: "No se pudo guardar el objetivo."
            mostrarAdvertencia(e.message ?: "No se pudo actualizar el plan.")
        } finally {
            binding.btnCalcularProyeccion.isEnabled = puedeEditarPlan
        }
    }

    private suspend fun recalcularPlanYAlimento() {
        val lote = loteSeleccionado
        if (lote == null) {
            Toast.makeText(requireContext(), "No hay lote seleccionado.", Toast.LENGTH_SHORT).show()
            return
        }
        if (!puedeEditarPlan) return

        val planGuardado = planActual
        val objetivoIngresadoG = leerLibras()?.times(GRAMOS_POR_LIBRA)
        val objetivoCambio = objetivoIngresadoG != null &&
                planGuardado?.peso_objetivo_g != null &&
                abs(objetivoIngresadoG - planGuardado.peso_objetivo_g) > 0.5

        if (planGuardado == null || objetivoCambio) {
            // Si no hay plan todavía, o se editó el objetivo, usa el flujo de guardar.
            guardarObjetivoYCalcular()
            return
        }

        binding.btnRecalcularPlanGuia.isEnabled = false
        binding.btnCalcularProyeccion.isEnabled = false
        binding.txtEstadoCargaGuia.text = "Recalculando plan…"

        try {
            val respuesta = RetrofitClient.api.recalcularPlanLote(
                lote.id,
                RecalcularPlanLoteRequest("Recalculo manual desde Guía de peso")
            )
            if (!respuesta.isSuccessful || respuesta.body() == null) {
                throw IllegalStateException(
                    "No se pudo recalcular el plan (HTTP ${respuesta.code()})."
                )
            }

            planActual = respuesta.body()
            val plan = planActual ?: throw IllegalStateException("El backend no devolvió el plan.")
            curvaActual = cargarCurvaDelPlan(plan) ?: cargarCurvaVigenteLote(lote)
            actualizarResumen()

            val respuestaAlimento = RetrofitClient.api.crearEstimacionAlimento(
                lote.id,
                CrearEstimacionAlimentoRequest("Recalculo desde Guía de peso")
            )
            if (respuestaAlimento.isSuccessful && respuestaAlimento.body() != null) {
                alimentoActual = respuestaAlimento.body()
                binding.txtEstadoCargaGuia.text = "Plan actualizado"
            } else {
                alimentoActual = null
                binding.txtEstadoCargaGuia.text = "Plan actualizado · alimento pendiente"
            }
            actualizarResumen()
        } catch (cancelacion: CancellationException) {
            throw cancelacion
        } catch (error: Exception) {
            binding.txtEstadoCargaGuia.text = error.message ?: "No se pudo recalcular el plan."
            mostrarAdvertencia(error.message ?: "No se pudo recalcular el plan.")
        } finally {
            binding.btnRecalcularPlanGuia.isEnabled = puedeEditarPlan
            binding.btnCalcularProyeccion.isEnabled = puedeEditarPlan
        }
    }

    private fun actualizarResumenObjetivo(plan: PlanLoteApiResponse?) {
        val objetivoG = objetivoEnPantallaG(plan)
        binding.txtPesoObjetivoResumen.text = objetivoG?.let {
            "${formatoDecimal.format(it / GRAMOS_POR_LIBRA)} lb"
        } ?: "—"

        val diaObjetivo = objetivoG?.let { diaObjetivoParaPeso(it, plan) }
        binding.txtDiaObjetivoPlan.text = diaObjetivo?.let {
            if (abs(it - kotlin.math.round(it)) < 0.05) {
                kotlin.math.round(it).toInt().toString()
            } else {
                formatoDecimal.format(it)
            }
        } ?: "—"
    }

    private fun actualizarResumen() {
        val lote = loteSeleccionado ?: return
        val plan = planActual
        val puntos = curvaActual?.puntos.orEmpty()
        val curva = curvaActual
        val diaActual = plan?.tiempo?.dia_actual ?: diaVida(lote)
        binding.txtDiaVidaGuia.text = diaActual?.toString() ?: "—"
        binding.txtDiaActualSeguimientoGuia.text = diaActual?.toString() ?: "—"
        binding.txtDiaVidaDetalleGuia.text = diaActual?.toString() ?: "—"
        val pesajesLote = pesajesDeLote(lote.id)
        val ultimoPesaje = pesajesLote.lastOrNull()
        val pesoEsperadoEnRango = diaActual?.let { dia ->
            puntos.valorCurvaEnDia(dia.toDouble()) { punto -> punto.peso_esperado_g }
        }
        val pesoEsperadoPorPesajes = estimarPesoHoyDesdePesajes(lote, diaActual, ultimoPesaje)
        val pesoEsperadoExtrapolado = if (pesoEsperadoEnRango == null && pesoEsperadoPorPesajes == null) {
            diaActual?.let { pesoCurvaExtrapoladoEnDia(it) }
        } else null
        val pesoEsperadoHoy = pesoEsperadoEnRango ?: pesoEsperadoPorPesajes ?: pesoEsperadoExtrapolado
        val diaUltimoPesaje = ultimoPesaje?.let { edadEnFecha(lote, it.fecha) }
        val esperadoEnFechaPesaje = diaUltimoPesaje?.let { edad ->
            puntos.valorCurvaEnDia(edad.toDouble()) { punto -> punto.peso_esperado_g }
                ?: pesoCurvaExtrapoladoEnDia(edad)
        }
        val desvio = if (ultimoPesaje != null && esperadoEnFechaPesaje != null && esperadoEnFechaPesaje > 0.0) {
            ((ultimoPesaje.peso_promedio_g - esperadoEnFechaPesaje) / esperadoEnFechaPesaje) * 100.0
        } else null

        binding.txtUltimoPesoReal.text = ultimoPesaje?.let { "${formatoEntero.format(it.peso_promedio_g)} g" } ?: "Sin peso verificado"
        binding.txtFechaUltimoPesaje.text = ultimoPesaje?.let {
            parseFecha(it.fecha)?.let { fecha -> formatoFecha.format(fecha) } ?: it.fecha.take(10)
        } ?: "Sin pesaje"
        binding.txtPesoEsperadoHoy.text = pesoEsperadoHoy?.let {
            "${formatoEntero.format(it)} g"
        } ?: "—"
        binding.txtDesvioPeso.text = desvio?.let {
            "${if (it > 0) "+" else ""}${formatoDecimal.format(it)}% vs curva"
        } ?: "Sin comparación"
        binding.txtPuntosCurvaGuia.text = puntos.size.toString()
        val ultimoDiaPublicado = puntos.maxOfOrNull { it.dia }
        binding.txtFuenteCurvaGuia.text = when {
            pesoEsperadoEnRango != null && curva != null -> "Curva v${curva.version ?: "—"} · ${curva.fuente ?: "fuente no informada"}"
            pesoEsperadoPorPesajes != null -> "Día fuera del rango genético${ultimoDiaPublicado?.let { " (hasta día $it)" } ?: ""} · estimación por pesajes recientes."
            pesoEsperadoExtrapolado != null -> "Día fuera del rango publicado (hasta día ${ultimoDiaPublicado ?: "—"}) · extrapolación orientativa, no valor oficial."
            curva == null -> "No hay curva genética asignada ni pesajes recientes suficientes."
            else -> "No hay puntos suficientes para el día actual ni pesajes recientes para estimarlo."
        }
        actualizarResumenObjetivo(plan)

        actualizarConsumoRegistrado(lote)
        actualizarAlimentoEstimado(plan)
        actualizarProyeccion(lote, plan, diaActual, ultimoPesaje)
        actualizarNecesidadParaObjetivo(lote, plan, diaActual, ultimoPesaje)

        when {
            plan?.desactualizado == true -> mostrarAdvertencia("Plan desactualizado. Guarda y recalcula.")
            plan?.estado_dia == "fuera_de_rango" -> mostrarAdvertencia("El objetivo supera los puntos de curva cargados. La fecha mostrada es orientativa; carga la curva completa para calcular oficialmente el plan y el alimento.")
            desvio != null && desvio <= -10.0 -> mostrarAdvertencia("${formatoDecimal.format(abs(desvio))}% por debajo de la curva. Revisa el ritmo de crecimiento.")
            desvio != null && desvio < -5.0 -> mostrarAdvertencia("Por debajo de la curva. Revisa pesajes, consumo y ambiente.")
            curva == null && plan?.estado_dia == "calculado" -> mostrarAdvertencia("No se pudo leer la curva. Verifica permisos y conexión.")
            else -> ocultarAdvertencia()
        }
    }

    private fun actualizarProyeccion(
        lote: LoteResponse,
        plan: PlanLoteApiResponse?,
        diaActual: Int?,
        ultimoPesaje: PesajeResponse?
    ) {
        val objetivoG = objetivoEnPantallaG(plan)
        if (objetivoG == null || objetivoG <= 0.0 || !objetivoG.isFinite()) {
            mostrarProyeccionNoDisponible("Ingresa el peso objetivo.")
            return
        }

        val puntos = curvaActual?.puntos.orEmpty()
        val diaObjetivo = diaObjetivoParaPeso(objetivoG, plan)
        val elPlanCoincideConObjetivo = plan?.peso_objetivo_g?.let { abs(it - objetivoG) <= 0.5 } == true

        // Si hay al menos dos pesajes recientes, prioriza el ritmo observado.
        val tasa = tasaHistoricaReciente(lote, pesajesDeLote(lote.id), diaActual)
        val edadUltimoPesaje = ultimoPesaje?.let { edadEnFecha(lote, it.fecha) }
        val diasDesdeUltimo = if (diaActual != null && edadUltimoPesaje != null) {
            (diaActual - edadUltimoPesaje).coerceAtLeast(0)
        } else 0
        val pesoEstimadoHoyPorHistorial = if (
            tasa != null && ultimoPesaje != null &&
            esPesajePlausibleParaEdad(diaActual, ultimoPesaje.peso_promedio_g) &&
            diasDesdeUltimo <= MAX_DIAS_DESDE_PESAJE
        ) {
            ultimoPesaje.peso_promedio_g + tasa * diasDesdeUltimo
        } else null

        if (pesoEstimadoHoyPorHistorial != null && tasa != null) {
            val dias = if (pesoEstimadoHoyPorHistorial >= objetivoG) {
                0
            } else {
                ceil((objetivoG - pesoEstimadoHoyPorHistorial) / tasa).toInt()
            }
            if (dias > MAX_DIAS_PROYECCION) {
                mostrarProyeccionNoDisponible("El ritmo reciente supera $MAX_DIAS_PROYECCION días; revisa los pesajes.")
                return
            }
            val hoy = fechaActual()
            val yaAlcanzoConPesaje = ultimoPesaje != null && ultimoPesaje.peso_promedio_g >= objetivoG
            val centro = if (dias == 0 && yaAlcanzoConPesaje) {
                parseFecha(ultimoPesaje?.fecha) ?: hoy
            } else {
                sumarDias(hoy, dias)
            }
            val banda = if (dias == 0) 0 else ceil(dias * PORCENTAJE_BANDA).toInt().coerceAtLeast(1)
            val inicio = if (dias == 0 && yaAlcanzoConPesaje) centro else sumarDias(hoy, (dias - banda).coerceAtLeast(0))
            val fin = if (dias == 0 && yaAlcanzoConPesaje) centro else sumarDias(hoy, dias + banda)
            mostrarProyeccionConFechas(
                centro,
                inicio,
                fin,
                dias,
                "Por pesajes · ${formatoDecimal.format(tasa)} g/día"
            )
            return
        }

        // Sin tendencia real, calcula la fecha usando los puntos de la curva publicada.
        if (diaObjetivo == null) {
            val estado = plan?.estado_dia
            val mensaje = when (estado) {
                "sin_curva" -> "Asigna una línea genética con curva vigente."
                "fuera_de_rango" -> "El objetivo está fuera del rango de la curva. Registra pesajes recientes para estimarlo."
                "datos_insuficientes" -> "La curva no tiene datos suficientes para este objetivo."
                else -> if (puntos.isEmpty()) {
                    "No se pudo leer la curva genética. Verifica permisos y línea genética."
                } else {
                    "El objetivo queda fuera de la curva y faltan pesajes recientes."
                }
            }
            mostrarProyeccionNoDisponible(mensaje)
            return
        }

        val fechaBackend = if (elPlanCoincideConObjetivo) {
            parseFecha(plan?.tiempo?.fecha_estimada)
                ?: parseFecha(plan?.resultado?.fecha_salida_calculada)
        } else {
            null
        }
        val diaObjetivoEntero = ceil(diaObjetivo).toInt()
        val fechaIngreso = parseFecha(plan?.snapshot?.fecha_ingreso) ?: parseFecha(lote.fecha_ingreso)
        val fechaPorCurva = fechaIngreso?.let { sumarDias(it, diaObjetivoEntero - 1) }
        val fechaObjetivo = fechaBackend ?: fechaPorCurva
        val diasRestantes = (if (elPlanCoincideConObjetivo) plan?.tiempo?.dias_restantes else null)
            ?: diaActual?.let { ceil(diaObjetivo - it).toInt().coerceAtLeast(0) }

        if (fechaObjetivo == null || diasRestantes == null) {
            mostrarProyeccionNoDisponible("Falta la fecha de ingreso o el día de vida del lote.")
            return
        }
        if (diasRestantes > MAX_DIAS_PROYECCION) {
            mostrarProyeccionNoDisponible("La fecha calculada supera $MAX_DIAS_PROYECCION días.")
            return
        }
        val objetivoFueraDelRangoPublicado = diaObjetivoEnCurva(objetivoG) == null
        val fechaTeoricaPasada = fechaObjetivo.before(fechaActual()) && diaActual != null && diaObjetivo < diaActual.toDouble()
        val banda = if (diasRestantes == 0) 0 else ceil(diasRestantes * PORCENTAJE_BANDA).toInt().coerceAtLeast(1)
        val metodo = when {
            objetivoFueraDelRangoPublicado && fechaTeoricaPasada ->
                "Extrapolación fuera de la curva publicada; fecha teórica pasada. Confirma con un pesaje reciente."
            objetivoFueraDelRangoPublicado ->
                "Extrapolación orientativa fuera de la curva publicada; amplía la curva para validar el resultado."
            fechaTeoricaPasada ->
                "Fecha teórica calculada por curva, ya pasada; confirma con un pesaje reciente."
            else -> "Según la curva genética publicada"
        }
        mostrarProyeccionConFechas(
            fechaObjetivo,
            sumarDias(fechaObjetivo, -banda),
            sumarDias(fechaObjetivo, banda),
            diasRestantes,
            metodo
        )
    }

    private fun objetivoEnPantallaG(plan: PlanLoteApiResponse?): Double? {
        val libras = leerLibras()
        if (libras != null && libras > 0.0 && libras.isFinite()) {
            return libras * GRAMOS_POR_LIBRA
        }
        return plan?.peso_objetivo_g?.takeIf { it > 0.0 && it.isFinite() }
    }

    private fun diaObjetivoParaPeso(
        objetivoG: Double,
        plan: PlanLoteApiResponse?
    ): Double? {
        val planTieneEsteObjetivo = plan?.peso_objetivo_g?.let {
            abs(it - objetivoG) <= 0.5
        } == true
        if (!planTieneEsteObjetivo) {
            return diaObjetivoEnCurva(objetivoG) ?: diaObjetivoExtrapolado(objetivoG)
        }
        return plan?.resultado?.dia_objetivo_interpolado
            ?: plan?.resultado?.dia_objetivo?.toDouble()
            ?: diaObjetivoEnCurva(objetivoG)
            ?: diaObjetivoExtrapolado(objetivoG)
    }

    /** Interpola únicamente dentro de los puntos publicados; no los modifica. */
    private fun diaObjetivoEnCurva(objetivoG: Double): Double? {
        val puntos = curvaActual?.puntos.orEmpty()
            .filter { it.peso_esperado_g != null }
            .sortedBy { it.dia }
        if (puntos.size < 2) return null

        val primero = puntos.first()
        val ultimo = puntos.last()
        val pesoInicial = primero.peso_esperado_g ?: return null
        val pesoFinal = ultimo.peso_esperado_g ?: return null
        if (objetivoG < pesoInicial || objetivoG > pesoFinal) return null

        puntos.firstOrNull { punto ->
            val peso = punto.peso_esperado_g
            peso != null && abs(peso - objetivoG) < 0.01
        }?.let { return it.dia.toDouble() }

        for ((anterior, siguiente) in puntos.zipWithNext()) {
            val pesoA = anterior.peso_esperado_g ?: continue
            val pesoB = siguiente.peso_esperado_g ?: continue
            if (objetivoG in pesoA..pesoB && pesoB > pesoA) {
                val fraccion = (objetivoG - pesoA) / (pesoB - pesoA)
                return anterior.dia + fraccion * (siguiente.dia - anterior.dia)
            }
        }
        return null
    }

    /** Pendiente media del tramo final de la curva. Solo se usa como estimación orientativa fuera del rango publicado. */
    private fun pendienteFinalCurvaGPorDia(): Double? {
        val puntos = curvaActual?.puntos.orEmpty()
            .filter { it.peso_esperado_g != null }
            .sortedBy { it.dia }
            .takeLast(7)
        if (puntos.size < 2) return null
        val primero = puntos.first()
        val ultimo = puntos.last()
        val dias = ultimo.dia - primero.dia
        val pesoPrimero = primero.peso_esperado_g ?: return null
        val pesoUltimo = ultimo.peso_esperado_g ?: return null
        if (dias <= 0) return null
        return ((pesoUltimo - pesoPrimero) / dias).takeIf { it > 0.0 && it.isFinite() }
    }

    /** Estima días futuros usando solo la pendiente terminal; el resultado se etiqueta como extrapolado. */
    private fun pesoCurvaExtrapoladoEnDia(dia: Int): Double? {
        val puntos = curvaActual?.puntos.orEmpty()
            .filter { it.peso_esperado_g != null }
            .sortedBy { it.dia }
        val ultimo = puntos.lastOrNull() ?: return null
        val pesoUltimo = ultimo.peso_esperado_g ?: return null
        val deltaDias = dia - ultimo.dia
        if (deltaDias <= 0 || deltaDias > MAX_DIAS_EXTRAPOLACION_CURVA) return null
        val pendiente = pendienteFinalCurvaGPorDia() ?: return null
        return (pesoUltimo + pendiente * deltaDias).takeIf { it > 0.0 && it.isFinite() }
    }

    /** Calcula día de objetivo fuera del rango publicado, solo para mostrar una proyección marcada como orientativa. */
    private fun diaObjetivoExtrapolado(objetivoG: Double): Double? {
        val puntos = curvaActual?.puntos.orEmpty()
            .filter { it.peso_esperado_g != null }
            .sortedBy { it.dia }
        val ultimo = puntos.lastOrNull() ?: return null
        val ultimoPeso = ultimo.peso_esperado_g ?: return null
        if (objetivoG <= ultimoPeso) return null
        val pendiente = pendienteFinalCurvaGPorDia() ?: return null
        val deltaDias = (objetivoG - ultimoPeso) / pendiente
        if (!deltaDias.isFinite() || deltaDias <= 0.0 || deltaDias > MAX_DIAS_EXTRAPOLACION_CURVA) return null
        return ultimo.dia + deltaDias
    }

    /** Descarta valores evidentemente incompatibles con la edad (p. ej. 6 g en un lote de 72 días). */
    private fun esPesajePlausibleParaEdad(diaActual: Int?, pesoG: Double): Boolean {
        if (!pesoG.isFinite() || pesoG <= 0.0) return false
        return diaActual == null || diaActual <= 14 || pesoG >= 100.0
    }

    /** Si la curva no cubre hoy, usa la tendencia reciente de pesajes (si hay al menos dos útiles). */
    private fun estimarPesoHoyDesdePesajes(
        lote: LoteResponse,
        diaActual: Int?,
        ultimoPesaje: PesajeResponse?
    ): Double? {
        if (diaActual == null || ultimoPesaje == null) return null
        if (!esPesajePlausibleParaEdad(diaActual, ultimoPesaje.peso_promedio_g)) return null
        val tasa = tasaHistoricaReciente(lote, pesajesDeLote(lote.id), diaActual) ?: return null
        val edadUltimo = edadEnFecha(lote, ultimoPesaje.fecha) ?: return null
        val diasDesde = diaActual - edadUltimo
        if (diasDesde < 0 || diasDesde > MAX_DIAS_DESDE_PESAJE) return null
        return (ultimoPesaje.peso_promedio_g + tasa * diasDesde)
            .takeIf { it > 0.0 && it.isFinite() }
    }

    private fun actualizarNecesidadParaObjetivo(
        lote: LoteResponse,
        plan: PlanLoteApiResponse?,
        diaActual: Int?,
        ultimoPesaje: PesajeResponse?
    ) {
        val objetivoG = objetivoEnPantallaG(plan)
        if (objetivoG == null || objetivoG <= 0.0) {
            binding.txtPesoFaltante.text = "Define el objetivo"
            binding.txtGananciaNecesaria.text = "—"
            return
        }

        val edadPesaje = ultimoPesaje?.let { edadEnFecha(lote, it.fecha) }
        val diasDesdePesaje = if (diaActual != null && edadPesaje != null) {
            (diaActual - edadPesaje).coerceAtLeast(0)
        } else null
        val tasa = tasaHistoricaReciente(lote, pesajesDeLote(lote.id), diaActual)
        var baseSegunCurva = false
        var diaBase = diaActual

        val pesoBase = when {
            ultimoPesaje != null && esPesajePlausibleParaEdad(diaActual, ultimoPesaje.peso_promedio_g) &&
                    tasa != null && diasDesdePesaje != null && diasDesdePesaje <= MAX_DIAS_DESDE_PESAJE ->
                ultimoPesaje.peso_promedio_g + tasa * diasDesdePesaje
            ultimoPesaje != null && diasDesdePesaje == 0 &&
                    esPesajePlausibleParaEdad(diaActual, ultimoPesaje.peso_promedio_g) ->
                ultimoPesaje.peso_promedio_g
            diaActual != null -> {
                val pesoCurva = curvaActual?.puntos?.valorCurvaEnDia(diaActual.toDouble()) { it.peso_esperado_g }
                    ?: pesoCurvaExtrapoladoEnDia(diaActual)
                if (pesoCurva != null) {
                    baseSegunCurva = true
                    pesoCurva
                } else {
                    diaBase = edadPesaje
                    ultimoPesaje?.peso_promedio_g
                }
            }
            else -> {
                diaBase = edadPesaje
                ultimoPesaje?.peso_promedio_g
            }
        }

        if (pesoBase == null) {
            binding.txtPesoFaltante.text = "Sin peso base"
            binding.txtGananciaNecesaria.text = "Registra un pesaje"
            return
        }

        val diferencia = objetivoG - pesoBase
        binding.txtPesoFaltante.text = if (diferencia > 0) {
            "${formatoEntero.format(diferencia)} g · ${formatoDecimal.format(diferencia / GRAMOS_POR_LIBRA)} lb"
        } else {
            "Meta superada"
        }

        if (diferencia <= 0) {
            binding.txtGananciaNecesaria.text = "0 g/día"
            return
        }

        val diaObjetivo = diaObjetivoParaPeso(objetivoG, plan)
        val planCoincideConObjetivo = plan?.peso_objetivo_g?.let { abs(it - objetivoG) <= 0.5 } == true
        val dias = (if (planCoincideConObjetivo && (baseSegunCurva || diasDesdePesaje == 0)) {
            plan?.tiempo?.dias_restantes
        } else null) ?: if (diaObjetivo != null && diaBase != null) {
            ceil(diaObjetivo - diaBase).toInt().coerceAtLeast(0)
        } else if (tasa != null) {
            ceil(diferencia / tasa).toInt().coerceAtLeast(0)
        } else {
            null
        }

        val fuente = if (baseSegunCurva) "curva" else "pesajes"
        binding.txtGananciaNecesaria.text = when {
            dias == null -> "Falta curva o pesajes"
            dias <= 0 -> "Sin días estimados"
            else -> "${formatoEntero.format(diferencia / dias)} g/ave/día · $fuente"
        }
    }

    private fun mostrarProyeccionConFechas(
        fechaEstimada: Date,
        fechaInicio: Date,
        fechaFin: Date,
        diasRestantes: Int,
        metodo: String
    ) {
        binding.txtFechaEstimadaSalida.text = formatoFecha.format(fechaEstimada)
        binding.txtRangoFechasSalida.text = "Rango: ${formatoFecha.format(fechaInicio)} – ${formatoFecha.format(fechaFin)}"
        binding.txtDiasRestantesSalida.text = when {
            fechaEstimada.before(fechaActual()) -> "Fecha teórica pasada · confirma con pesaje actual"
            diasRestantes <= 0 -> "Objetivo previsto para hoy"
            else -> "$diasRestantes días restantes"
        }
        binding.txtMetodoProyeccion.text = metodo
    }

    private fun actualizarConsumoRegistrado(lote: LoteResponse) {
        val registros = consumosDelLote(lote.id).filter { (it.alimento_kg ?: 0.0) > 0.0 }
        val avesVivas = (lote.cantidad_inicial - mortalidadesDeLote(lote.id).sumOf { it.cantidad_aves }).coerceAtLeast(0)
        if (registros.isEmpty() || avesVivas <= 0) {
            binding.txtConsumoRealPorAve.text = "Sin registros de alimento suficientes"
            return
        }
        val totalKg = registros.sumOf { it.alimento_kg ?: 0.0 }
        binding.txtConsumoRealPorAve.text = "${formatoDecimal.format(totalKg / avesVivas)} kg/ave viva (${registros.size} registros)"
    }

    private fun actualizarAlimentoEstimado(plan: PlanLoteApiResponse?) {
        val objetivoG = objetivoEnPantallaG(plan)
        val objetivoDia = objetivoG?.let { diaObjetivoParaPeso(it, plan) }
        val consumoCurvaG = objetivoDia?.let { dia ->
            curvaActual?.puntos?.valorCurvaEnDia(dia) { punto -> punto.consumo_acumulado_g }
        }
        val planCoincideConObjetivo = objetivoG != null && plan?.peso_objetivo_g?.let {
            abs(it - objetivoG) <= 0.5
        } == true
        val estimacion = alimentoActual.takeIf { planCoincideConObjetivo }
        val gramosPorAve = estimacion?.resultado?.consumo_por_ave_g
        binding.txtConsumoProyectadoPorAve.text = when {
            gramosPorAve != null && gramosPorAve > 0.0 -> "${formatoEntero.format(gramosPorAve)} g/ave"
            consumoCurvaG != null && consumoCurvaG > 0.0 -> "${formatoEntero.format(consumoCurvaG)} g/ave"
            estimacion?.estado_alimento == "plan_sin_dia_objetivo" -> "Sin día objetivo"
            else -> "Sin estimación"
        }

        val totalKg = estimacion?.resultado?.consumo_total_kg
        binding.txtAlimentoTotalLote.text = when {
            totalKg != null && totalKg > 0 -> "${formatoDecimal.format(totalKg)} kg"
            !planCoincideConObjetivo -> "Pendiente de cálculo"
            estimacion?.estado_alimento != null && estimacion.estado_alimento != "calculado" -> "No estimado"
            else -> "— kg"
        }
        val alimento = estimacion?.alimento_estimado
        val pendiente = alimento?.pendiente_desde_hoy_kg?.toDoubleOrNull()
        binding.txtAlimentoPendienteHoy.text = when {
            pendiente != null -> "${formatoDecimal.format(pendiente)} kg pendientes"
            alimento?.requiere_recalculo == true || estimacion?.desactualizado == true -> "Recalcular estimación de alimento"
            alimento != null && !alimento.disponible && alimento.motivo_no_disponible != null -> "Sin estimación de alimento"
            else -> if (planCoincideConObjetivo) "Sin alimento calculado" else "Guarda el objetivo para estimar alimento"
        }

        val fcr = objetivoDia?.let { dia ->
            curvaActual?.puntos?.valorCurvaEnDia(dia) { punto -> punto.fcr_objetivo }
        }
        binding.txtFcrProyectado.text = if (fcr != null && fcr > 0.0 && fcr.isFinite()) {
            formatoDecimal.format(fcr)
        } else {
            "—"
        }
        if (estimacion?.desactualizado == true || alimento?.requiere_recalculo == true) {
            binding.txtEstadoPlanGuia.text = "Recalcular alimento"
        }
    }

    private fun motivoAlimento(alimento: AlimentoEstimadoApi): String = when (alimento.motivo_no_disponible) {
        "estado_alimento_no_calculado" -> "el cálculo de alimento no se completó"
        "algoritmo_distinto" -> "la estimación usa otra versión del algoritmo"
        "curva_no_disponible" -> "la curva no dispone del consumo necesario"
        "total_no_reproducible" -> "no se puede reproducir el total del snapshot"
        else -> alimento.motivo_no_disponible ?: "sin detalle"
    }

    private fun tasaHistoricaReciente(
        lote: LoteResponse,
        historicos: List<PesajeResponse>,
        diaActual: Int?
    ): Double? {
        if (diaActual == null) return null
        val puntos = historicos.mapNotNull { pesaje ->
            val edad = edadEnFecha(lote, pesaje.fecha) ?: return@mapNotNull null
            if (edadFueraVentana(edad = edad, diaActual = diaActual) || pesaje.peso_promedio_g <= 0.0) null
            else edad to pesaje.peso_promedio_g
        }.distinctBy { it.first }.sortedBy { it.first }.takeLast(4)
        if (puntos.size < 2) return null
        val tasas = puntos.zipWithNext().mapNotNull { (anterior, actual) ->
            val dias = actual.first - anterior.first
            if (dias <= 0) null else ((actual.second - anterior.second) / dias).takeIf { it > 0.0 && it.isFinite() }
        }
        return tasas.takeIf { it.isNotEmpty() }?.average()?.takeIf { it > 0.0 && it.isFinite() }
    }

    private fun edadFueraVentana(edad: Int, diaActual: Int): Boolean =
        edad < (diaActual - VENTANA_HISTORIAL_DIAS).coerceAtLeast(1) || edad > diaActual

    private fun mostrarProyeccionNoDisponible(mensaje: String) {
        binding.txtFechaEstimadaSalida.text = "—"
        binding.txtRangoFechasSalida.text = mensaje
        binding.txtDiasRestantesSalida.text = "— días restantes"
        binding.txtMetodoProyeccion.text = ""
    }

    private fun mostrarAdvertencia(mensaje: String) {
        binding.txtAdvertenciaProyeccion.text = mensaje
        binding.txtAdvertenciaProyeccion.visibility = View.VISIBLE
    }

    private fun ocultarAdvertencia() {
        binding.txtAdvertenciaProyeccion.visibility = View.GONE
    }

    private fun programarTextoObjetivo(valor: String) {
        programandoObjetivo = true
        binding.edtPesoObjetivoLb.setText(valor)
        val libras = leerLibras()
        binding.txtPesoConvertidoG.text = if (libras != null && libras > 0.0) {
            "≈ ${formatoEntero.format(libras * GRAMOS_POR_LIBRA)} g"
        } else {
            "≈ — g"
        }
        programandoObjetivo = false
    }

    private fun pesajesDeLote(loteId: Int): List<PesajeResponse> = pesajes
        .filter { it.lote_id == loteId && fechaNoPosteriorAHoy(it.fecha) && it.peso_promedio_g > 0.0 }
        .sortedBy { parseFecha(it.fecha)?.time ?: 0L }
        .groupBy { it.fecha.substringBefore('T').take(10) }
        .mapNotNull { (_, delDia) -> delDia.maxByOrNull { it.id } }
        .sortedBy { parseFecha(it.fecha)?.time ?: 0L }

    private fun consumosDelLote(loteId: Int) = consumos.filter {
        it.lote_id == loteId && fechaNoPosteriorAHoy(it.fecha)
    }

    private fun mortalidadesDeLote(loteId: Int): List<RegistroMortalidadResponse> = mortalidades.filter {
        it.lote_id == loteId && fechaNoPosteriorAHoy(it.fecha)
    }

    private fun diaVida(lote: LoteResponse): Int? {
        val ingreso = parseFecha(lote.fecha_ingreso) ?: return null
        val transcurridos = ((fechaActual().time - ingreso.time) / MILLIS_POR_DIA).toInt()
        return if (transcurridos < 0) null else transcurridos + 1
    }

    private fun edadEnFecha(lote: LoteResponse, fecha: String): Int? {
        val ingreso = parseFecha(lote.fecha_ingreso) ?: return null
        val medicion = parseFecha(fecha) ?: return null
        val transcurridos = ((medicion.time - ingreso.time) / MILLIS_POR_DIA).toInt()
        return if (transcurridos < 0) null else transcurridos + 1
    }

    private fun leerLibras(): Double? = binding.edtPesoObjetivoLb.text?.toString()
        ?.trim()?.replace(',', '.')?.toDoubleOrNull()

    private fun ocultarTeclado() {
        val imm = requireContext().getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(binding.edtPesoObjetivoLb.windowToken, 0)
    }

    private fun fechaActual(): Date {
        val valor = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        return parseFecha(valor) ?: Date()
    }

    private fun sumarDias(fecha: Date, dias: Int): Date {
        val calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"), Locale.US)
        calendar.time = fecha
        calendar.add(Calendar.DAY_OF_YEAR, dias)
        return calendar.time
    }

    private fun parseFecha(valor: String?): Date? {
        if (valor.isNullOrBlank()) return null
        return runCatching { formatoIso.parse(valor.substringBefore('T').take(10)) }.getOrNull()
    }

    private fun fechaNoPosteriorAHoy(fecha: String): Boolean {
        val fechaRegistro = parseFecha(fecha) ?: return false
        return fechaRegistro.time <= fechaActual().time
    }

    private suspend fun <T> cargarPaginas(
        request: suspend (Int) -> Response<com.project.avisensandroid.model.PaginatedResponse<T>>
    ): List<T> {
        val datos = mutableListOf<T>()
        var pagina = 1
        var totalPaginas = 1
        do {
            val response = request(pagina)
            if (!response.isSuccessful) throw IllegalStateException("La API respondió HTTP ${response.code()}.")
            val body = response.body() ?: throw IllegalStateException("La API no devolvió contenido.")
            datos += body.data
            totalPaginas = body.meta.totalPages.coerceAtLeast(pagina)
            pagina++
        } while (pagina <= totalPaginas)
        return datos
    }

    private fun detalleError(response: Response<*>): String = runCatching {
        response.errorBody()?.string()?.take(350).orEmpty().ifBlank { response.message() }
    }.getOrDefault(response.message())

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }

    companion object {
        private const val GRAMOS_POR_LIBRA = 453.59237
        private const val MILLIS_POR_DIA = 86_400_000L
        private const val VENTANA_HISTORIAL_DIAS = 21
        private const val MAX_DIAS_DESDE_PESAJE = 21
        private const val MAX_DIAS_PROYECCION = 120
        private const val MAX_DIAS_EXTRAPOLACION_CURVA = 90
        private const val PORCENTAJE_BANDA = 0.15
    }
}
