package com.project.avisensandroid.ui.fragments

import android.app.Dialog
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.widget.ImageView
import android.content.res.Configuration
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import com.project.avisensandroid.R
import com.project.avisensandroid.model.UmbralAmbientalResponse

/** Detalle compartido entre Inicio y Sensores; no modifica las mediciones. */
internal class DetalleSensorModal {
    private var dialogo: Dialog? = null
    fun cerrar() {
        dialogo?.dismiss(); dialogo = null
    }

    fun abrir(
        origen: View, nombre: String, valor: TextView, estado: TextView,
        umbral: () -> UmbralAmbientalResponse?, semana: () -> Int?, configurar: (() -> Unit)?
    ) {
        cerrar()
        val ctx = origen.context
        fun dp(n: Int) = (n * ctx.resources.displayMetrics.density + .5f).toInt()
        val dialog = Dialog(ctx)
        dialogo = dialog
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        val panel = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(20), dp(16), dp(20), dp(20))
            setBackgroundResource(R.drawable.bg_dialog_white)
        }

        fun texto(
            s: String,
            size: Float,
            bold: Boolean = false,
            secundario: Boolean = false
        ): TextView = TextView(ctx).apply {
            text = s; textSize = size; gravity = Gravity.CENTER
            setTextColor(ctx.getColor(if (secundario) R.color.text_secondary else R.color.text_primary))
            if (bold) setTypeface(typeface, Typeface.BOLD)
        }

        fun agregar(v: View, margen: Int = 8) {
            panel.addView(v, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(margen) })
        }

        val cerrar = texto("×", 26f, true).apply {
            gravity = Gravity.CENTER; contentDescription = "Cerrar detalle"
        }
        panel.addView(
            cerrar,
            LinearLayout.LayoutParams(dp(44), dp(44)).apply { gravity = Gravity.END })
        val icono = when {
            nombre.contains("temperatura", true) -> R.drawable.ic_thermometer to "#D97736"
            nombre.contains("humedad", true) -> R.drawable.ic_water_drop to "#438ED5"
            nombre.contains("luminosidad", true) -> R.drawable.ic_sensor_sol to "#C99A23"
            nombre.contains("peso", true) || nombre.contains(
                "alimento",
                true
            ) -> R.drawable.ic_sensor_balanza to "#AA8050"

            nombre.contains("agua", true) -> R.drawable.ic_water_drop to "#368DAE"
            else -> R.drawable.ic_sensor_aire to "#39956D"
        }
        val oscuro =
            ctx.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
        val tono = Color.parseColor(icono.second)
        val insignia = ImageView(ctx).apply {
            setImageResource(icono.first)
            setColorFilter(tono)
            scaleType = ImageView.ScaleType.FIT_CENTER
            setPadding(dp(15), dp(15), dp(15), dp(15))
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(
                    Color.argb(
                        if (oscuro) 65 else 35,
                        Color.red(tono),
                        Color.green(tono),
                        Color.blue(tono)
                    )
                )
            }
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        panel.addView(insignia, LinearLayout.LayoutParams(dp(60), dp(60)).apply {
            gravity = Gravity.CENTER_HORIZONTAL
            bottomMargin = dp(12)
        })
        agregar(texto(nombre, 22f, true), 0)
        agregar(texto("Medición actual", 13f, secundario = true))
        val lectura = texto("—", 34f, true); agregar(lectura, 2)
        val estadoDetalle = texto("", 14f, true); agregar(estadoDetalle, 4)
        val fila = LinearLayout(ctx).apply { orientation = LinearLayout.HORIZONTAL }
        fun rango(titulo: String): TextView {
            val bloque = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(
                dp(8),
                dp(14),
                dp(8),
                dp(14)
            ); setBackgroundResource(R.drawable.bg_input_event)
            }
            bloque.addView(texto(titulo, 12f, secundario = true))
            val t = texto("—", 20f, true); bloque.addView(t)
            fila.addView(
                bloque,
                LinearLayout.LayoutParams(0, -2, 1f)
                    .apply { marginStart = dp(3); marginEnd = dp(3) })
            return t
        }

        val minimo = rango("Mínimo configurado");
        val maximo = rango("Máximo configurado")
        agregar(fila, 18)
        val info = texto("", 13f, secundario = true); agregar(info, 12)
        if (configurar != null) {
            val boton = texto("Configurar umbral", 14f, true).apply {
                setTextColor(Color.WHITE); setBackgroundResource(R.drawable.bg_bitacora_button); minHeight =
                dp(44)
                setOnClickListener { dialog.dismiss(); configurar() }
            }
            agregar(boton, 18)
        }
        fun actualizar() {
            lectura.text = valor.text
            lectura.setTextColor(valor.currentTextColor)
            estadoDetalle.text = estado.text.toString().substringBefore('\n')
            estadoDetalle.setTextColor(estado.currentTextColor)
            val u = umbral()
            minimo.text = u?.let { "${it.valor_minimo} ${it.unidad}" } ?: "—"
            maximo.text = u?.let { "${it.valor_maximo} ${it.unidad}" } ?: "—"
            info.text =
                if (u == null) "Sin umbral configurado" else "Criticidad: ${u.criticidad}\nSemana del umbral: ${u.semana_vida + 1}"
            semana()?.let { info.append("\nSemana actual: ${it + 1}") }
        }

        val refresco = object : Runnable {
            override fun run() {
                if (dialog.isShowing) {
                    actualizar(); panel.postDelayed(this, 750)
                }
            }
        }
        val scroll = android.widget.ScrollView(ctx).apply { addView(panel) }
        dialog.setContentView(scroll)
        dialog.setCanceledOnTouchOutside(true)
        dialog.setOnDismissListener {
            panel.removeCallbacks(refresco); if (dialogo === dialog) dialogo = null
        }
        cerrar.setOnClickListener {
            panel.animate().scaleX(.8f).scaleY(.8f).alpha(0f).setDuration(160)
                .withEndAction { dialog.dismiss() }.start()
        }
        dialog.show()
        dialog.window?.apply {
            setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT)); addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
            setDimAmount(.55f); setGravity(Gravity.CENTER)
            setLayout(
                (ctx.resources.displayMetrics.widthPixels * .9f).toInt(),
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        actualizar()
        panel.post {
            if (!dialog.isShowing) return@post
            val a = IntArray(2);
            val b = IntArray(2); origen.getLocationOnScreen(a); panel.getLocationOnScreen(b)
            panel.translationX = a[0] + origen.width / 2f - b[0] - panel.width / 2f
            panel.translationY = a[1] + origen.height / 2f - b[1] - panel.height / 2f
            panel.scaleX = (origen.width.toFloat() / panel.width.coerceAtLeast(1)).coerceIn(.2f, 1f)
            panel.scaleY =
                (origen.height.toFloat() / panel.height.coerceAtLeast(1)).coerceIn(.2f, 1f)
            panel.alpha = .5f
            panel.animate().translationX(0f).translationY(0f).scaleX(1f).scaleY(1f).alpha(1f)
                .setDuration(260).start()
        }
        panel.postDelayed(refresco, 750)
    }

    companion object {
        fun tarjeta(arco: View): View = (arco.parent?.parent as? View) ?: arco
    }
}
