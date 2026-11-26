package com.project.avisensandroid.ui

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.view.View
import android.view.ViewGroup
import android.view.animation.LinearInterpolator
import androidx.appcompat.app.AppCompatActivity

/** Reproduce la apertura sin reemplazar la actividad ni su contenido. */
abstract class AperturaReanudableActivity : AppCompatActivity() {

    companion object {

        private var actividadesVisibles = 0
        private var aperturaPendiente = true

        internal fun marcarAperturaInicial() {
            aperturaPendiente = false
        }
    }

    private var contabilizada = false
    private var actividadExterna = false
    private var capa: SplashActivity.LandingView? = null
    private var animadorApertura: ValueAnimator? = null
    private var contenidoOculto: View? = null

    private var accesibilidadAnterior =
        View.IMPORTANT_FOR_ACCESSIBILITY_AUTO

    protected fun omitirAperturaPorActividadExterna() {
        actividadExterna = true
    }

    protected fun cancelarOmisionApertura() {
        actividadExterna = false
    }

    override fun onStart() {

        super.onStart()

        if (!contabilizada) {
            contabilizada = true
            actividadesVisibles++
        }
    }

    override fun onResume() {

        super.onResume()

        actividadExterna = false

        if (aperturaPendiente && !isFinishing) {
            aperturaPendiente = false
            mostrarApertura()
        }
    }

    override fun onStop() {

        if (contabilizada) {

            contabilizada = false

            actividadesVisibles =
                (actividadesVisibles - 1).coerceAtLeast(0)

            if (
                actividadesVisibles == 0 &&
                !isChangingConfigurations &&
                !isFinishing &&
                !actividadExterna
            ) {
                aperturaPendiente = true
            }
        }

        quitarApertura()

        super.onStop()
    }

    private fun mostrarApertura() {

        if (capa != null) return

        val raiz = findViewById<ViewGroup>(
            android.R.id.content
        ) ?: return

        val escena = SplashActivity.LandingView(this).apply {

            isClickable = true
            isFocusable = true

            importantForAccessibility =
                View.IMPORTANT_FOR_ACCESSIBILITY_YES

            contentDescription = "AVISENS"

            elevation = 100 * resources.displayMetrics.density
        }

        contenidoOculto = raiz.getChildAt(0)?.also {

            accesibilidadAnterior =
                it.importantForAccessibility

            it.importantForAccessibility =
                View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
        }

        capa = escena

        raiz.addView(
            escena,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )

        animadorApertura = ValueAnimator.ofFloat(
            0f,
            1600f
        ).apply {

            duration = 1600L

            interpolator = LinearInterpolator()

            addUpdateListener {
                escena.elapsed = it.animatedValue as Float
            }

            addListener(object : AnimatorListenerAdapter() {

                override fun onAnimationEnd(animation: Animator) {
                    quitarApertura()
                }
            })
        }

        animadorApertura?.start()
    }

    private fun quitarApertura() {

        val anterior = animadorApertura

        animadorApertura = null

        anterior?.removeAllListeners()
        anterior?.removeAllUpdateListeners()
        anterior?.cancel()

        capa?.let {
            (it.parent as? ViewGroup)?.removeView(it)
        }

        capa = null

        contenidoOculto?.importantForAccessibility =
            accesibilidadAnterior

        contenidoOculto = null
    }

    override fun onDestroy() {

        quitarApertura()

        super.onDestroy()
    }
}