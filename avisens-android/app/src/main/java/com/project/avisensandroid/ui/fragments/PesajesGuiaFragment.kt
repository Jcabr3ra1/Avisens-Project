package com.project.avisensandroid.ui.fragments

import com.project.avisensandroid.ui.estiloCancelar

import android.app.DatePickerDialog
import android.os.Bundle
import android.view.*
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.*
import com.project.avisensandroid.databinding.SeccionPesajesGuiaBinding
import com.project.avisensandroid.databinding.R09RegistrarPesajeBinding
import com.project.avisensandroid.databinding.ItemPesajeBinding
import com.project.avisensandroid.model.*
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.*
import retrofit2.Response
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.abs

class PesajesGuiaFragment : Fragment() {
    private var _binding: SeccionPesajesGuiaBinding? = null
    private val b get() = _binding!!
    private var lote: LoteResponse? = null
    private var loteId: Int? = null
    fun seleccionar(id: Int) {
        if (loteId == id) return; loteId = id; carga?.cancel(); carga = null; lote = null; curva =
            emptyList(); pesajes = emptyList(); firma = ""; if (_binding != null) {
            pintar(); actualizarSilenciosamente()
        }
    }

    private var curva = emptyList<PuntoPesoObjetivo>()
    private var pesajes = emptyList<PesajeResponse>()
    private var carga: Job? = null
    private var firma = ""
    private val anim = AnimacionesTarjetas()
    private val activityMain get() = requireActivity() as MainActivity
    private fun formato() = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC"); isLenient = false
    }

    private fun hoy() = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("America/Bogota")
    }.format(Date())

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
        _binding = SeccionPesajesGuiaBinding.inflate(inflater, container, false); return b.root
    }

    override fun onViewCreated(view: View, state: Bundle?) {
        anim.reiniciar(); firma = ""
        b.registrarPeso.setOnClickListener { formulario(null) }
        b.registrarPeso.isEnabled = false
        Hu56OfflineQueue.programar(requireContext())
        viewLifecycleOwner.lifecycleScope.launch {
            var cola = ""
            var ciclos = 0
            while (true) {
                val actual = Hu56OfflineQueue.registros(requireContext())
                    .filter { it.optString("tipo") == "pesaje" }.toString()
                if (cola != actual || ciclos++ % 10 == 0) {
                    cola = actual; actualizarSilenciosamente()
                }
                delay(1500)
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
            val id = loteId ?: return@launch
            if (galpon == null) {
                b.lotePesaje.text = "Selecciona primero un galpón"; b.registrarPeso.isEnabled =
                    false; return@launch
            }
            suspend fun cargar(cache: Boolean) {
                val api = if (cache) RetrofitClient.apiCache else RetrofitClient.api
                val l = paginas {
                    api.listarLotesCompletos(
                        it,
                        100
                    )
                }.filter { it.galpon.id == galpon && it.estado.equals("activo", true) }
                    .firstOrNull { it.id == id }
                if (activityMain.obtenerGalponSeleccionadoId() != galpon || loteId != id) return
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
                if (loteId != id) return
                lote = l; pesajes = datos; curva = puntos; pintar()
                (parentFragment as? GuiaPesoFragment)?.actualizarPesajesGuia(l.id, datos)
                b.estadoPesaje.text =
                    if (cache || !OfflineCache.hayInternet(requireContext())) "Datos guardados localmente" else ""
            }
            if (lote == null) try {
                cargar(true)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
            }
            try {
                cargar(false)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                b.estadoPesaje.text = "No se pudieron actualizar los pesajes"
            }
        }
    }

    private fun pintar() {
        val l = lote
        b.registrarPeso.isEnabled = l != null
        b.lotePesaje.text =
            l?.let { "${it.galpon.nombre} · Lote ${it.codigo} · Día ${dia(it, hoy())}" }
                ?: "No hay lote activo"
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
        val ultimo = pesajes.maxWithOrNull(compareBy<PesajeResponse> { it.fecha }.thenBy { it.id })
        val o = if (l != null && ultimo != null) objetivo(l, ultimo.fecha) else null
        val d = ultimo?.let { desvio(it.peso_promedio_g, o) }
        b.resumenPeso.text =
            "Último peso: ${ultimo?.let { numero(it.peso_promedio_g) + " g" } ?: "—"}"
        b.objetivoPeso.text = "Peso objetivo: ${o?.let { numero(it) + " g" } ?: "Sin referencia"}"
        b.desvioPeso.text = when {
            d == null -> "Sin comparación disponible"; d < -7 -> "${numero(d)} % · Revisar alimento, agua y ambiente"; d > 7 -> "+${
                numero(
                    d
                )
            } % · Revisar muestra y manejo alimentario"; else -> "${numero(d)} % · Dentro del rango esperado"
        }
        b.desvioPeso.setTextColor(
            ContextCompat.getColor(
                requireContext(),
                if (d != null && abs(d) > 7) R.color.guia_chart_alert else R.color.text_primary
            )
        )
        b.graficaPeso.mostrar(
            curva.mapNotNull { p -> p.peso_esperado_g?.let { p.dia to it } },
            if (l == null) emptyList() else pesajes.sortedBy { it.fecha }.map {
                Triple(
                    dia(l, it.fecha),
                    it.peso_promedio_g,
                    abs(desvio(it.peso_promedio_g, objetivo(l, it.fecha)) ?: 0.0) > 7
                )
            })
        b.listaPeso.removeAllViews(); anim.comenzar()
        fun fila(
            titulo: String,
            detalle: String,
            estado: String,
            clave: String,
            click: (() -> Unit)? = null
        ) {
            val item = ItemPesajeBinding.inflate(layoutInflater, b.listaPeso, false)
            item.itemPesoTitulo.text = titulo; item.itemPesoDetalle.text =
                detalle; item.itemPesoEstado.text = estado
            click?.let { item.root.setOnClickListener { it() } }; b.listaPeso.addView(item.root); anim.mostrar(
                item.root,
                clave
            )
        }
        pendientes.forEach { (item, p) ->
            fila(
                p.fecha,
                "${numero(p.peso_promedio_g)} g · ${p.cantidad_aves_pesadas} aves",
                when (item.optString("estado")) {
                    "REVISAR" -> "Envío por confirmar, no repetir"; "ERROR" -> item.optString("error"); else -> "Pendiente de sincronización"
                },
                item.optString("id")
            )
        }
        pesajes.sortedByDescending { it.fecha }.forEach { p ->
            val dd = l?.let { desvio(p.peso_promedio_g, objetivo(it, p.fecha)) }
            fila(
                p.fecha.take(10),
                "${numero(p.peso_promedio_g)} g · ${p.cantidad_aves_pesadas ?: "—"} aves",
                dd?.let { "Desviación: ${numero(it)} %" } ?: "Sin referencia",
                "p${p.id}") { opciones(p) }
        }
        if (pesajes.isEmpty() && pendientes.isEmpty()) fila(
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
        val f = R09RegistrarPesajeBinding.inflate(layoutInflater)
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
            f.previewPeso.text = "Peso objetivo: " + (runCatching {
                objetivo(
                    l,
                    f.fechaPeso.text.toString()
                )
            }.getOrNull()?.let { numero(it) + " g" } ?: "Sin referencia")
        }
        preview()
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
                if (!valida || peso == null || !peso.isFinite() || peso <= 0 || peso > 10000 || muestra == null || muestra !in 1..l.cantidad_inicial || (f.minPeso.text.isNotBlank() && (min == null || !min.isFinite() || min <= 0 || min > peso)) || (f.maxPeso.text.isNotBlank() && (max == null || !max.isFinite() || max < peso || max > 10000))) {
                    mensaje("Revisa fecha, peso y cantidad de aves"); return@setOnClickListener
                }
                if (loteId != l.id) {
                    dialog.dismiss(); return@setOnClickListener
                }
                val req = PesajeRequest(
                    l.id,
                    fecha,
                    peso,
                    muestra,
                    min,
                    max,
                    objetivo(l, fecha),
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

    override fun onDestroyView() {
        carga?.cancel(); _binding = null; super.onDestroyView()
    }
}
