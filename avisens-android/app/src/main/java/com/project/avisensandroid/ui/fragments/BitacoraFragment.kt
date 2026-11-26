
package com.project.avisensandroid.ui.fragments

import com.project.avisensandroid.ui.ColoresAdaptativos
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.controller.FotosMortalidad
import com.project.avisensandroid.controller.OfflineCache
import com.project.avisensandroid.databinding.Po06BitacoraMortalidadOpBinding
import com.project.avisensandroid.model.RegistroMortalidadResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

class BitacoraFragment : BaseBottomNavFragment() {
    private val entradaTarjetas = AnimacionesTarjetas()


    private var _binding: Po06BitacoraMortalidadOpBinding? = null

    private val binding
        get() = _binding!!

    private val localeEspanol = Locale("es", "ES")

    private var cargaJob: Job? = null
    private var fotosJob: Job? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = Po06BitacoraMortalidadOpBinding.inflate(
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
        entradaTarjetas.reiniciar()

        configurarBottomNav(R.id.nav_bitacora)
        animarPestanaBitacora(binding.tabsBitacora, 0)

        binding.tbnConsumo.setOnClickListener {
            abrirPestanaBitacora(BitacoraConsumoFragment(), 0)
        }

        binding.tbnEnfermo.setOnClickListener {
            abrirPestanaBitacora(BitacoraEnfermoFragment(), 0)
        }

        binding.btnRegistrarEvento.setOnClickListener {
            (requireActivity() as MainActivity)
                .mostrarDialogRegistrarEvento()
        }
    }

    override fun onResume() {
        super.onResume()

        if (_binding != null) {
            cargarBitacora()
        }
    }

    fun actualizarAlRecuperarInternet() {
        if (_binding != null && isAdded) {
            cargarBitacora()
        }
    }

    fun actualizarSilenciosamente() {
        if (_binding != null && isAdded) {
            cargarBitacora(silenciosa = true)
        }
    }

    // ============================================================
    // CARGAR REGISTROS DE MORTALIDAD
    // ============================================================

    private fun cargarBitacora(
        silenciosa: Boolean = false
    ) {
        if (silenciosa && cargaJob?.isActive == true) return
        cargaJob?.cancel()
        cargaJob = viewLifecycleOwner.lifecycleScope.launch {
            try {
                val activity = requireActivity() as MainActivity
                val galponId = activity.obtenerGalponSeleccionadoId()
                if (galponId == null) {
                    mostrarRegistros(emptyList(), emptyMap())
                    return@launch
                }
                val (registros, nombres) = coroutineScope {
                    val registrosJob = async {
                        val datos = mutableListOf<RegistroMortalidadResponse>()
                        var pagina = 1
                        do {
                            val response = RetrofitClient.api.listarRegistrosMortalidad(pagina, 100)
                            check(response.isSuccessful) { "Error de mortalidad: ${response.code()}" }
                            val body = checkNotNull(response.body()) { "Sin datos de mortalidad" }
                            datos.addAll(body.data)
                            val total = body.meta.totalPages.coerceAtLeast(pagina)
                            pagina++
                        } while (pagina <= total)
                        datos
                    }
                    val lotesJob = async {
                        val nombres = mutableMapOf<Int, String>()
                        var pagina = 1
                        do {
                            val response = RetrofitClient.api.listarLotes(pagina, 100)
                            check(response.isSuccessful) { "Error de lotes: ${response.code()}" }
                            val body = checkNotNull(response.body()) { "Sin datos de lotes" }
                            body.data.forEach { lote ->
                                val galpon = lote.galpon
                                if (galpon != null && galpon.id == galponId) {
                                    nombres[lote.id] = galpon.nombre.trim().ifBlank { "Galpón $galponId" }
                                }
                            }
                            val total = body.meta.totalPages.coerceAtLeast(pagina)
                            pagina++
                        } while (pagina <= total)
                        nombres
                    }
                    registrosJob.await() to lotesJob.await()
                }
                val filtrados = registros.filter { it.lote_id in nombres }
                    .sortedWith(compareByDescending<RegistroMortalidadResponse> { it.fecha.take(10) }
                        .thenByDescending { it.fecha_registro })
                if (_binding != null && activity.obtenerGalponSeleccionadoId() == galponId) {
                    mostrarRegistros(filtrados, nombres)
                    val contexto = activity.applicationContext
                    if (OfflineCache.hayInternet(contexto) && fotosJob?.isActive != true) {
                        fotosJob = viewLifecycleOwner.lifecycleScope.launch {
                            filtrados.filter { !it.foto_mime_type.isNullOrBlank() }.forEach { registro ->
                                try { FotosMortalidad.precargar(contexto, registro.id) }
                                catch (e: CancellationException) { throw e }
                                catch (_: Exception) { /* Se reintentará en la siguiente actualización. */ }
                            }
                        }
                    }
                }

            } catch (e: CancellationException) {
                throw e

            } catch (e: Exception) {
                if (!silenciosa && _binding != null && isAdded) {
                    mostrarError(
                        "Error al cargar mortalidad: " +
                                (e.message ?: "error desconocido")
                    )
                }
            }
        }
    }

    // ============================================================
    // MOSTRAR REGISTROS AGRUPADOS POR FECHA
    // ============================================================

    private fun mostrarRegistros(
        registros: List<RegistroMortalidadResponse>,
        nombresGalponPorLote: Map<Int, String>
    ) {
        val contenedor = binding.containerRegistros

        entradaTarjetas.comenzar()
        contenedor.removeAllViews()

        if (registros.isEmpty()) {
            contenedor.addView(
                TextView(requireContext()).apply {
                    text = "No hay registros de mortalidad"
                    textSize = 14f
                    gravity = Gravity.CENTER

                    setTextColor(
                        androidx.core.content.ContextCompat.getColor(context, R.color.adaptive_text_66736d)
                    )

                    setPadding(
                        dp(16),
                        dp(40),
                        dp(16),
                        dp(40)
                    )
                }
            )

            return
        }

        // Agrupar registros por fecha seleccionada
        // al registrar el evento.

        registros.groupBy {
            it.fecha.take(10)
        }.forEach { (fecha, registrosDelDia) ->

            val encabezadoFecha =
                TextView(requireContext()).apply {

                    text = formatearFechaLarga(fecha)

                    textSize = 15f

                    setTypeface(
                        null,
                        Typeface.BOLD
                    )

                    setTextColor(
                        androidx.core.content.ContextCompat.getColor(context, R.color.adaptive_text_183c2e)
                    )

                    setPadding(
                        dp(2),
                        dp(16),
                        0,
                        dp(10)
                    )
                }

            contenedor.addView(encabezadoFecha)
            entradaTarjetas.mostrar(encabezadoFecha, "fecha:$fecha", true)

            // Una tarjeta independiente por registro.

            registrosDelDia.forEach { registro ->

                val nombreGalpon =
                    nombresGalponPorLote[registro.lote_id]
                        ?: "Galpón no disponible"

                agregarRegistro(
                    registro,
                    nombreGalpon
                )
            }
        }
    }

    // ============================================================
    // CREAR TARJETA DE REGISTRO
    // ============================================================

    private fun agregarRegistro(
        registro: RegistroMortalidadResponse,
        nombreGalpon: String
    ) {
        val contexto = requireContext()

        val tarjeta = LinearLayout(contexto).apply {
            orientation = LinearLayout.VERTICAL

            background = ContextCompat.getDrawable(
                contexto,
                R.drawable.bg_tarjeta_mortalidad
            )

            elevation = dp(2).toFloat()

            setPadding(
                dp(14),
                dp(14),
                dp(14),
                dp(14)
            )

            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(10)
            }
        }

        // --------------------------------------------------------
        // FUNCIÓN PARA CREAR TEXTOS
        // --------------------------------------------------------

        fun crearTexto(
            valor: String,
            tamano: Float,
            color: String,
            negrita: Boolean = false
        ): TextView {
            return TextView(contexto).apply {
                text = valor
                textSize = tamano

                setTextColor(
                    ColoresAdaptativos.texto(requireContext(), color)
                )

                if (negrita) {
                    setTypeface(
                        null,
                        Typeface.BOLD
                    )
                }
            }
        }

        // --------------------------------------------------------
        // 1. NOMBRE DEL GALPÓN
        // --------------------------------------------------------

        tarjeta.addView(
            crearTexto(
                nombreGalpon,
                14f,
                "#345846",
                true
            )
        )

        // --------------------------------------------------------
        // 2. CANTIDAD DE AVES
        // --------------------------------------------------------

        val textoCantidad = crearTexto(
            "${registro.cantidad_aves} aves registradas",
            16f,
            "#183C2E",
            true
        ).apply {
            setPadding(
                0,
                dp(9),
                0,
                dp(5)
            )
        }

        tarjeta.addView(textoCantidad)

        // --------------------------------------------------------
        // FUNCIÓN PARA MOSTRAR DETALLES
        // --------------------------------------------------------

        fun agregarDetalle(
            titulo: String,
            valor: String?
        ) {
            if (valor.isNullOrBlank()) {
                return
            }

            val detalle = crearTexto(
                "$titulo: $valor",
                12f,
                "#46544C"
            )

            tarjeta.addView(
                detalle,
                LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    topMargin = dp(5)
                }
            )
        }

        // --------------------------------------------------------
        // 3. USUARIO QUE REALIZÓ EL REGISTRO
        // --------------------------------------------------------

        agregarDetalle(
            "Registró",
            "Usuario #${registro.usuario_id}"
        )

        // --------------------------------------------------------
        // 4. CAUSA PROBABLE
        // --------------------------------------------------------

        agregarDetalle(
            "Causa probable",
            registro.causa_presuntiva
        )

        // --------------------------------------------------------
        // 5. DISPOSICIÓN
        // --------------------------------------------------------

        agregarDetalle(
            "Disposición",
            registro.disposicion
        )

        // --------------------------------------------------------
        // 6. OBSERVACIONES
        // Se dejan al final porque pueden ocupar varias líneas.
        // --------------------------------------------------------

        agregarDetalle(
            "Observaciones",
            registro.observaciones
        )

        val pendiente = com.project.avisensandroid.controller.FotosMortalidad.pendiente(contexto, registro.id)
        if (pendiente != null || !registro.foto_mime_type.isNullOrBlank()) {
            val boton = android.widget.Button(contexto).apply {
                text = "Ver fotografía"
                setAllCaps(false)
            }
            tarjeta.addView(boton)
            boton.setOnClickListener {
                boton.isEnabled = false
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val bitmap = FotosMortalidad.obtener(contexto, registro.id)
                        if (bitmap == null) {
                            mostrarError("Fotografía no disponible. Conéctate a internet para descargarla.")
                            return@launch
                        }
                        if (_binding == null || !isAdded) return@launch
                        val imagen = android.widget.ImageView(contexto).apply {
                            setImageBitmap(bitmap)
                            scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
                            adjustViewBounds = true
                        }
                        val visor = android.app.Dialog(contexto, android.R.style.Theme_Material_NoActionBar)
                        visor.setContentView(imagen)
                        imagen.setOnClickListener { visor.dismiss() }
                        visor.show()
                        if (pendiente != null && pendiente.exists() && OfflineCache.hayInternet(contexto)) {
                            try {
                                val bytes = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { pendiente.readBytes() }
                                FotosMortalidad.subir(contexto, registro.id, bytes)
                            } catch (e: CancellationException) { throw e }
                            catch (_: Exception) { /* La foto local sigue disponible. */ }
                        }
                    } catch (e: CancellationException) { throw e }
                    catch (_: Exception) { mostrarError("No se pudo cargar la fotografía. Revisa tu conexión.") }
                    finally { boton.isEnabled = true }
                }
            }
        }

        binding.containerRegistros.addView(tarjeta)
        entradaTarjetas.mostrar(tarjeta, "mortalidad:${registro.id}")
    }

    // ============================================================
    // FORMATEAR FECHA
    // Ejemplo: 2026-11-20 -> 20 noviembre 2026
    // ============================================================

    private fun formatearFechaLarga(
        fecha: String
    ): String {
        return try {
            val fechaLocal = LocalDate.parse(
                fecha.take(10),
                DateTimeFormatter.ISO_LOCAL_DATE
            )

            fechaLocal.format(
                DateTimeFormatter.ofPattern(
                    "d MMMM yyyy",
                    localeEspanol
                )
            )

        } catch (_: Exception) {
            fecha
        }
    }

    // ============================================================
    // MOSTRAR ERRORES
    // ============================================================

    private fun mostrarError(
        mensaje: String
    ) {
        if (!isAdded) {
            return
        }

        Toast.makeText(
            requireContext(),
            mensaje,
            Toast.LENGTH_LONG
        ).show()
    }

    // ============================================================
    // CONVERTIR DP
    // ============================================================

    private fun dp(
        valor: Int
    ): Int {
        return (
                valor * resources.displayMetrics.density
                ).toInt()
    }

    // ============================================================
    // LIMPIAR BINDING
    // ============================================================

    override fun onDestroyView() {
        fotosJob?.cancel()
        fotosJob = null
        cargaJob?.cancel()
        cargaJob = null
        super.onDestroyView()
        _binding = null
    }
}