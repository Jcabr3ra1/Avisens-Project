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
    private val indicador = androidx.core.content.ContextCompat.getDrawable(barra.context, recurso)!!.mutate()
    private var posicion: RectF? = null
    private var animador: ValueAnimator? = null
    private var destino: View? = null
    init {
        for (i in 0 until barra.childCount) barra.getChildAt(i).background = null
        val p = intArrayOf(barra.paddingLeft, barra.paddingTop, barra.paddingRight, barra.paddingBottom)
        barra.background = this
        barra.setPadding(p[0], p[1], p[2], p[3])
    }
    fun seleccionar(tab: View, origen: View? = null) {
        if (destino === tab && posicion != null && origen == null) return
        destino = tab
        if (barra.width == 0) {
            barra.post { if (destino === tab && barra.width > 0) seleccionar(tab, origen) }
            return
        }
        fun rect(v: View) = RectF(v.left.toFloat(), v.top.toFloat(), v.right.toFloat(), v.bottom.toFloat())
        val fin = rect(tab)
        val inicio = posicion ?: origen?.let { rect(it) } ?: fin
        animador?.cancel()
        if (inicio == fin) { posicion = fin; invalidateSelf(); return }
        animador = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 250L
            interpolator = DecelerateInterpolator()
            addUpdateListener {
                val t = it.animatedValue as Float
                posicion = RectF(inicio.left + (fin.left-inicio.left)*t, inicio.top + (fin.top-inicio.top)*t,
                    inicio.right + (fin.right-inicio.right)*t, inicio.bottom + (fin.bottom-inicio.bottom)*t)
                invalidateSelf()
            }
            start()
        }
    }
    override fun draw(canvas: Canvas) {
        fondo?.let { it.bounds = bounds; it.draw(canvas) }
        val r = posicion ?: destino?.let { RectF(it.left.toFloat(), it.top.toFloat(), it.right.toFloat(), it.bottom.toFloat()) } ?: return
        indicador.setBounds(r.left.toInt(), r.top.toInt(), r.right.toInt(), r.bottom.toInt())
        indicador.draw(canvas)
    }
    override fun setAlpha(alpha: Int) {}
    override fun setColorFilter(colorFilter: ColorFilter?) {}
    @Deprecated("Deprecated in Java") override fun getOpacity(): Int = PixelFormat.TRANSLUCENT
    override fun getPadding(padding: android.graphics.Rect): Boolean = fondo?.getPadding(padding) ?: false
}

internal fun deslizarContenido(barra: View, direccion: Int) {
    val padre = barra.parent as? ViewGroup ?: return
    val distancia = padre.width.toFloat().takeIf { it > 0 } ?: barra.resources.displayMetrics.widthPixels.toFloat()
    for (i in padre.indexOfChild(barra)+1 until padre.childCount) {
        val vista = padre.getChildAt(i)
        vista.animate().cancel()
        vista.translationX = direccion * distancia
        vista.animate().translationX(0f).setDuration(250L).setInterpolator(DecelerateInterpolator()).start()
    }
}

internal fun Fragment.abrirPestanaBitacora(fragment: Fragment, origen: Int) {
    fragment.arguments = android.os.Bundle().apply { putInt("origen_pestana_animada", origen) }
    (requireActivity() as MainActivity).mostrarFragment(fragment)
}

internal fun Fragment.animarPestanaBitacora(barra: ViewGroup, indice: Int) {
    val origen = arguments?.getInt("origen_pestana_animada", -1) ?: -1
    arguments?.remove("origen_pestana_animada")
    val selector = SelectorAnimado(barra, R.drawable.bg_bitacora_tab_selected)
    selector.seleccionar(barra.getChildAt(indice), if (origen in 0..2) barra.getChildAt(origen) else null)
    if (origen in 0..2 && origen != indice) {
        deslizarContenido(barra, if (indice > origen) 1 else -1)
    }
}