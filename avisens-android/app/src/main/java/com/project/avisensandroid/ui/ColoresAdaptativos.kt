package com.project.avisensandroid.ui

import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import androidx.core.graphics.ColorUtils

object ColoresAdaptativos {
    private fun oscuro(context: Context): Boolean =
        context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES

    fun texto(context: Context, original: String): Int {
        val color = Color.parseColor(original)
        if (!oscuro(context)) return color
        val hsv = FloatArray(3)
        Color.colorToHSV(color, hsv)
        return when {
            hsv[1] > 0.35f && (hsv[0] < 20f || hsv[0] > 345f) -> Color.parseColor("#FFB4AB")
            hsv[1] > 0.35f && hsv[0] in 20f..65f -> Color.parseColor("#F4D09A")
            else -> Color.WHITE
        }
    }

    fun superficie(context: Context, original: String): Int {
        val color = Color.parseColor(original)
        if (!oscuro(context)) return color
        if (ColorUtils.calculateLuminance(color) < 0.45) return color
        val hsv = FloatArray(3)
        Color.colorToHSV(color, hsv)
        return when {
            hsv[1] > 0.10f && (hsv[0] < 20f || hsv[0] > 345f) -> Color.parseColor("#552620")
            hsv[1] > 0.10f && hsv[0] in 20f..65f -> Color.parseColor("#554120")
            else -> Color.parseColor("#202D26")
        }
    }
}
