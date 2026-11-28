package com.project.avisensandroid.ui

import android.animation.ValueAnimator
import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import java.util.concurrent.Executors
import android.view.View
import android.view.animation.LinearInterpolator
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.appcompat.app.AppCompatActivity
import com.project.avisensandroid.R
import kotlin.math.min

class SplashActivity : AppCompatActivity() {

    private var animator: ValueAnimator? = null
    private var navigating = false
    private val handler = Handler(Looper.getMainLooper())
    private val decoder = Executors.newSingleThreadExecutor()
    private var resumed = false
    private var pendingNavigation = false
    private var tryStart: (() -> Unit)? = null
    private val fallback = Runnable { abrirLogin() }


    override fun onCreate(savedInstanceState: Bundle?) {
        val launchScreen = installSplashScreen()
        delegate.localNightMode = androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO
        super.onCreate(savedInstanceState)
        if (!isTaskRoot && intent.action == Intent.ACTION_MAIN &&
            intent.hasCategory(Intent.CATEGORY_LAUNCHER)
        ) {
            finish()
            return
        }
        val scene = LandingView(this)
        setContentView(scene)

        var framesReady = false
        fun startLanding() {
            if (!framesReady || !resumed || pendingNavigation) return
            if (animator != null || isFinishing || isDestroyed) return

            handler.removeCallbacks(fallback)

            animator = ValueAnimator.ofFloat(0f, 2200f).apply {
                duration = 2200L
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
                        abrirLogin()
                    }
                })

                start()
            }
        }

        tryStart = { startLanding() }
        // El sistema entrega la pantalla inicial al contenido de Avisens.
        // No dependemos de un temporizador para simular su salida.
        launchScreen.setOnExitAnimationListener { provider ->
            provider.remove()
            scene.post { startLanding() }
        }
        handler.postDelayed(fallback, 8000L)
        decoder.execute {
            try {
                for (index in 0 until 52) {
                    if (Thread.currentThread().isInterrupted) throw InterruptedException()
                    val bitmap =
                        assets.open("splash3d/frame_%02d.webp".format(java.util.Locale.US, index))
                            .use {
                                requireNotNull(
                                    BitmapFactory.decodeStream(
                                        it,
                                        null,
                                        BitmapFactory.Options().apply {
                                            inSampleSize = 1
                                        })
                                )
                            }
                    handler.post {
                        if (!isFinishing && !isDestroyed && !pendingNavigation) {
                            scene.frames[index] = bitmap
                            if (index == 3) {
                                framesReady = true
                                startLanding()
                            }
                            scene.invalidate()
                        } else bitmap.recycle()
                    }
                }
            } catch (_: Exception) {
                handler.post { abrirLogin() }
            } catch (_: OutOfMemoryError) {
                handler.post { abrirLogin() }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        resumed = true
        if (pendingNavigation) {
            abrirLogin()
        } else {
            animator?.resume()
            tryStart?.invoke()
        }
    }

    override fun onPause() {
        resumed = false
        animator?.pause()
        super.onPause()
    }

    private fun abrirLogin() {
        if (navigating || isFinishing || isDestroyed) return
        if (!resumed) {
            pendingNavigation = true; return
        }
        navigating = true
        handler.removeCallbacks(fallback)
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
        @Suppress("DEPRECATION")
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        decoder.shutdownNow()
        tryStart = null
        animator?.removeAllUpdateListeners()
        animator?.removeAllListeners()
        animator?.cancel()
        super.onDestroy()
    }

    internal class LandingView(context: Context) : View(context) {

        private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        val frames = arrayOfNulls<Bitmap>(52)
        private val frameBounds = RectF(0f, 35f, 300f, 269.78f)

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

            canvas.drawColor(
                androidx.core.content.ContextCompat.getColor(
                    context,
                    R.color.adaptive_splash_bg
                )
            )

            val scale = min(
                width / 320f,
                min(
                    height / 420f,
                    420f * resources.displayMetrics.density / 300f
                )
            )

            canvas.save()

            canvas.translate(
                (width - 300f * scale) / 2f,
                (height - 420f * scale) / 2f
            )

            canvas.scale(scale, scale)

            val loaded = frames
            val frame = if (elapsed < 1800f) {
                ((elapsed / 1800f) * 43f).toInt().coerceIn(0, 43)
            } else {
                (44 + ((elapsed - 1800f) / 400f * 8f).toInt()).coerceIn(44, 51)
            }
            paint.color = Color.WHITE
            val entrance = bezier((elapsed / 850f).coerceIn(0f, 1f), .25f, .1f, .25f, 1f)
            val topOffset = (height / scale - 420f) / 2f + frameBounds.bottom + 8f
            canvas.save()
            canvas.translate(0f, -topOffset * (1f - entrance))
            (frame downTo 0).firstNotNullOfOrNull { loaded[it] }?.let {
                canvas.drawBitmap(it, null, frameBounds, paint)
            }
            canvas.restore()

            // Animación del texto AVISENS.
            val reveal = bezier(
                ((elapsed - 500f) / 1300f)
                    .coerceIn(0f, 1f),
                .25f,
                .1f,
                .25f,
                1f
            )

            paint.color =
                androidx.core.content.ContextCompat.getColor(context, R.color.adaptive_splash_text)

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
                264f,
                left + total * reveal,
                315f
            )

            var x = left

            for (letter in word) {
                val s = letter.toString()

                canvas.drawText(
                    s,
                    x,
                    300f,
                    paint
                )

                x += paint.measureText(s) + 5f
            }

            canvas.restore()
            canvas.restore()
        }
    }
}