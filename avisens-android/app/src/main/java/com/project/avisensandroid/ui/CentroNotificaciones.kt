package com.project.avisensandroid.ui

import android.view.View
import android.view.Gravity
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.ColorDrawable
import android.view.animation.DecelerateInterpolator
import android.widget.*
import android.graphics.Typeface
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.controller.OfflineCache
import com.project.avisensandroid.model.NotificacionResponse
import com.project.avisensandroid.model.UserSession
import kotlinx.coroutines.*

/** Bandeja independiente de la configuración de notificaciones. */
class CentroNotificaciones(private val activity: MainActivity) {
    private val usuario = UserSession.userId(activity)
    private var datos = emptyList<NotificacionResponse>()
    private var soloNoLeidas = false
    private var cargado = false
    private var ocupado = false
    private var trabajo: Job? = null
    private lateinit var dialogo: PopupWindow
    private lateinit var raiz: LinearLayout
    private var cerrando = false
    private val animadas = mutableSetOf<String>()
    private val verde get() = activity.getColor(R.color.nav_selected)
    private val oscuro get() = !activity.resources.getBoolean(R.bool.avisens_light_bars)
    private val superficie get() = Color.parseColor(if (oscuro) "#304238" else "#FFFFFF")
    private val borde get() = Color.parseColor(if (oscuro) "#597467" else "#D2E4D9")
    private val tenue get() = Color.parseColor(if (oscuro) "#B6C9BE" else "#587065")
    private val seleccionado get() = Color.parseColor(if (oscuro) "#456653" else "#DCEFE3")
    private fun contorno(color: Int, radio: Int = 18) = fondo(color, radio).apply {
        setStroke(dp(1), borde)
    }

    private fun icono(
        recurso: Int,
        descripcion: String,
        color: Int = verde,
        accion: (() -> Unit)? = null
    ) = ImageView(activity).apply {
        setImageResource(recurso)
        setColorFilter(color)
        contentDescription = descripcion
        setPadding(dp(10), dp(10), dp(10), dp(10))
        if (accion != null) {
            background = fondo(seleccionado, 20)
            setOnClickListener { accion() }
        }
    }

    private fun fechaLegible(fecha: String): String = try {
        val dia = java.time.LocalDate.parse(fecha)
        when (dia) {
            java.time.LocalDate.now() -> "Hoy"
            java.time.LocalDate.now().minusDays(1) -> "Ayer"
            else -> dia.format(
                java.time.format.DateTimeFormatter.ofPattern(
                    "d 'de' MMMM 'de' yyyy",
                    java.util.Locale("es", "CO")
                )
            )
        }
    } catch (_: Exception) {
        fecha
    }

    private var sombra: View? = null
    private fun fondo(color: Int, radio: Int = 16) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(radio).toFloat()
    }

    private lateinit var lista: LinearLayout
    private lateinit var estado: TextView
    private fun dp(n: Int) = (n * activity.resources.displayMetrics.density).toInt()
    private fun texto(s: String, size: Float, negrita: Boolean = false) = TextView(activity).apply {
        text = s; textSize = size
        setTextColor(activity.getColor(R.color.text_primary))
        if (negrita) setTypeface(Typeface.DEFAULT, Typeface.BOLD)
    }

    private fun boton(s: String, accion: () -> Unit) = TextView(activity).apply {
        text = s
        textSize = 13f
        gravity = Gravity.CENTER
        setTypeface(Typeface.DEFAULT, Typeface.BOLD)
        setTextColor(verde)
        setPadding(dp(10), dp(12), dp(10), dp(12))
        background = fondo(seleccionado, 12)
        setOnClickListener { accion() }
    }

    private fun vigente() = ::dialogo.isInitialized && dialogo.isShowing && !cerrando &&
            usuario != null && usuario == UserSession.userId(activity)

    private fun cerrar() {
        if (cerrando || !dialogo.isShowing) return
        cerrando = true
        trabajo?.cancel()
        raiz.animate().alpha(0f).scaleX(.75f).scaleY(.75f)
            .setDuration(180).withEndAction { dialogo.dismiss() }.start()
    }

    fun mostrar() {
        val ancla = activity.findViewById<View>(R.id.btnCampana) ?: return
        if (!ancla.isAttachedToWindow) return
        raiz = activity.layoutInflater.inflate(R.layout.popup_notificaciones, null) as LinearLayout
        raiz.background = contorno(superficie, 22)
        raiz.findViewById<TextView>(R.id.notifTitulo)
            .setTextColor(activity.getColor(R.color.text_primary))
        raiz.findViewById<ImageView>(R.id.notifCerrar).apply {
            setColorFilter(verde)
            setOnClickListener { cerrar() }
        }
        val todas = raiz.findViewById<TextView>(R.id.notifTodas)
        val pendientes = raiz.findViewById<TextView>(R.id.notifPendientes)
        fun seleccionar(noLeidas: Boolean) {
            soloNoLeidas = noLeidas
            todas.background = fondo(if (!noLeidas) seleccionado else superficie, 12)
            pendientes.background = fondo(if (noLeidas) seleccionado else superficie, 12)
            animadas.clear()
            pintar()
        }
        todas.setTextColor(verde)
        pendientes.setTextColor(verde)
        todas.background = fondo(seleccionado, 12)
        todas.setOnClickListener { seleccionar(false) }
        pendientes.setOnClickListener { seleccionar(true) }
        raiz.findViewById<TextView>(R.id.notifLeerTodas).apply {
            setTextColor(verde)
            setOnClickListener { modificar({ RetrofitClient.api.marcarTodasNotificacionesLeidas().isSuccessful }) }
        }
        estado = raiz.findViewById(R.id.notifEstado)
        estado.setTextColor(tenue)
        lista = raiz.findViewById(R.id.notifLista)
        val visible = android.graphics.Rect()
        ancla.getWindowVisibleDisplayFrame(visible)
        val posicion = IntArray(2)
        ancla.getLocationOnScreen(posicion)
        val ancho = minOf(dp(370), visible.width() - dp(24))
        val alto = minOf(
            dp(420),
            (visible.bottom - posicion[1] - ancla.height - dp(180)).coerceAtLeast(dp(100))
        )
        val scroll = raiz.findViewById<ScrollView>(R.id.notifScroll)
        scroll.measure(
            View.MeasureSpec.makeMeasureSpec(ancho - dp(28), View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(alto, View.MeasureSpec.AT_MOST)
        )
        scroll.layoutParams = scroll.layoutParams.apply { height = -2 }
        lista.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ ->
            val altura = minOf(lista.measuredHeight, alto)
            if (altura > 0 && scroll.layoutParams.height != altura) {
                scroll.layoutParams = scroll.layoutParams.apply { height = altura }
            }
        }
        dialogo = PopupWindow(raiz, ancho, -2, true).apply {
            setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            isOutsideTouchable = true
            elevation = dp(12).toFloat()
            animationStyle = 0
            setOnDismissListener {
                trabajo?.cancel()
                sombra?.let { (it.parent as? android.view.ViewGroup)?.removeView(it) }
                sombra = null
            }
        }
        raiz.alpha = 0f
        raiz.scaleX = .65f
        raiz.scaleY = .65f
        raiz.pivotX = ancho.toFloat() - dp(24)
        raiz.pivotY = 0f
        val decor = activity.window.decorView as? android.view.ViewGroup
        sombra = View(activity).apply {
            setBackgroundColor(0x55000000)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        decor?.addView(sombra, android.view.ViewGroup.LayoutParams(-1, -1))
        dialogo.showAsDropDown(ancla, -dp(4), dp(6), Gravity.END)
        raiz.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(280)
            .setInterpolator(DecelerateInterpolator()).start()
        trabajo = activity.lifecycleScope.launch {
            cargar(true)
            while (isActive && vigente()) {
                if (!ocupado) cargar(false)
                delay(15000)
            }
        }
    }

    private fun animar(vista: View, clave: String, indice: Int) {
        if (!animadas.add(clave)) return
        vista.alpha = 0f
        vista.translationY = dp(16).toFloat()
        vista.animate().alpha(1f).translationY(0f)
            .setStartDelay((indice * 65L).coerceAtMost(260L))
            .setDuration(320).setInterpolator(DecelerateInterpolator()).start()
    }

    private suspend fun cargar(cache: Boolean) {
        try {
            val api = if (cache) RetrofitClient.apiCache else RetrofitClient.api
            val nuevas = mutableListOf<NotificacionResponse>()
            var pagina = 1
            var total: Int
            do {
                val r = api.listarMisNotificaciones(pagina, 100)
                val b = r.body() ?: return
                if (!r.isSuccessful) return
                nuevas.addAll(b.data.filter { it.usuario_id == usuario })
                pagina++
                total = b.meta.totalPages
            } while (pagina <= total && vigente())
            if (!vigente() || ocupado) return
            val resultado = nuevas.distinctBy { it.id }
            if (!cargado || resultado != datos) {
                datos = resultado; cargado = true; pintar()
            }
            estado.text =
                if (cache || !OfflineCache.hayInternet(activity)) "Datos guardados" else ""
            estado.visibility = if (estado.text.isEmpty()) View.GONE else View.VISIBLE
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            if (vigente() && !cargado && !cache) {
                estado.visibility = View.VISIBLE; estado.text =
                    "No se pudieron consultar las notificaciones"
            }
        }
    }

    private fun modificar(accion: suspend () -> Boolean, despues: (() -> Unit)? = null) {
        if (ocupado || !vigente()) return
        if (!OfflineCache.hayInternet(activity)) {
            estado.visibility = View.VISIBLE; estado.text =
                "Necesitas conexión para realizar esta acción"; return
        }
        ocupado = true
        activity.lifecycleScope.launch {
            try {
                if (accion() && vigente()) {
                    ocupado = false; cargar(false); despues?.invoke()
                } else if (vigente()) {
                    estado.visibility = View.VISIBLE; estado.text = "No se pudo completar la acción"
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                if (vigente()) {
                    estado.visibility = View.VISIBLE; estado.text = "No se pudo completar la acción"
                }
            } finally {
                ocupado = false
            }
        }
    }

    private fun pintar() {
        lista.removeAllViews()
        val visibles = datos.filter { !soloNoLeidas || !it.leida }
        if (cargado && visibles.isEmpty()) lista.addView(
            texto(
                "No tienes notificaciones en esta lista",
                15f
            )
        )
        var fechaAnterior: String? = null
        var indice = 0
        visibles.forEach { n ->
            val fecha = n.fecha_creacion?.take(10) ?: "Sin fecha"
            if (fecha != fechaAnterior) {
                val encabezado = texto(fechaLegible(fecha), 13f, true).apply {
                    setPadding(
                        dp(4),
                        dp(12),
                        0,
                        dp(8)
                    ); setTextColor(verde)
                }
                lista.addView(encabezado)
                animar(encabezado, "fecha:$fecha", indice++)
                fechaAnterior = fecha
            }
            val tarjeta = activity.layoutInflater.inflate(
                R.layout.item_notificacion,
                lista,
                false
            ) as LinearLayout
            tarjeta.background = contorno(if (n.leida) superficie else seleccionado, 16)
            val mensaje = n.mensaje.orEmpty().lowercase()
            val recurso = when {
                "temperatura" in mensaje -> R.drawable.ic_thermometer
                "humedad" in mensaje -> R.drawable.ic_water_drop
                else -> R.drawable.ic_notifications
            }
            tarjeta.findViewById<ImageView>(R.id.notifIcono).apply {
                setImageResource(recurso)
                setColorFilter(
                    if ("crítica" in n.titulo.orEmpty()
                            .lowercase()
                    ) Color.parseColor("#EF7777") else verde
                )
                background = fondo(superficie, 14)
            }
            tarjeta.findViewById<TextView>(R.id.notifItemTitulo).text = n.titulo ?: "Avisens"
            tarjeta.findViewById<TextView>(R.id.notifMensaje).text = n.mensaje.orEmpty()
            tarjeta.findViewById<TextView>(R.id.notifHora).apply {
                text = n.fecha_creacion?.replace('T', ' ')?.drop(11)?.take(5).orEmpty()
                setTextColor(tenue)
            }
            tarjeta.findViewById<View>(R.id.notifPunto).apply {
                background = fondo(verde, 8)
                visibility = if (n.leida) View.GONE else View.VISIBLE
            }
            tarjeta.setOnClickListener {
                if (n.leida) detalle(n) else modificar({
                    RetrofitClient.api.marcarNotificacionLeida(
                        n.id
                    ).isSuccessful
                }) { detalle(n) }
            }
            tarjeta.findViewById<ImageView>(R.id.notifLeer).apply {
                setColorFilter(verde)
                visibility = if (n.leida) View.GONE else View.VISIBLE
                setOnClickListener { modificar({ RetrofitClient.api.marcarNotificacionLeida(n.id).isSuccessful }) }
            }
            tarjeta.findViewById<ImageView>(R.id.notifEliminar).apply {
                setColorFilter(tenue)
                setOnClickListener {
                    AlertDialog.Builder(activity).setMessage("¿Eliminar esta notificación?")
                        .setNegativeButton("Cancelar", null)
                        .setPositiveButton("Eliminar") { _, _ ->
                            modificar({
                                RetrofitClient.api.eliminarMiNotificacion(
                                    n.id
                                ).isSuccessful
                            })
                        }.show().estiloCancelar()
                }
            }
            lista.addView(
                tarjeta,
                LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(10) })
            animar(tarjeta, "notificacion:${n.id}", indice++)
        }
    }

    private fun detalle(n: NotificacionResponse) {
        if (n.referencia_tipo != "alerta" || n.referencia_id == null) return
        cerrar()
        activity.navegarDesdeBottomNav(R.id.nav_alertas)
    }
}
