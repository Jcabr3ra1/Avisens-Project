package com.project.avisensandroid

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.View

class ConsumoChartView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    private val linea = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.rgb(18, 177, 121)
        strokeWidth = 4f
        style = Paint.Style.STROKE
    }

    private val puntos = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.rgb(18, 177, 121)
        style = Paint.Style.FILL
    }

    private val texto = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.rgb(60, 70, 65)
        textSize = 8f
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val ancho = width.toFloat()
        val alto = height.toFloat()

        val margenIzq = 14f
        val margenDer = 8f
        val margenSup = 12f
        val margenInf = 18f

        // Líneas horizontales
        val grid = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.rgb(225, 232, 229)
            strokeWidth = 1f
        }

        for (i in 1..3) {
            val y = margenSup +
                    ((alto - margenSup - margenInf) / 4f) * i

            canvas.drawLine(
                margenIzq,
                y,
                ancho - margenDer,
                y,
                grid
            )
        }

        // Puntos de la gráfica
        val valores = floatArrayOf(
            0.08f,
            0.15f,
            0.32f,
            0.62f,
            0.82f
        )

        val nombres = arrayOf(
            "Sem 1",
            "Sem 2",
            "Sem 3",
            "Sem 4",
            "Día 30"
        )

        val espacio =
            (ancho - margenIzq - margenDer) /
                    (valores.size - 1)

        val path = Path()

        valores.forEachIndexed { index, valor ->

            val x = margenIzq + (espacio * index)

            val y =
                alto - margenInf -
                        (valor * (alto - margenSup - margenInf))

            if (index == 0) {
                path.moveTo(x, y)
            } else {
                path.lineTo(x, y)
            }
        }

        canvas.drawPath(path, linea)

        // Puntos
        valores.forEachIndexed { index, valor ->

            val x = margenIzq + (espacio * index)

            val y =
                alto - margenInf -
                        (valor * (alto - margenSup - margenInf))

            canvas.drawCircle(
                x,
                y,
                3.5f,
                puntos
            )

            canvas.drawText(
                nombres[index],
                x - 10f,
                alto - 4f,
                texto
            )
        }
    }
}