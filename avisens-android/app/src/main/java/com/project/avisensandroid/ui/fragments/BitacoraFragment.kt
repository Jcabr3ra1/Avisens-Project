
package com.project.avisensandroid.ui.fragments

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
import com.project.avisensandroid.databinding.Po06BitacoraMortalidadOpBinding
import com.project.avisensandroid.model.RegistroMortalidadResponse
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

class BitacoraFragment : BaseBottomNavFragment() {

    private var _binding: Po06BitacoraMortalidadOpBinding? = null

    private val binding
        get() = _binding!!

    private val localeEspanol = Locale("es", "ES")

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

        configurarBottomNav(R.id.nav_bitacora)

        binding.tbnConsumo.setOnClickListener {
            (requireActivity() as MainActivity).mostrarFragment(
                BitacoraConsumoFragment()
            )
        }

        binding.tbnEnfermo.setOnClickListener {
            (requireActivity() as MainActivity).mostrarFragment(
                BitacoraEnfermoFragment()
            )
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
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val registros =
                    mutableListOf<RegistroMortalidadResponse>()

                var pagina = 1
                var totalPaginas = 1

                do {
                    val response =
                        RetrofitClient.api.listarRegistrosMortalidad(
                            page = pagina,
                            limit = 100
                        )

                    if (!response.isSuccessful) {
                        if (!silenciosa) {
                            mostrarError(
                                "No se pudieron cargar los registros. " +
                                        "Código: ${response.code()}"
                            )
                        }

                        return@launch
                    }

                    val body = response.body()

                    if (body == null) {
                        if (!silenciosa) {
                            mostrarError(
                                "La API no devolvió registros de mortalidad"
                            )
                        }

                        return@launch
                    }

                    registros.addAll(body.data)

                    totalPaginas =
                        body.meta.totalPages.coerceAtLeast(pagina)

                    pagina++

                } while (pagina <= totalPaginas)

                val activity = requireActivity() as MainActivity

                val galponId =
                    activity.obtenerGalponSeleccionadoId()

                if (galponId == null) {
                    if (_binding != null) {
                        mostrarRegistros(
                            emptyList(),
                            emptyMap()
                        )
                    }

                    return@launch
                }

                // Obtener los lotes relacionados con el galpón
                // seleccionado y sus nombres reales.

                val nombresGalponPorLote =
                    mutableMapOf<Int, String>()

                val idsLotesDelGalpon =
                    mutableSetOf<Int>()

                var paginaLotes = 1
                var totalPaginasLotes = 1

                do {
                    val respuestaLotes =
                        RetrofitClient.api.listarLotes(
                            page = paginaLotes,
                            limit = 100
                        )

                    if (!respuestaLotes.isSuccessful) {
                        throw IllegalStateException(
                            "No se pudieron consultar los lotes"
                        )
                    }

                    val cuerpoLotes =
                        respuestaLotes.body()
                            ?: throw IllegalStateException(
                                "No se recibieron datos de lotes"
                            )

                    cuerpoLotes.data.forEach { lote ->
                        if (lote.galpon?.id == galponId) {

                            idsLotesDelGalpon.add(lote.id)

                            val nombre =
                                lote.galpon.nombre.trim()

                            nombresGalponPorLote[lote.id] =
                                nombre.ifBlank {
                                    "Galpón $galponId"
                                }
                        }
                    }

                    totalPaginasLotes =
                        cuerpoLotes.meta.totalPages
                            .coerceAtLeast(paginaLotes)

                    paginaLotes++

                } while (paginaLotes <= totalPaginasLotes)

                // Filtrar y ordenar por fecha del evento.

                val filtrados = registros
                    .filter {
                        it.lote_id in idsLotesDelGalpon
                    }
                    .sortedWith(
                        compareByDescending<RegistroMortalidadResponse> {
                            it.fecha.take(10)
                        }.thenByDescending {
                            it.fecha_registro
                        }
                    )

                if (_binding != null) {
                    mostrarRegistros(
                        filtrados,
                        nombresGalponPorLote
                    )
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

        contenedor.removeAllViews()

        if (registros.isEmpty()) {
            contenedor.addView(
                TextView(requireContext()).apply {
                    text = "No hay registros de mortalidad"
                    textSize = 14f
                    gravity = Gravity.CENTER

                    setTextColor(
                        Color.parseColor("#66736D")
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
                        Color.parseColor("#183C2E")
                    )

                    setPadding(
                        dp(2),
                        dp(16),
                        0,
                        dp(10)
                    )
                }

            contenedor.addView(encabezadoFecha)

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
                    Color.parseColor(color)
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

        // --------------------------------------------------------
        // FUTURA FOTOGRAFÍA
        //
        // Cuando esté disponible la recuperación de imágenes,
        // se mostrará debajo de las observaciones.
        //
        // Por ahora no agregamos un espacio vacío.
        // --------------------------------------------------------

        binding.containerRegistros.addView(tarjeta)
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
        super.onDestroyView()
        _binding = null
    }
}