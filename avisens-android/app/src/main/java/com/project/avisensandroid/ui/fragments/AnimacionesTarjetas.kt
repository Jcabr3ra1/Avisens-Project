package com.project.avisensandroid.ui.fragments

import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator

/** Aparición vertical; las actualizaciones no vuelven a animar los IDs conocidos. */
internal class AnimacionesTarjetas {
    private val vistas = mutableSetOf<String>()
    private var indice = 0
    fun reiniciar() { vistas.clear(); indice = 0 }
    fun comenzar() { indice = 0 }

    fun encabezados(contenedor: View) {
        var actual = contenedor
        var nivel = 0
        while (true) {
            val padre = actual.parent as? ViewGroup ?: break
            for (i in 0 until padre.indexOfChild(actual)) {
                val hijo = padre.getChildAt(i)
                if (hijo.visibility == View.VISIBLE && hijo.height != 1 && hijo.layoutParams.height != 1)
                    mostrar(hijo, "encabezado:$nivel:$i", true)
            }
            if (padre is androidx.core.widget.NestedScrollView || padre is android.widget.ScrollView) break
            actual = padre
            nivel++
            if (nivel >= 3) break
        }
        comenzar()
    }

    fun mostrar(tarjeta: View, clave: String, texto: Boolean = false) {
        if (!vistas.add(clave) || tarjeta.visibility != View.VISIBLE) return
        val posicion = indice++
        // Las fechas conservan su aparición incluso en listas extensas.
        val retraso = (posicion * 160L).coerceAtMost(640L)
        tarjeta.animate().cancel()
        tarjeta.alpha = 0f
        tarjeta.translationY = (if (texto) 24f else 48f) * tarjeta.resources.displayMetrics.density
        tarjeta.animate().alpha(1f).translationY(0f)
            .setStartDelay(retraso).setDuration(900L)
            .setInterpolator(DecelerateInterpolator()).start()
    }
}
