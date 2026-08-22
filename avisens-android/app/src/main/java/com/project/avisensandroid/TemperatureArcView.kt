package com.project.avisensandroid

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import kotlin.math.min

class TemperatureArcView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    // Temperatura inicial
    private var temperature = 21f

    // Grosor del aro (en px, ya que se usa directo en Paint)
    private val strokeWidthPx = 18f

    // Rect que se recalcula solo cuando cambia el tamaño de la vista
    private val arcRect = RectF()

    // =====================================
    // ARO GRIS DE FONDO
    // =====================================
    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = strokeWidthPx
        strokeCap = Paint.Cap.ROUND
        color = Color.rgb(232, 232, 232)
    }

    // =====================================
    // ARO DE TEMPERATURA
    // =====================================
    private val temperaturePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = strokeWidthPx
        strokeCap = Paint.Cap.ROUND
    }

    // =====================================
    // CONFIGURACIÓN DEL ARCO
    // =====================================
    private val startAngle = -225f
    private val totalAngle = 270f

    private val minTemperature = 15f
    private val maxTemperature = 30f

    // =====================================
    // CAMBIAR TEMPERATURA
    // =====================================
    fun setTemperature(value: Float) {
        temperature = value
        invalidate()
    }

    // =====================================
    // FORZAR VISTA CUADRADA
    // =====================================
    // Esto evita que, si el layout le da un ancho y alto distintos
    // (por márgenes, padding, etc.), el aro salga ovalado o descuadrado.
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec)
        val size = min(measuredWidth, measuredHeight)
        setMeasuredDimension(size, size)
    }

    // =====================================
    // RECALCULAR EL RECT SOLO CUANDO CAMBIA EL TAMAÑO
    // =====================================
    // Tanto el aro gris como el de color usan EXACTAMENTE el mismo
    // rect, por eso nunca se van a desalinear entre sí.
    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        val size = min(w, h).toFloat()
        val padding = strokeWidthPx / 2f
        arcRect.set(padding, padding, size - padding, size - padding)
    }

    // =====================================
    // DIBUJAR
    // =====================================
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        if (arcRect.width() <= 0f || arcRect.height() <= 0f) {
            return
        }

        // =====================================
        // ARO GRIS (fondo, siempre completo, mismo rect)
        // =====================================
        canvas.drawArc(
            arcRect,
            startAngle,
            totalAngle,
            false,
            trackPaint
        )

        // =====================================
        // PORCENTAJE SEGÚN RANGO DE TEMPERATURA
        // =====================================
        val percentage = (
                (temperature - minTemperature) /
                        (maxTemperature - minTemperature)
                ).coerceIn(0f, 1f)

        // =====================================
        // COLOR SEGÚN TEMPERATURA
        // =====================================
        temperaturePaint.color = when {
            temperature < 18f -> Color.rgb(192, 57, 59)  // Muy baja
            temperature <= 22f -> Color.rgb(60, 154, 99)   // Óptima
            temperature <= 25f -> Color.rgb(243, 156, 52)  // Atención
            else -> Color.rgb(192, 57, 59)                 // Crítica
        }

        // =====================================
        // ARCO DE TEMPERATURA (mismo rect que el gris)
        // =====================================
        val sweepAngle = totalAngle * percentage
        canvas.drawArc(
            arcRect,
            startAngle,
            sweepAngle,
            false,
            temperaturePaint
        )
    }
}