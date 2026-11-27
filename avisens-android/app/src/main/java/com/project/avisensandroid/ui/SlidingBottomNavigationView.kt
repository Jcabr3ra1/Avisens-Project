package com.project.avisensandroid.ui

import android.animation.ValueAnimator
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.RectF
import android.graphics.drawable.Drawable
import android.util.AttributeSet
import android.view.View
import android.view.animation.DecelerateInterpolator
import com.google.android.material.bottomnavigation.BottomNavigationView
import kotlin.math.roundToInt
import com.project.avisensandroid.R

/** Conserva el indicador Material original y anima únicamente su posición. */
class SlidingBottomNavigationView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : BottomNavigationView(context, attrs) {

    private var indicador: Drawable? = null
    private var posicion: RectF? = null
    private var destino: RectF? = null
    private var animador: ValueAnimator? = null
    private var ultimoAncho = 0
    private var ultimoAlto = 0

    override fun dispatchDraw(canvas: Canvas) {
        val item = findViewById<View>(selectedItemId)
        val original = item?.findViewById<View>(
            com.google.android.material.R.id.navigation_bar_item_active_indicator_view
        )

        if (original != null && original.width > 0 && original.height > 0) {
            if (indicador == null && isItemActiveIndicatorEnabled) {
                indicador = original.background?.constantState
                    ?.newDrawable(resources)?.mutate()

                if (indicador != null) {
                    // El indicador nativo conserva sus medidas;
                    // solo se oculta su color.
                    itemActiveIndicatorColor =
                        ColorStateList.valueOf(Color.TRANSPARENT)
                }
            }

            val drawable = indicador

            if (drawable != null) {
                val nuevoDestino = limitesEnBarra(original)
                val cambioTamano =
                    width != ultimoAncho || height != ultimoAlto

                ultimoAncho = width
                ultimoAlto = height

                if (posicion == null || cambioTamano) {
                    animador?.cancel()
                    posicion = RectF(nuevoDestino)
                    destino = RectF(nuevoDestino)
                } else if (destino != nuevoDestino) {
                    animarHasta(nuevoDestino)
                }

                posicion?.let { rect ->
                    drawable.setBounds(
                        rect.left.roundToInt(),
                        rect.top.roundToInt(),
                        rect.right.roundToInt(),
                        rect.bottom.roundToInt()
                    )

                    drawable.draw(canvas)
                }
            }
        }

        super.dispatchDraw(canvas)
    }

    private fun limitesEnBarra(vista: View): RectF {
        var x = 0f
        var y = 0f
        var actual: View = vista

        // No usar la escala de la animación nativa de Material.
        while (actual !== this) {
            x += actual.left
            y += actual.top

            val padre = actual.parent as? View ?: break

            x -= padre.scrollX
            y -= padre.scrollY

            actual = padre
        }

        return RectF(
            x,
            y,
            x + vista.width,
            y + vista.height
        )
    }

    private fun animarHasta(nuevoDestino: RectF) {
        animador?.cancel()

        val inicio = RectF(posicion ?: nuevoDestino)
        val fin = RectF(nuevoDestino)

        destino = fin

        animador = ValueAnimator.ofFloat(0f, 1f).apply {

            duration = if (selectedItemId == R.id.nav_bodega) {
                380L
            } else {
                250L
            }

            interpolator = DecelerateInterpolator()

            addUpdateListener { animacion ->
                val t = animacion.animatedValue as Float

                (posicion ?: RectF().also { posicion = it }).set(
                    inicio.left + (fin.left - inicio.left) * t,
                    inicio.top + (fin.top - inicio.top) * t,
                    inicio.right + (fin.right - inicio.right) * t,
                    inicio.bottom + (fin.bottom - inicio.bottom) * t
                )

                invalidate()
            }

            start()
        }
    }

    override fun onDetachedFromWindow() {
        animador?.cancel()
        animador = null
        posicion = null
        destino = null

        super.onDetachedFromWindow()
    }
}