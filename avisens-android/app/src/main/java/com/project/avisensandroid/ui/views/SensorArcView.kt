package com.project.avisensandroid.ui.views

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import androidx.annotation.ColorInt
import kotlin.math.min

/**
 * Arco de progreso reutilizable para las tarjetas circulares de Sensores.
 * El fondo circular se dibuja en el XML; esta vista dibuja solamente el arco
 * que depende de la última lectura recibida del backend.
 */
class SensorArcView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val density = resources.displayMetrics.density
    private val strokeWidthPx = 10f * density
    private var progressFraction: Float = 0f

    @ColorInt
    private var arcColor: Int = 0xFF3E8E5B.toInt()

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = strokeWidthPx
        strokeCap = Paint.Cap.ROUND
    }

    private val bounds = RectF()

    fun setProgressFraction(value: Float) {
        val normalized = value.takeIf { it.isFinite() }?.coerceIn(0f, 1f) ?: 0f
        if (progressFraction != normalized) {
            progressFraction = normalized
            contentDescription = "Indicador de progreso ${(normalized * 100).toInt()} por ciento"
            invalidate()
        }
    }

    fun setArcColor(@ColorInt color: Int) {
        if (arcColor != color) {
            arcColor = color
            invalidate()
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (progressFraction <= 0f || width <= 0 || height <= 0) return

        val dimension = min(width, height).toFloat()
        val centerX = width / 2f
        val centerY = height / 2f
        val radius = dimension / 2f - strokeWidthPx / 2f - (6f * density)
        if (radius <= 0f) return

        bounds.set(
            centerX - radius,
            centerY - radius,
            centerX + radius,
            centerY + radius
        )
        paint.color = arcColor
        paint.strokeWidth = strokeWidthPx
        // Empieza arriba y recorre 270 grados en sentido horario, como un gauge.
        canvas.drawArc(bounds, -90f, 270f * progressFraction, false, paint)
    }
}
