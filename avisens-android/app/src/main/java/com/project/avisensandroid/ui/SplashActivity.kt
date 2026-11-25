package com.project.avisensandroid.ui

import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.Animatable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class SplashActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val density = resources.displayMetrics.density
        fun dp(value: Int) = (value * density).toInt()
        val root = FrameLayout(this).apply { setBackgroundColor(Color.rgb(230, 241, 235)) }
        val gallina = ImageView(this).apply {
            setImageResource(R.drawable.splash_gallina_animada)
            scaleType = ImageView.ScaleType.FIT_CENTER
        }
        root.addView(gallina, FrameLayout.LayoutParams(dp(288), dp(288), Gravity.CENTER))
        val nombre = TextView(this).apply {
            text = "AVISENS"
            textSize = 34f
            setTextColor(Color.rgb(40, 91, 67))
            setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
            alpha = 0f
            translationX = -dp(40).toFloat()
        }
        root.addView(nombre, FrameLayout.LayoutParams(-1, dp(56), Gravity.CENTER).apply { topMargin = dp(240) })
        setContentView(root)
        if (Build.VERSION.SDK_INT >= 31) {
            splashScreen.setOnExitAnimationListener { provider ->
                provider.animate().alpha(0f).setDuration(80L).withEndAction { provider.remove() }.start()
            }
        }
        (gallina.drawable as? Animatable)?.start()
        nombre.animate().alpha(1f).translationX(0f).setDuration(450L)
            .setInterpolator(DecelerateInterpolator()).start()
        lifecycleScope.launch {
            delay(1200L)
            startActivity(Intent(this@SplashActivity, LoginActivity::class.java))
            finish()
            @Suppress("DEPRECATION")
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }
    }
}