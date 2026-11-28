package com.project.avisensandroid.ui.fragments

import android.animation.ValueAnimator
import android.graphics.Canvas
import android.graphics.ColorFilter
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.drawable.Drawable
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import androidx.fragment.app.Fragment
import com.project.avisensandroid.R
import com.project.avisensandroid.ui.MainActivity

/** Indicador dibujado detrás de los textos, sin cambiar las medidas del selector. */
internal class SelectorAnimado(private val barra: ViewGroup, recurso: Int) : Drawable() {
    private val fondo = barra.background
    private val indicador =
        androidx.core.content.ContextCompat.getDrawable(barra.context, recurso)!!.mutate()
    private var posicion: RectF? = null
    private var animador: ValueAnimator? = null
    private var destino: View? = null

    init {
        for (i in 0 until barra.childCount) barra.getChildAt(i).background = null
        val p =
            intArrayOf(barra.paddingLeft, barra.paddingTop, barra.paddingRight, barra.paddingBottom)
        barra.background = this
        barra.setPadding(p[0], p[1], p[2], p[3])
    }

    fun seleccionar(tab: View, origen: View? = null) {
        destino = tab
        if (tab.width == 0 || tab.height == 0 || barra.isLayoutRequested) {
            androidx.core.view.OneShotPreDrawListener.add(barra) {
                if (destino === tab) mover(tab, origen)
            }
        } else mover(tab, origen)
    }

    private fun mover(tab: View, origen: View?) {
        if (tab.width == 0 || tab.height == 0) return
        fun rect(v: View) =
            RectF(v.left.toFloat(), v.top.toFloat(), v.right.toFloat(), v.bottom.toFloat())

        val fin = rect(tab)
        val inicio = posicion?.takeIf { !it.isEmpty } ?: origen?.let { rect(it) } ?: fin
        animador?.cancel()
        posicion = inicio
        invalidateSelf()
        barra.invalidate()
        if (inicio == fin) return
        animador = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 250L
            interpolator = DecelerateInterpolator()
            addUpdateListener {
                val t = it.animatedValue as Float
                posicion = RectF(
                    inicio.left + (fin.left - inicio.left) * t,
                    inicio.top + (fin.top - inicio.top) * t,
                    inicio.right + (fin.right - inicio.right) * t,
                    inicio.bottom + (fin.bottom - inicio.bottom) * t
                )
                invalidateSelf()
                barra.invalidate()
            }
            start()
        }
    }

    override fun draw(canvas: Canvas) {
        fondo?.let { it.bounds = bounds; it.draw(canvas) }
        val r = posicion ?: destino?.let {
            RectF(
                it.left.toFloat(),
                it.top.toFloat(),
                it.right.toFloat(),
                it.bottom.toFloat()
            )
        } ?: return
        indicador.setBounds(r.left.toInt(), r.top.toInt(), r.right.toInt(), r.bottom.toInt())
        indicador.draw(canvas)
    }

    override fun setAlpha(alpha: Int) {}
    override fun setColorFilter(colorFilter: ColorFilter?) {}

    @Deprecated("Deprecated in Java")
    override fun getOpacity(): Int = PixelFormat.TRANSLUCENT
    override fun getPadding(padding: android.graphics.Rect): Boolean =
        fondo?.getPadding(padding) ?: false
}

internal fun deslizarContenido(barra: View, direccion: Int) {
    val padre = barra.parent as? ViewGroup ?: return
    val distancia = padre.width.toFloat().takeIf { it > 0 }
        ?: barra.resources.displayMetrics.widthPixels.toFloat()
    for (i in padre.indexOfChild(barra) + 1 until padre.childCount) {
        animarContenidoHorizontal(padre.getChildAt(i), direccion, distancia)
    }
}

internal fun animarContenidoHorizontal(vista: View, direccion: Int, distancia: Float) {
    if (vista.visibility != View.VISIBLE) return
    vista.animate().cancel()
    vista.translationX = direccion * distancia
    vista.animate().translationX(0f).setStartDelay(0L).setDuration(250L)
        .setInterpolator(DecelerateInterpolator()).start()
}

internal fun Fragment.abrirPestanaBitacora(fragment: Fragment, origen: Int) {
    fragment.arguments = android.os.Bundle().apply { putInt("origen_pestana_animada", origen) }
    (requireActivity() as MainActivity).mostrarFragment(fragment)
}

internal fun Fragment.animarPestanaBitacora(barra: ViewGroup, indice: Int) {
    val origen = arguments?.getInt("origen_pestana_animada", -1) ?: -1
    arguments?.remove("origen_pestana_animada")
    val selector = SelectorAnimado(barra, R.drawable.bg_bitacora_tab_selected)
    androidx.core.view.OneShotPreDrawListener.add(barra) {
        selector.seleccionar(
            barra.getChildAt(indice),
            if (origen in 0 until barra.childCount) barra.getChildAt(origen) else null
        )
        if (origen in 0 until barra.childCount && origen != indice) {
            deslizarContenido(barra, if (indice > origen) 1 else -1)
        }
    }
}