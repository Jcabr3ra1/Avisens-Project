package com.project.avisensandroid.ui.fragments

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import androidx.core.content.ContextCompat
import com.project.avisensandroid.R

class GraficaPesajes(context: Context, attrs: AttributeSet?) : View(context, attrs) {
    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private var objetivo = emptyList<Pair<Int, Double>>()
    private var real = emptyList<Triple<Int, Double, Boolean>>()
    fun mostrar(o: List<Pair<Int, Double>>, r: List<Triple<Int, Double, Boolean>>) {
        objetivo = o; real = r; invalidate()
    }

    override fun onDraw(c: Canvas) {
        super.onDraw(c)
        val d = resources.displayMetrics.density
        val left = 48 * d;
        val top = 12 * d;
        val right = width - 12 * d;
        val bottom = height - 30 * d
        if (right <= left || bottom <= top) return
        val maxDia =
            maxOf(1, objetivo.maxOfOrNull { it.first } ?: 1, real.maxOfOrNull { it.first } ?: 1)
        val maxPeso = maxOf(
            100.0,
            objetivo.maxOfOrNull { it.second } ?: 0.0,
            real.maxOfOrNull { it.second } ?: 0.0)

        fun x(dia: Int) = left + (right - left) * dia / maxDia
        fun y(peso: Double) = bottom - ((bottom - top) * peso / maxPeso).toFloat()
        p.textSize = 10 * d; p.strokeWidth = d; p.color =
            ContextCompat.getColor(context, R.color.text_primary)
        for (i in 0..4) {
            val v = maxPeso * i / 4;
            val yy = y(v)
            p.alpha = 65; c.drawLine(left, yy, right, yy, p); p.alpha = 255
            c.drawText(v.toInt().toString(), 2 * d, yy + 4 * d, p)
            val dia = maxDia * i / 4; c.drawText(dia.toString(), x(dia) - 4 * d, bottom + 14 * d, p)
        }
        c.drawText("Días de vida", left, bottom + 27 * d, p)
        p.strokeWidth = 2 * d; p.color = Color.GRAY; p.pathEffect =
            DashPathEffect(floatArrayOf(5 * d, 4 * d), 0f)
        objetivo.zipWithNext()
            .forEach { (a, b) -> c.drawLine(x(a.first), y(a.second), x(b.first), y(b.second), p) }
        p.pathEffect = null; p.color = Color.rgb(47, 139, 94)
        real.zipWithNext()
            .forEach { (a, b) -> c.drawLine(x(a.first), y(a.second), x(b.first), y(b.second), p) }
        real.forEach { (dia, peso, desvio) ->
            p.color = if (desvio) Color.rgb(220, 65, 65) else Color.rgb(47, 139, 94); c.drawCircle(
            x(dia),
            y(peso),
            4 * d,
            p
        )
        }
    }
}
