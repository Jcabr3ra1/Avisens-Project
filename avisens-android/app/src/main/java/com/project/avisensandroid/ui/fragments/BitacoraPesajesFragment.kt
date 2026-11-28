package com.project.avisensandroid.ui.fragments

import com.project.avisensandroid.ui.estiloCancelar

import android.app.DatePickerDialog
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.google.gson.Gson
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.*
import com.project.avisensandroid.databinding.Po09BitacoraPesajesOpBinding
import com.project.avisensandroid.databinding.R09RegistrarPesajeBinding
import com.project.avisensandroid.databinding.ItemPesajeBinding
import com.project.avisensandroid.model.*
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.*
import retrofit2.Response
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.abs

class BitacoraPesajesFragment : BaseBottomNavFragment() {
    private var _binding: Po09BitacoraPesajesOpBinding? = null
    private val b get() = _binding!!
    private var lote: LoteResponse? = null
    private var curva = emptyList<PuntoPesoObjetivo>()
    private var pesajes = emptyList<PesajeResponse>()
    private var carga: Job? = null
    private var firma = ""
    private var filtro = 0
    private var busqueda = ""
    private var desde: String? = null
    private var hasta: String? = null
    private val anim = AnimacionesTarjetas()
    private val activityMain get() = requireActivity() as MainActivity
    private fun formato() = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC"); isLenient = false
    }

    private fun hoy() = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("America/Bogota")
    }.format(Date())

    private fun fechaAnterior(dias: Int): String {
        val calendario = Calendar.getInstance(TimeZone.getTimeZone("America/Bogota"))
        calendario.add(Calendar.DAY_OF_YEAR, -dias)
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = calendario.timeZone
        }.format(calendario.time)
    }

    private fun dia(l: LoteResponse, fecha: String): Int =
        ((formato().parse(fecha.take(10))!!.time - formato().parse(l.fecha_ingreso.take(10))!!.time) / 86400000L).toInt() + 1

    private fun objetivo(l: LoteResponse, fecha: String): Double? {
        val d = dia(l, fecha)
        val validos = curva.filter { it.peso_esperado_g != null }
        if (validos.isEmpty() || d !in validos.first().dia..validos.last().dia) return null
        return curva.lastOrNull { it.dia <= d }?.peso_esperado_g?.takeIf { it > 0 }
    }

    private fun desvio(p: Double, o: Double?) = o?.takeIf { it > 0 }?.let { (p - it) / it * 100 }
    private fun numero(n: Double) = String.format(Locale("es", "CO"), "%,.1f", n)
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        state: Bundle?
    ): View {
        _binding = Po09BitacoraPesajesOpBinding.inflate(inflater, container, false); return b.root
    }

    override fun onViewCreated(view: View, state: Bundle?) {
        aplicarFuente(view)
        configurarBottomNav(R.id.nav_bitacora)
        anim.reiniciar(); firma = ""
        animarPestanaBitacora(b.tabsBitacora, 2)
        b.tabM.setOnClickListener { abrirPestanaBitacora(BitacoraFragment(), 2) }
        b.tabE.setOnClickListener { abrirPestanaBitacora(BitacoraEnfermoFragment(), 2) }
        b.tabC.setOnClickListener { abrirPestanaBitacora(BitacoraConsumoFragment(), 2) }
        b.edtBuscarPeso.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) =
                Unit

            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                busqueda = s?.toString()?.trim().orEmpty(); firma = ""; pintar()
            }

            override fun afterTextChanged(s: android.text.Editable?) = Unit
        })
        b.filtroPeso.setOnClickListener {
            b.panelFiltrosPeso.visibility =
                if (b.panelFiltrosPeso.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }
        b.spinnerFechaPeso.adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            listOf(
                "Todas las fechas",
                "Hoy",
                "Ayer",
                "Últimos 7 días",
                "Últimos 30 días",
                "Personalizado"
            )
        )
        b.spinnerDesvioPeso.adapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            listOf("Todos", "Fuera de rango", "En rango")
        )
        b.btnAplicarPeso.setOnClickListener {
            fun aplicar(inicio: String?, fin: String?) {
                filtro = b.spinnerDesvioPeso.selectedItemPosition
                desde = inicio; hasta = fin; firma = ""; pintar()
                b.panelFiltrosPeso.visibility = View.GONE
                b.filtroPeso.text = if (filtro != 0 || desde != null) "Filtros •" else "Filtros ▾"
            }
            when (b.spinnerFechaPeso.selectedItemPosition) {
                1 -> aplicar(hoy(), hoy())
                2 -> aplicar(fechaAnterior(1), fechaAnterior(1))
                3 -> aplicar(fechaAnterior(6), hoy())
                4 -> aplicar(fechaAnterior(29), hoy())
                5 -> elegirFecha { inicio ->
                    elegirFecha { fin ->
                        aplicar(
                            minOf(inicio, fin),
                            maxOf(inicio, fin)
                        )
                    }
                }

                else -> aplicar(null, null)
            }
        }
        b.registrarPeso.setOnClickListener { formulario(null) }
        b.registrarPeso.isEnabled = false
        Hu56OfflineQueue.programar(requireContext())
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.RESUMED) {
                var cola = ""
                var ciclos = 0
                while (true) {
                    val actual = Hu56OfflineQueue.registros(requireContext())
                        .filter { it.optString("tipo") == "pesaje" }.toString()
                    if (cola != actual || ciclos % 10 == 0) {
                        cola = actual; actualizarSilenciosamente()
                    }
                    ciclos++
                    delay(1500)
                }
            }
        }
        actualizarSilenciosamente()
    }

    override fun onResume() {
        super.onResume(); actualizarSilenciosamente()
    }

    private suspend fun <T> paginas(f: suspend (Int) -> Response<PaginatedResponse<T>>): List<T> {
        val lista = mutableListOf<T>();
        var p = 1
        do {
            val r = f(p); check(r.isSuccessful) { "HTTP ${r.code()}" };
            val cuerpo = requireNotNull(r.body()); lista.addAll(cuerpo.data); p++
        } while (p <= cuerpo.meta.totalPages)
        return lista
    }

    fun actualizarSilenciosamente() {
        if (_binding == null || carga?.isActive == true) return
        carga = viewLifecycleOwner.lifecycleScope.launch {
            val galpon = activityMain.obtenerGalponSeleccionadoId()
            if (galpon == null) {
                b.lotePesaje.visibility = View.VISIBLE; b.lotePesaje.text =
                    "Selecciona primero un galpón"; b.registrarPeso.isEnabled = false; return@launch
            }
            suspend fun cargar(cache: Boolean) {
                val api = if (cache) RetrofitClient.apiCache else RetrofitClient.api
                val l = paginas {
                    api.listarLotesCompletos(
                        it,
                        100
                    )
                }.filter { it.galpon.id == galpon && it.estado.equals("activo", true) }
                    .maxByOrNull { it.fecha_ingreso }
                if (activityMain.obtenerGalponSeleccionadoId() != galpon) return
                if (l == null) {
                    lote = null; curva = emptyList(); pesajes = emptyList(); pintar(); return
                }
                val datos = paginas { api.listarPesajes(it, 100) }.filter { it.lote_id == l.id }
                val puntos = try {
                    paginas {
                        api.curvaObjetivo(
                            l.marca_alimento?.lowercase(Locale.ROOT) ?: "italcol",
                            l.sexo?.lowercase(Locale.ROOT) ?: "mixto",
                            it,
                            100
                        )
                    }.sortedBy { it.dia }
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    emptyList()
                }
                if (activityMain.obtenerGalponSeleccionadoId() != galpon) return
                lote = l; pesajes = datos; curva = puntos; pintar()
                b.estadoPesaje.text = ""
                b.estadoPesaje.visibility = View.GONE
            }
            if (lote == null) try {
                cargar(true)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
            }
            if (!OfflineCache.hayInternet(requireContext())) return@launch
            try {
                cargar(false)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                if (lote == null) {
                    b.estadoPesaje.text =
                        "No se pudieron actualizar los pesajes"; b.estadoPesaje.visibility =
                        View.VISIBLE
                }
            }
        }
    }

    private fun elegirFecha(resultado: (String) -> Unit) {
        val c = Calendar.getInstance()
        DatePickerDialog(
            requireContext(),
            { _, y, m, d -> resultado(String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)) },
            c.get(Calendar.YEAR),
            c.get(Calendar.MONTH),
            c.get(Calendar.DAY_OF_MONTH)
        ).show()
    }

    private fun coincide(fecha: String, d: Double?, texto: String): Boolean {
        val fechaOk = fecha.take(10) >= (desde ?: "") && fecha.take(10) <= (hasta ?: "9999")
        val desvioOk = when (filtro) {
            1 -> d != null && abs(d) > 7
            2 -> d != null && abs(d) <= 7
            else -> true
        }
        return fechaOk && desvioOk && (busqueda.isBlank() || texto.contains(
            busqueda,
            ignoreCase = true
        ))
    }

    private fun pintar() {
        val l = lote
        b.registrarPeso.isEnabled = l != null
        b.lotePesaje.visibility = if (l == null) View.VISIBLE else View.GONE
        b.lotePesaje.text = if (l == null) "No hay lote activo" else ""
        val pendientes = Hu56OfflineQueue.registros(requireContext())
            .filter { it.optString("tipo") == "pesaje" && it.optString("estado") != "SINCRONIZADO" }
            .mapNotNull { item ->
                runCatching {
                    item to Gson().fromJson(
                        item.getString("payload"),
                        PesajeRequest::class.java
                    )
                }.getOrNull()
            }.filter { it.second.lote_id == l?.id }
        val nueva = "$l|$curva|$pesajes|$pendientes"
        if (firma == nueva) return
        firma = nueva
        b.listaPeso.removeAllViews(); anim.comenzar()
        fun fila(
            titulo: String,
            detalle: String,
            estado: String,
            clave: String,
            click: (() -> Unit)? = null
        ) {
            val item = ItemPesajeBinding.inflate(layoutInflater, b.listaPeso, false)
            aplicarFuente(item.root)
            item.itemPesoTitulo.text = titulo; item.itemPesoDetalle.text =
                detalle; item.itemPesoEstado.text = estado
            click?.let { item.root.setOnClickListener { it() } }; b.listaPeso.addView(item.root); anim.mostrar(
                item.root,
                clave
            )
        }

        val filas = mutableListOf<Pair<String, () -> Unit>>()
        pendientes.filter { (_, p) ->
            coincide(
                p.fecha, l?.let { desvio(p.peso_promedio_g, objetivo(it, p.fecha)) },
                "${p.fecha} ${numero(p.peso_promedio_g)} ${p.cantidad_aves_pesadas} ${p.observaciones}"
            )
        }.forEach { (item, p) ->
            filas.add(p.fecha.take(10) to {
                fila(
                    "${numero(p.peso_promedio_g)} g",
                    p.cantidad_aves_pesadas?.let { "$it aves pesadas" } ?: "Muestra no registrada",
                    when (item.optString("estado")) {
                        "REVISAR" -> "Envío por confirmar, no repetir"
                        "ERROR" -> item.optString("error")
                        else -> "Pendiente de sincronización"
                    }, item.optString("id"))
            })
        }
        pesajes.filter { p ->
            coincide(
                p.fecha,
                l?.let { desvio(p.peso_promedio_g, p.peso_objetivo_g ?: objetivo(it, p.fecha)) },
                "${p.fecha} ${numero(p.peso_promedio_g)} ${p.cantidad_aves_pesadas} ${p.observaciones}"
            )
        }.forEach { p ->
            val dd =
                l?.let { desvio(p.peso_promedio_g, p.peso_objetivo_g ?: objetivo(it, p.fecha)) }
            filas.add(p.fecha.take(10) to {
                fila(
                    "${numero(p.peso_promedio_g)} g",
                    p.cantidad_aves_pesadas?.let { "$it aves pesadas" } ?: "Muestra no registrada",
                    dd?.let { "Desviación: ${numero(it)} %" } ?: "Sin referencia",
                    "p${p.id}") { opciones(p) }
            })
        }
        filas.groupBy { it.first }.toSortedMap(compareByDescending<String> { it })
            .forEach { (fecha, registros) ->
                val encabezado = TextView(requireContext()).apply {
                    text = runCatching {
                        SimpleDateFormat("EEEE, d 'de' MMMM 'de' yyyy", Locale("es", "CO")).apply {
                            timeZone = TimeZone.getTimeZone("UTC")
                        }.format(formato().parse(fecha)!!).replaceFirstChar { it.uppercase() }
                    }.getOrDefault(fecha)
                    textSize = 16f
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    setTextColor(
                        androidx.core.content.ContextCompat.getColor(
                            context,
                            R.color.adaptive_text_183c2e
                        )
                    )
                    val densidad = resources.displayMetrics.density
                    setPadding(
                        (2 * densidad).toInt(),
                        (16 * densidad).toInt(),
                        0,
                        (4 * densidad).toInt()
                    )
                }
                b.listaPeso.addView(encabezado)
                anim.mostrar(encabezado, "fecha-$fecha")
                registros.forEach { it.second.invoke() }
            }
        if (b.listaPeso.childCount == 0) fila(
            "Sin pesajes",
            "Registra el primer pesaje del lote",
            "",
            "vacio"
        )
    }

    private fun opciones(p: PesajeResponse) {
        val propietario = UserSession.role(requireContext()) == UserRole.PROPIETARIO
        val opciones = if (propietario) arrayOf("Editar", "Eliminar") else arrayOf("Editar")
        AlertDialog.Builder(requireContext()).setTitle("Pesaje ${p.fecha.take(10)}")
            .setItems(opciones) { _, i ->
                if (i == 0) formulario(p) else AlertDialog.Builder(requireContext())
                    .setMessage("¿Eliminar este pesaje?").setNegativeButton("Cancelar", null)
                    .setPositiveButton("Eliminar") { _, _ ->
                        viewLifecycleOwner.lifecycleScope.launch {
                            try {
                                val r =
                                    RetrofitClient.api.eliminarPesaje(p.id); check(r.isSuccessful); actualizarSilenciosamente()
                            } catch (e: CancellationException) {
                                throw e
                            } catch (_: Exception) {
                                mensaje("No se pudo eliminar el pesaje")
                            }
                        }
                    }.show().estiloCancelar()
            }.show()
    }

    private fun mensaje(s: String) = Toast.makeText(requireContext(), s, Toast.LENGTH_LONG).show()
    private fun formulario(p: PesajeResponse?) {
        val l = lote ?: return
        val f = R09RegistrarPesajeBinding.inflate(layoutInflater).also { aplicarFuente(it.root) }
        f.fechaPeso.setText(p?.fecha?.take(10) ?: hoy()); f.fechaPeso.isFocusable = false
        f.promedioPeso.setText(
            p?.peso_promedio_g?.toString() ?: ""
        ); f.muestraPeso.setText(p?.cantidad_aves_pesadas?.toString() ?: "")
        f.minPeso.setText(
            p?.peso_minimo_g?.toString() ?: ""
        ); f.maxPeso.setText(p?.peso_maximo_g?.toString() ?: ""); f.obsPeso.setText(
            p?.observaciones ?: ""
        )
        fun preview() {
            f.objetivoManual.setText(runCatching {
                objetivo(
                    l,
                    f.fechaPeso.text.toString()
                )
            }.getOrNull()?.toString() ?: ""); f.previewPeso.text =
                "Peso objetivo: " + (runCatching {
                    objetivo(
                        l,
                        f.fechaPeso.text.toString()
                    )
                }.getOrNull()?.let { numero(it) + " g" } ?: "Sin referencia")
        }
        preview()
        p?.peso_objetivo_g?.let { f.objetivoManual.setText(it.toString()) }
        f.fechaPeso.setOnClickListener {
            val c = Calendar.getInstance(); DatePickerDialog(
            requireContext(),
            { _, y, m, d ->
                f.fechaPeso.setText(
                    String.format(
                        Locale.US,
                        "%04d-%02d-%02d",
                        y,
                        m + 1,
                        d
                    )
                ); preview()
            },
            c.get(Calendar.YEAR),
            c.get(Calendar.MONTH),
            c.get(Calendar.DAY_OF_MONTH)
        ).show()
        }
        val dialog = AlertDialog.Builder(requireContext())
            .setTitle(if (p == null) "Registrar pesaje" else "Editar pesaje").setView(f.root)
            .setNegativeButton("Cancelar", null).setPositiveButton("Guardar", null).create()
        dialog.setOnShowListener {
            dialog.estiloCancelar()
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                fun valor(e: EditText) = e.text.toString().replace(',', '.').toDoubleOrNull()
                val peso = valor(f.promedioPeso);
                val muestra = f.muestraPeso.text.toString().toIntOrNull();
                val min = valor(f.minPeso);
                val max = valor(f.maxPeso);
                val fecha = f.fechaPeso.text.toString()
                val valida = runCatching {
                    formato().format(formato().parse(fecha)!!) == fecha && dia(
                        l,
                        fecha
                    ) > 0 && fecha <= hoy()
                }.getOrDefault(false)
                if (!valida || peso == null || !peso.isFinite() || peso <= 0 || peso > 10000 || (f.muestraPeso.text.isNotBlank() && (muestra == null || muestra !in 1..l.cantidad_inicial)) || (f.minPeso.text.isNotBlank() && (min == null || !min.isFinite() || min <= 0 || min > peso)) || (f.maxPeso.text.isNotBlank() && (max == null || !max.isFinite() || max < peso || max > 10000))) {
                    mensaje("Revisa fecha, peso y cantidad de aves"); return@setOnClickListener
                }
                val objetivoManual = valor(f.objetivoManual)
                if (f.objetivoManual.text.isNotBlank() && (objetivoManual == null || !objetivoManual.isFinite() || objetivoManual <= 0 || objetivoManual > 10000)) {
                    mensaje("Revisa el peso objetivo"); return@setOnClickListener
                }
                val req = PesajeRequest(
                    l.id,
                    fecha,
                    peso,
                    muestra,
                    min,
                    max,
                    objetivoManual,
                    f.obsPeso.text.toString().trim()
                )
                if (p == null) {
                    if (Hu56OfflineQueue.guardar(requireContext(), "pesaje", req)) {
                        dialog.dismiss(); pintar(); actualizarSilenciosamente()
                    } else mensaje("No se pudo guardar")
                } else {
                    if (!OfflineCache.hayInternet(requireContext())) {
                        mensaje("Necesitas conexión para editar"); return@setOnClickListener
                    };
                    val boton = dialog.getButton(AlertDialog.BUTTON_POSITIVE); boton.isEnabled =
                        false; viewLifecycleOwner.lifecycleScope.launch {
                        try {
                            val r = RetrofitClient.api.editarPesaje(
                                p.id,
                                req
                            ); check(r.isSuccessful); dialog.dismiss(); actualizarSilenciosamente()
                        } catch (e: CancellationException) {
                            throw e
                        } catch (_: Exception) {
                            mensaje("No se pudo editar"); boton.isEnabled = true
                        }
                    }
                }
            }
        }; dialog.show()
    }

    private fun aplicarFuente(v: View) {
        if (v is TextView) {
            val negrita = v.typeface?.isBold == true
            v.typeface = android.graphics.Typeface.create(
                "sans-serif",
                if (negrita) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL
            )
            v.letterSpacing = 0f
        }
        if (v is ViewGroup) for (i in 0 until v.childCount) aplicarFuente(v.getChildAt(i))
    }

    override fun onPause() {
        carga?.cancel(); super.onPause()
    }

    override fun onDestroyView() {
        carga?.cancel(); _binding = null; super.onDestroyView()
    }
}
