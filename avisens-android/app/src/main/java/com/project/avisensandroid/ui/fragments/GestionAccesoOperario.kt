package com.project.avisensandroid.ui.fragments

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.InputFilter
import android.text.InputType
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.gson.JsonObject
import com.project.avisensandroid.R
import com.project.avisensandroid.ui.estiloCancelar
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.model.UsuarioGestionResponse
import com.project.avisensandroid.ui.ColoresAdaptativos
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import retrofit2.Response

internal class GestionAccesoOperario(
    private val fragment: GestionOperariosFragment,
    private val usuario: UsuarioGestionResponse
) {
    private val context get() = fragment.requireContext()
    private val api get() = RetrofitClient.api
    private var ocupado = false
    private var acceso: MaterialButton? = null
    private fun dp(n: Int) = (n * context.resources.displayMetrics.density + .5f).toInt()
    private fun texto(s: String, negrita: Boolean = false) = TextView(context).apply {
        text = s
        textSize = 14f
        setTextColor(ColoresAdaptativos.texto(context, "#183C2E"))
        if (negrita) typeface = Typeface.DEFAULT_BOLD
        setPadding(0, dp(5), 0, dp(5))
    }

    private fun columna() = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(20), dp(12), dp(20), dp(12))
    }

    private fun boton(s: String, principal: Boolean = false, accion: () -> Unit) =
        MaterialButton(context).apply {
            text = s
            isAllCaps = false
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            cornerRadius = dp(9)
            insetTop = 0
            insetBottom = 0
            minimumHeight = 0
            minHeight = 0
            minimumWidth = 0
            minWidth = 0
            setTextColor(
                if (principal) Color.WHITE else ColoresAdaptativos.texto(
                    context,
                    "#285C40"
                )
            )
            backgroundTintList = ColorStateList.valueOf(
                if (principal) Color.parseColor("#2F8B5E") else ColoresAdaptativos.superficie(
                    context,
                    "#FFFFFF"
                )
            )
            strokeWidth = if (principal) 0 else dp(1)
            strokeColor = ColorStateList.valueOf(Color.parseColor("#547460"))
            if (principal) {
                backgroundTintList =
                    null; setBackgroundResource(R.drawable.bg_button_gradient_green)
            }
            if (s == "Cancelar" || s == "Cerrar") {
                setTextColor(
                    androidx.core.content.ContextCompat.getColor(
                        context,
                        R.color.cancel_text
                    )
                )
                backgroundTintList = ColorStateList.valueOf(
                    androidx.core.content.ContextCompat.getColor(
                        context,
                        R.color.cancel_background
                    )
                )
                strokeColor = ColorStateList.valueOf(
                    androidx.core.content.ContextCompat.getColor(
                        context,
                        R.color.cancel_stroke
                    )
                )
            }
            if (s == "Rechazar") {
                setTextColor(Color.parseColor("#C44B4B")); strokeColor =
                    ColorStateList.valueOf(Color.parseColor("#C44B4B"))
            }
            setOnClickListener { accion() }
        }

    private fun campo(hintText: String, max: Int, clave: Boolean = false) =
        EditText(context).apply {
            hint = hintText
            filters = arrayOf(InputFilter.LengthFilter(max))
            inputType =
                if (clave) InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            if (clave) setSingleLine(true) else minLines = 2
            textSize = 14f
            setBackgroundResource(R.drawable.bg_input_event)
            setPadding(dp(12), dp(12), dp(12), dp(12))
            setTextColor(ColoresAdaptativos.texto(context, "#183C2E"))
        }

    private fun mensaje(s: String) {
        if (fragment.isAdded) Toast.makeText(context, s, Toast.LENGTH_LONG).show()
    }

    private fun AlertDialog.diseno(): AlertDialog {
        window?.setBackgroundDrawableResource(R.drawable.bg_dialog_gestion_operario)
        estiloCancelar()
        getButton(AlertDialog.BUTTON_NEGATIVE)?.let { boton ->
            (boton.layoutParams as? android.view.ViewGroup.MarginLayoutParams)?.let { lp ->
                lp.marginEnd = dp(8); boton.layoutParams = lp
            }
        }
        getButton(AlertDialog.BUTTON_POSITIVE)?.apply {
            backgroundTintList = null
            setBackgroundResource(R.drawable.bg_button_gradient_green)
            setTextColor(Color.WHITE); isAllCaps = false
        }
        window?.decorView?.apply {
            alpha = 0f; translationY = dp(16).toFloat(); animate().alpha(1f).translationY(0f)
            .setDuration(280).start()
        }
        return this
    }

    private fun exito(titulo: String, detalle: String) {
        val contenido = columna()
        contenido.addView(texto("✓", true).apply {
            textSize = 32f; gravity = android.view.Gravity.CENTER
        })
        contenido.addView(texto(detalle).apply { gravity = android.view.Gravity.CENTER })
        AlertDialog.Builder(context).setTitle(titulo).setView(contenido)
            .setPositiveButton("Cerrar", null).show().diseno()
    }

    private fun JsonObject.valor(k: String): String =
        get(k)?.takeUnless { it.isJsonNull }?.asString.orEmpty()

    private fun error(r: Response<*>): String = when (r.code()) {
        401, 403 -> "No tienes permiso o tu sesión venció."
        404 -> "La solicitud ya no está disponible."
        429 -> "Demasiadas solicitudes. Intenta más tarde."
        else -> "No se pudo completar la operación (${r.code()}). Actualiza antes de reintentar."
    }

    private fun ejecutar(accion: suspend () -> Unit) {
        if (ocupado || fragment.view == null) return
        ocupado = true
        fragment.viewLifecycleOwner.lifecycleScope.launch {
            try {
                accion()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                mensaje("No se pudo confirmar la operación. Revisa tu conexión y consulta el historial antes de repetirla.")
            } finally {
                ocupado = false
            }
        }
    }

    fun agregarBotones(card: LinearLayout) {
        val cambiar = boton("Cambiar contraseña") { cambiar() }.apply { isEnabled = usuario.activo }
        card.addView(cambiar, LinearLayout.LayoutParams(-1, dp(44)).apply { topMargin = dp(6) })
        acceso = boton("Solicitudes de acceso") { abrirSolicitudes() }
        card.addView(acceso, LinearLayout.LayoutParams(-1, dp(44)).apply { topMargin = dp(10) })
        fragment.viewLifecycleOwner.lifecycleScope.launch {
            try {
                val r = api.solicitudesOperario(usuario.id); if (r.isSuccessful) contador(
                    r.body().orEmpty()
                )
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
            }
        }
    }

    private fun contador(lista: List<JsonObject>) {
        val n = lista.count { it.valor("estado") == "pendiente" }
        acceso?.text = if (n > 0) "Solicitudes de acceso ($n)" else "Solicitudes de acceso"
    }

    private fun LinearLayout.espacio(n: Int = 12) {
        addView(View(context), LinearLayout.LayoutParams(1, dp(n)))
    }

    private fun fondo(seleccionado: Boolean = false) = GradientDrawable().apply {
        cornerRadius = dp(12).toFloat()
        setColor(ColoresAdaptativos.superficie(context, if (seleccionado) "#DCEFE3" else "#F0F6F2"))
        setStroke(dp(1), Color.parseColor(if (seleccionado) "#2F8B5E" else "#547460"))
    }

    private fun cambiar() {
        val contenido = columna()
        contenido.addView(texto("El operario no puede cambiar su propia contraseña. Define una nueva clave o genera una automáticamente. Sus sesiones activas se cerrarán de inmediato.").apply {
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                justificationMode = android.text.Layout.JUSTIFICATION_MODE_INTER_WORD
            }
            setLineSpacing(dp(3).toFloat(), 1f)
        })
        contenido.espacio()
        contenido.addView(texto("Cómo definir la contraseña", true))
        val opciones = RadioGroup(context).apply { orientation = RadioGroup.VERTICAL }
        fun opcion(titulo: String, detalle: String) = RadioButton(context).apply {
            id = View.generateViewId()
            text = "$titulo\n$detalle"
            textSize = 14f
            setTextColor(ColoresAdaptativos.texto(context, "#183C2E"))
            buttonTintList = ColorStateList.valueOf(Color.parseColor("#2F8B5E"))
            setPadding(dp(16), dp(18), dp(16), dp(18))
            minHeight = dp(82)
            gravity = android.view.Gravity.CENTER_VERTICAL
            background = fondo()
        }

        val manual = opcion("Definir manualmente", "Mínimo 8 caracteres")
        val auto = opcion("Generar automáticamente", "Clave segura lista para copiar")
        opciones.addView(manual, RadioGroup.LayoutParams(-1, -2).apply { bottomMargin = dp(10) })
        opciones.addView(auto, RadioGroup.LayoutParams(-1, -2))
        contenido.addView(opciones)
        contenido.espacio(16)
        val etiquetaClave = texto("Nueva contraseña", true)
        contenido.addView(etiquetaClave)
        val clave = campo("Mínimo 8 caracteres", 72, true)
        contenido.addView(clave, LinearLayout.LayoutParams(-1, dp(48)))
        opciones.setOnCheckedChangeListener { _, id ->
            val visible = id == manual.id
            clave.visibility = if (visible) View.VISIBLE else View.GONE
            etiquetaClave.visibility = clave.visibility
            manual.background = fondo(visible); auto.background = fondo(!visible)
            if (!visible) clave.text.clear()
        }
        opciones.check(manual.id)
        contenido.espacio(16)
        contenido.addView(texto("Observación (opcional)", true))
        val nota = campo("Motivo del restablecimiento", 250)
        contenido.addView(nota)
        contenido.espacio(12)
        val scrollFormulario = ScrollView(context).apply { addView(contenido) }
        val cabecera = columna().apply {
            addView(texto("Cambiar contraseña del operario", true).apply { textSize = 19f })
            addView(texto("${usuario.nombre_completo} · @${usuario.username}").apply {
                textSize = 14f
            })
            espacio(8)
            addView(View(context).apply {
                setBackgroundColor(ColoresAdaptativos.texto(context, "#547460"))
                alpha = 0.25f
            }, LinearLayout.LayoutParams(-1, dp(1)))
        }
        val formulario = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            addView(cabecera)
            addView(scrollFormulario, LinearLayout.LayoutParams(-1, -2, 1f))
        }
        val d = AlertDialog.Builder(context).setView(formulario).create()
        val acciones = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(dp(20), dp(12), dp(20), dp(16))
        }
        val cancelar = boton("Cancelar") { d.dismiss() }
        val guardar = boton("Guardar", true) { }
        acciones.addView(
            cancelar,
            LinearLayout.LayoutParams(0, dp(40), 1f).apply { marginEnd = dp(12) })
        acciones.addView(guardar, LinearLayout.LayoutParams(0, dp(40), 1f))
        formulario.addView(acciones)
        d.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        d.show(); d.diseno()
        d.window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        guardar.setOnClickListener {
            val datos = JsonObject()
            val valor = clave.text.toString()
            if (opciones.checkedRadioButtonId == manual.id) {
                if (valor.length !in 8..72 || valor.toByteArray(Charsets.UTF_8).size > 72) {
                    clave.error =
                        "Usa entre 8 y 72 caracteres, máximo 72 bytes"; return@setOnClickListener
                }
                datos.addProperty("nueva_password", valor)
            }
            nota.text.toString().trim().takeIf { it.isNotEmpty() }
                ?.let { datos.addProperty("observacion", it) }
            AlertDialog.Builder(context).setTitle("Confirmar cambio")
                .setMessage("¿Restablecer la contraseña de este operario? Se cerrarán sus sesiones activas.")
                .setNegativeButton("Cancelar", null).setPositiveButton("Confirmar") { _, _ ->
                    d.dismiss()
                    ejecutar {
                        val r = api.restablecerPasswordOperario(usuario.id, datos)
                        if (r.isSuccessful) {
                            mostrarClave(
                                r.body()?.valor("password_temporal").orEmpty()
                                    .ifBlank { datos.valor("nueva_password") })
                            actualizarContador()
                        } else mensaje(error(r))
                    }
                }.show().diseno()
        }
    }

    private suspend fun actualizarContador() {
        val r = api.solicitudesOperario(usuario.id)
        if (r.isSuccessful) contador(r.body().orEmpty())
    }

    fun abrirSolicitudes() = ejecutar {
        val r = api.solicitudesOperario(usuario.id)
        if (!r.isSuccessful) {
            mensaje(error(r)); return@ejecutar
        }
        val lista = r.body().orEmpty(); contador(lista)
        mostrarSolicitudes(lista)
    }

    private fun mostrarSolicitudes(lista: List<JsonObject>) {
        val contenido = columna()
        contenido.addView(texto("Solicitudes de acceso", true).apply { textSize = 19f })
        contenido.addView(texto("${usuario.nombre_completo} · @${usuario.username}"))
        contenido.espacio(8)
        contenido.addView(View(context).apply {
            setBackgroundColor(
                ColoresAdaptativos.texto(
                    context,
                    "#547460"
                )
            ); alpha = .25f
        }, LinearLayout.LayoutParams(-1, dp(1)))
        contenido.espacio(12)
        val tabs = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundResource(R.drawable.bg_bitacora_selector)
            setPadding(dp(4), dp(4), dp(4), dp(4))
        }
        val pendientes = texto(
            "Pendientes (${lista.count { it.valor("estado") == "pendiente" }})",
            true
        ).apply { gravity = android.view.Gravity.CENTER }
        val historial = texto("Historial", true).apply { gravity = android.view.Gravity.CENTER }
        tabs.addView(pendientes, LinearLayout.LayoutParams(0, dp(36), 1f))
        tabs.addView(historial, LinearLayout.LayoutParams(0, dp(36), 1f))
        val selector = SelectorAnimado(tabs, R.drawable.bg_bitacora_tab_selected)
        contenido.addView(tabs)
        contenido.espacio()
        val scroll = object : ScrollView(context) {
            override fun onMeasure(w: Int, h: Int) {
                val limite = minOf(dp(320), (resources.displayMetrics.heightPixels * 0.40f).toInt())
                super.onMeasure(
                    w,
                    View.MeasureSpec.makeMeasureSpec(limite, View.MeasureSpec.AT_MOST)
                )
            }
        }
        val filas = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
        scroll.addView(filas); contenido.addView(scroll, LinearLayout.LayoutParams(-1, -2))
        val d = AlertDialog.Builder(context).setView(contenido).create()
        contenido.espacio(12)
        contenido.addView(
            boton("Cerrar") { d.dismiss() },
            LinearLayout.LayoutParams(dp(100), dp(40)).apply { gravity = android.view.Gravity.END })
        fun pintar(pendiente: Boolean) {
            selector.seleccionar(if (pendiente) pendientes else historial)
            pendientes.setTextColor(
                androidx.core.content.ContextCompat.getColor(
                    context,
                    if (pendiente) R.color.tab_text_selected else R.color.tab_text_unselected
                )
            )
            historial.setTextColor(
                androidx.core.content.ContextCompat.getColor(
                    context,
                    if (!pendiente) R.color.tab_text_selected else R.color.tab_text_unselected
                )
            )
            filas.removeAllViews()
            val filtradas = lista.filter { (it.valor("estado") == "pendiente") == pendiente }
            if (filtradas.isEmpty()) filas.addView(texto(if (pendiente) "No hay solicitudes pendientes." else "No hay historial."))
            filtradas.forEach { item ->
                val oscuro = (context.resources.configuration.uiMode and
                        android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
                        android.content.res.Configuration.UI_MODE_NIGHT_YES
                val card = columna().apply {
                    setPadding(dp(14), dp(12), dp(14), dp(12))
                    background = GradientDrawable().apply {
                        cornerRadius = dp(14).toFloat()
                        setColor(Color.parseColor(if (oscuro) "#304238" else "#F0F6F2"))
                        setStroke(dp(1), Color.parseColor(if (oscuro) "#526B5D" else "#D2E4D9"))
                    }
                }
                val estado = item.valor("estado")
                val encabezado = LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = android.view.Gravity.CENTER_VERTICAL
                }
                encabezado.addView(
                    texto("Solicitud #${item.valor("id")}", true),
                    LinearLayout.LayoutParams(0, -2, 1f)
                )
                encabezado.addView(texto(estado.replaceFirstChar { it.uppercase() }, true).apply {
                    textSize = 12f
                    val (fg, bg) = when (estado) {
                        "rechazada" -> if (oscuro) "#FFB4AB" to "#552620" else "#B23B33" to "#F6DEDC"
                        "pendiente" -> if (oscuro) "#F4D09A" to "#554120" else "#A65C12" to "#FBEBD3"
                        "aprobada", "completada" -> if (oscuro) "#A4D9B7" to "#254D38" else "#285C40" to "#DCEFE1"
                        else -> if (oscuro) "#E1E8E3" to "#405347" else "#547460" to "#E2EBE5"
                    }
                    setTextColor(Color.parseColor(fg))
                    background = GradientDrawable().apply {
                        cornerRadius = dp(8).toFloat()
                        setColor(Color.parseColor(bg))
                    }
                    setPadding(dp(9), dp(5), dp(9), dp(5))
                }, LinearLayout.LayoutParams(-2, -2))
                card.addView(encabezado)
                card.addView(texto(item.valor("fecha_creacion").replace('T', ' ').take(16)))
                card.addView(texto("Motivo: ${item.valor("motivo").ifBlank { "Sin motivo" }}"))
                val atendida = item.get("atendida_por")
                    ?.takeIf { it.isJsonObject }?.asJsonObject?.valor("nombre_completo").orEmpty()
                if (atendida.isNotBlank()) card.addView(texto("Atendida por: $atendida"))
                if (item.valor("observacion")
                        .isNotBlank()
                ) card.addView(texto("Observación: ${item.valor("observacion")}"))
                if (pendiente) {
                    val row = LinearLayout(context)
                    row.addView(
                        boton("Rechazar") { resolver(item, false, d) },
                        LinearLayout.LayoutParams(0, dp(40), 1f).apply { marginEnd = dp(8) })
                    row.addView(
                        boton("Aprobar", true) { resolver(item, true, d) },
                        LinearLayout.LayoutParams(0, dp(40), 1f)
                    )
                    card.addView(row)
                }
                filas.addView(
                    card,
                    LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(10) })
                card.alpha = 0f; card.translationY = dp(16).toFloat(); card.animate().alpha(1f)
                .translationY(0f).setDuration(320).start()
            }
        }
        pendientes.setOnClickListener { pintar(true) }
        historial.setOnClickListener { pintar(false) }
        pintar(true); d.show(); d.diseno()
    }

    private fun resolver(item: JsonObject, aprobar: Boolean, anterior: AlertDialog) {
        val id = item.valor("id").toIntOrNull() ?: return
        val contenido = columna()
        contenido.addView(texto(if (aprobar) "Se generará una contraseña y se cerrarán las sesiones activas." else "La solicitud quedará rechazada."))
        val nota = campo("Observación (opcional)", 500); contenido.addView(nota)
        AlertDialog.Builder(context)
            .setTitle(if (aprobar) "Aprobar solicitud" else "Rechazar solicitud").setView(contenido)
            .setNegativeButton("Cancelar", null).setPositiveButton("Confirmar") { _, _ ->
                anterior.dismiss()
                val datos = JsonObject(); nota.text.toString().trim().takeIf { it.isNotEmpty() }
                ?.let { datos.addProperty("observacion", it) }
                ejecutar {
                    val r = if (aprobar) api.aprobarRecuperacion(
                        id,
                        datos
                    ) else api.rechazarRecuperacion(id, datos)
                    if (r.isSuccessful) {
                        if (aprobar) mostrarClave(
                            r.body()?.valor("password_temporal").orEmpty()
                        ) else exito(
                            "Solicitud rechazada",
                            "La solicitud de recuperación fue rechazada correctamente."
                        )
                        actualizarContador()
                    } else mensaje(error(r))
                }
            }.show().diseno()
    }

    private fun mostrarClave(clave: String) {
        if (clave.isBlank()) {
            mensaje("Operación realizada. El servidor no devolvió la contraseña."); return
        }
        val contenido = columna()
        contenido.addView(texto("Comparte la contraseña de forma segura. Se muestra una sola vez y queda activa inmediatamente."))
        contenido.addView(texto(clave, true))
        contenido.addView(boton("Copiar contraseña", true) {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("Contraseña", clave)
            if (android.os.Build.VERSION.SDK_INT >= 24) clip.description.extras =
                android.os.PersistableBundle()
                    .apply { putBoolean("android.content.extra.IS_SENSITIVE", true) }
            clipboard.setPrimaryClip(clip); mensaje("Contraseña copiada")
        })
        val d = AlertDialog.Builder(context).setTitle("Contraseña generada").setView(contenido)
            .setPositiveButton("Cerrar", null).create()
        d.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE); d.show(); d.diseno()
    }
}
