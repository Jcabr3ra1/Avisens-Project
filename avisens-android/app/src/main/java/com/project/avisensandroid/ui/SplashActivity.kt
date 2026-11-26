package com.project.avisensandroid.ui

import android.animation.ValueAnimator
import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.animation.LinearInterpolator
import androidx.appcompat.app.AppCompatActivity
import com.project.avisensandroid.R
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.PI
import kotlin.math.exp

class SplashActivity : AppCompatActivity() {
    private var animator: ValueAnimator? = null
    private var navigating = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val scene = LandingView(this)
        setContentView(scene)

        fun startLanding() {
            if (animator != null || isFinishing || isDestroyed) return

            animator = ValueAnimator.ofFloat(0f, 1600f).apply {
                duration = 1600L
                interpolator = LinearInterpolator()

                addUpdateListener {
                    scene.elapsed = it.animatedValue as Float
                }
                addListener(object : AnimatorListenerAdapter() {
                    private var cancelled = false
                    override fun onAnimationCancel(animation: Animator) {
                        cancelled = true
                    }
                    override fun onAnimationEnd(animation: Animator) {
                        if (cancelled || navigating || isFinishing || isDestroyed) return
                        navigating = true
                        AperturaReanudableActivity.marcarAperturaInicial()
                        startActivity(Intent(this@SplashActivity, LoginActivity::class.java))
                        finish()
                        @Suppress("DEPRECATION")
                        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
                    }
                })

                start()
            }
        }

        if (Build.VERSION.SDK_INT >= 31) {
            splashScreen.setOnExitAnimationListener { provider ->
                provider.remove()
                scene.post { startLanding() }
            }
        } else {
            scene.post { startLanding() }
        }
    }

    override fun onDestroy() {
        animator?.removeAllUpdateListeners()
        animator?.removeAllListeners()
        animator?.cancel()
        super.onDestroy()
    }

    internal class LandingView(context: Context) : View(context) {

        private val body = requireNotNull(
            context.getDrawable(R.drawable.splash_aterrizaje_cuerpo)
        )

        private val wing = requireNotNull(
            context.getDrawable(R.drawable.splash_aterrizaje_ala)
        )

        private val head = requireNotNull(
            context.getDrawable(R.drawable.splash_aterrizaje_cabeza)
        )

        private val nearLeg = requireNotNull(
            context.getDrawable(R.drawable.splash_aterrizaje_pata_cercana)
        )

        private val farLeg = requireNotNull(
            context.getDrawable(R.drawable.splash_aterrizaje_pata_lejana)
        )

        private val paint = Paint(
            Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG
        )

        private val henBounds = Rect(0, 30, 300, 330)

        private val farWing = requireNotNull(
            context.getDrawable(R.drawable.splash_aterrizaje_ala)
        )

        var elapsed = 0f
            set(value) {
                field = value
                invalidate()
            }

        private fun bezier(
            t: Float,
            x1: Float,
            y1: Float,
            x2: Float,
            y2: Float
        ): Float {

            fun curve(u: Float, a: Float, b: Float): Float {
                val v = 1f - u

                return 3f * v * v * u * a +
                        3f * v * u * u * b +
                        u * u * u
            }

            var lo = 0f
            var hi = 1f

            repeat(18) {
                val m = (lo + hi) / 2f

                if (curve(m, x1, x2) < t) {
                    lo = m
                } else {
                    hi = m
                }
            }

            return curve((lo + hi) / 2f, y1, y2)
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)

            canvas.drawColor(androidx.core.content.ContextCompat.getColor(context, R.color.adaptive_splash_bg))

            val scale = min(
                width / 300f,
                min(
                    height / 360f,
                    420f * resources.displayMetrics.density / 300f
                )
            )

            canvas.save()

            canvas.translate(
                (width - 300f * scale) / 2f,
                (height - 360f * scale) / 2f
            )

            canvas.scale(scale, scale)

            val flight = (elapsed / 1100f)
                .coerceIn(0f, 1f)

            val p = bezier(
                flight,
                .15f,
                .55f,
                .35f,
                1f
            )

            val air = 1f - p

            val phase = (
                    flight * 3.4f * 2f * PI
                    ).toFloat()

            val beat = sin(phase)

            val envelope = (1f - flight)
                .coerceIn(0f, 1f)

            val settle = ((elapsed - 1100f) / 500f)
                .coerceIn(0f, 1f)

            val impact = sin(
                settle * PI.toFloat() * 3f
            ) * exp(-settle * 7f)

            val drop = maxOf(
                0f,
                (height / scale - 360f) / 2f + 65f
            )

            // Sombra de la gallina.
            paint.color = Color.argb(
                (33f * p).toInt(),
                70,
                98,
                78
            )

            val shadowWidth = 30f + 35f * p

            canvas.drawOval(
                150f - shadowWidth,
                250f,
                150f + shadowWidth,
                264f,
                paint
            )

            canvas.save()

            // Descenso y desplazamiento del cuerpo.
            canvas.translate(
                -25f * air +
                        sin(flight * PI.toFloat()) * 14f,

                -drop * air +
                        beat * 5f * envelope +
                        impact * 8f
            )

            canvas.rotate(
                -13f * air +
                        beat * 4f * envelope +
                        impact * 4f,
                150f,
                195f
            )

            canvas.scale(
                1f + impact * .045f,
                1f - impact * .07f,
                150f,
                250f
            )

            // Ala trasera.
            canvas.save()

            canvas.rotate(
                -12f +
                        sin(phase - .55f) * 48f * envelope,
                151f,
                180f
            )

            canvas.scale(
                .86f,
                .85f + .12f * beat * envelope,
                151f,
                180f
            )

            farWing.alpha = (255f * envelope).toInt()
            farWing.bounds = henBounds
            farWing.draw(canvas)

            canvas.restore()

            // Extensión de las patas antes del aterrizaje.
            val extend = bezier(
                ((flight - .35f) / .55f).coerceIn(0f, 1f),
                .25f,
                .1f,
                .25f,
                1f
            )

            val flex = maxOf(0f, impact) * 18f

            // Pata lejana.
            canvas.save()

            canvas.rotate(
                35f * (1f - extend) + flex,
                160f,
                219f
            )

            farLeg.bounds = henBounds
            farLeg.draw(canvas)

            canvas.restore()

            // Pata cercana.
            canvas.save()

            canvas.rotate(
                48f * (1f - extend) + flex,
                119f,
                218f
            )

            nearLeg.bounds = henBounds
            nearLeg.draw(canvas)

            canvas.restore()

            // Cuerpo.
            body.bounds = henBounds
            body.draw(canvas)

            // Movimiento independiente de la cabeza.
            canvas.save()

            canvas.rotate(
                8f * air -
                        beat * 5f * envelope -
                        impact * 3f,
                159f,
                181f
            )

            head.bounds = henBounds
            head.draw(canvas)

            canvas.restore()

            // Ala delantera.
            canvas.save()

            canvas.rotate(
                (beat * 66f - 12f) * envelope,
                151f,
                181f
            )

            canvas.scale(
                1f + .25f * envelope,
                1f + .18f * beat * envelope,
                151f,
                181f
            )

            wing.bounds = henBounds
            wing.draw(canvas)

            canvas.restore()
            canvas.restore()

            // Animación del texto AVISENS.
            val reveal = bezier(
                ((elapsed - 450f) / 1150f)
                    .coerceIn(0f, 1f),
                .25f,
                .1f,
                .25f,
                1f
            )

            paint.color = androidx.core.content.ContextCompat.getColor(context, R.color.adaptive_splash_text)

            paint.typeface = Typeface.create(
                "sans-serif",
                Typeface.BOLD
            )

            paint.textSize = 34f

            val word = "AVISENS"

            val total = word.sumOf {
                paint.measureText(it.toString()).toDouble()
            }.toFloat() + 5f * (word.length - 1)

            val left = (300f - total) / 2f

            canvas.save()

            canvas.translate(
                -20f * (1f - reveal),
                0f
            )

            canvas.clipRect(
                left,
                270f,
                left + total * reveal,
                330f
            )

            var x = left

            for (letter in word) {
                val s = letter.toString()

                canvas.drawText(
                    s,
                    x,
                    310f,
                    paint
                )

                x += paint.measureText(s) + 5f
            }

            canvas.restore()
            canvas.restore()
        }
    }
}