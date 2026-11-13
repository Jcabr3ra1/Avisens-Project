package com.project.avisensandroid.ui.views

import android.graphics.Typeface
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import com.project.avisensandroid.R
import com.project.avisensandroid.model.ActuadorVista
import com.project.avisensandroid.model.Actuadores
import com.project.avisensandroid.model.LecturasSensores
import com.project.avisensandroid.model.SalidaActuador
import com.project.avisensandroid.model.VigenciaLectura
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Lista de actuadores (relés y motores) en solo lectura. Muestra la salida
 * que reportó el ESP32 y si ese reporte es reciente; no ofrece control
 * porque el backend actual no admite órdenes remotas.
 */
object ListaActuadores {

    fun pintar(contenedor: LinearLayout, txtVacio: TextView, vistas: List<ActuadorVista>) {
        contenedor.removeAllViews()
        txtVacio.visibility = if (vistas.isEmpty()) View.VISIBLE else View.GONE
        vistas.forEach { contenedor.addView(crearFila(contenedor, it)) }
    }

    private fun crearFila(contenedor: LinearLayout, vista: ActuadorVista): View {
        val contexto = contenedor.context
        val densidad = contexto.resources.displayMetrics.density
        fun dp(valor: Int) = (valor * densidad).toInt()
        fun color(id: Int) = contexto.getColor(id)

        val fila = LinearLayout(contexto).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.bg_stat_card)
            setPadding(dp(14), dp(12), dp(14), dp(12))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(8) }
        }

        fila.addView(TextView(contexto).apply {
            text = listOfNotNull(vista.nombre, vista.rele).joinToString(" · ")
            textSize = 14f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(color(R.color.text_primary))
        })
        fila.addView(TextView(contexto).apply {
            text = "Código: ${vista.sensor.codigo}"
            textSize = 12f
            setTextColor(color(R.color.text_secondary))
        })

        val (textoEstado, fondo, colorTexto) = estado(vista)
        fila.addView(TextView(contexto).apply {
            text = textoEstado
            textSize = 12f
            setTypeface(typeface, Typeface.BOLD)
            setBackgroundResource(fondo)
            setTextColor(color(colorTexto))
            setPadding(dp(10), dp(4), dp(10), dp(4))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(6) }
        })

        detalle(vista)?.let { linea ->
            fila.addView(TextView(contexto).apply {
                text = linea
                textSize = 12f
                setTextColor(color(R.color.text_secondary))
                setPadding(0, dp(4), 0, 0)
            })
        }
        return fila
    }

    /** Texto, fondo y color del estado: nunca da un reporte viejo como actual. */
    private fun estado(vista: ActuadorVista): Triple<String, Int, Int> {
        if (vista.errorConsulta) {
            return Triple("Error de consulta", R.drawable.bg_badge_red, R.color.badge_red_text)
        }
        val noReciente = LecturasSensores.etiquetaNoReciente(vista.vigencia)
        if (noReciente != null) {
            return Triple(noReciente, R.drawable.bg_badge_regular, R.color.orange_badge_text)
        }
        if (vista.vigencia == VigenciaLectura.SIN_LECTURAS) {
            return Triple("Sin reportes", R.drawable.bg_badge_regular, R.color.orange_badge_text)
        }
        return when (vista.salida) {
            SalidaActuador.ENCENDIDA ->
                Triple(Actuadores.textoSalida(vista), R.drawable.bg_badge_green, R.color.badge_green_text)
            SalidaActuador.APAGADA ->
                Triple(Actuadores.textoSalida(vista), R.drawable.bg_badge_regular, R.color.text_secondary)
            SalidaActuador.VALOR_NO_RECONOCIDO, SalidaActuador.SIN_REPORTE ->
                Triple(Actuadores.textoSalida(vista), R.drawable.bg_badge_orange, R.color.orange_badge_text)
        }
    }

    /** Último reporte con fecha cuando no es actual; hora del reporte si lo es. */
    private fun detalle(vista: ActuadorVista): String? {
        if (vista.errorConsulta || vista.vigencia == VigenciaLectura.SIN_LECTURAS) return null
        val fecha = fechaCorta(vista.fechaHora)
        return if (vista.vigencia == VigenciaLectura.RECIENTE) {
            fecha?.let { "Reportado a las $it" }
        } else {
            buildString {
                append("Último reporte: ${Actuadores.textoSalida(vista)}")
                if (fecha != null) append(" · $fecha")
            }
        }
    }

    private fun fechaCorta(valor: String?): String? {
        if (valor.isNullOrBlank()) return null
        val fecha: Date = listOf("yyyy-MM-dd'T'HH:mm:ss.SSSX", "yyyy-MM-dd'T'HH:mm:ssX")
            .firstNotNullOfOrNull { patron ->
                runCatching {
                    SimpleDateFormat(patron, Locale.US).apply {
                        isLenient = false
                        timeZone = TimeZone.getTimeZone("UTC")
                    }.parse(valor)
                }.getOrNull()
            } ?: return null
        return SimpleDateFormat("dd/MM HH:mm", Locale.getDefault()).format(fecha)
    }
}
