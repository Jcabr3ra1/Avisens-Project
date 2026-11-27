package com.project.avisensandroid.ui

import android.graphics.Typeface
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import com.project.avisensandroid.R

fun AlertDialog.estiloCancelar(): AlertDialog {
    val boton = getButton(AlertDialog.BUTTON_NEGATIVE) ?: return this
    boton.backgroundTintList = null
    boton.setBackgroundResource(R.drawable.bg_cancelar_neutro)
    boton.setTextColor(ContextCompat.getColor(boton.context, R.color.cancel_text))
    boton.setTypeface(boton.typeface, Typeface.BOLD)
    boton.isAllCaps = false
    val positivo = getButton(AlertDialog.BUTTON_POSITIVE)
    if (positivo != null) {
        val eliminar = positivo.text.toString().equals("Eliminar", ignoreCase = true)
        positivo.setTextColor(ContextCompat.getColor(positivo.context, android.R.color.white))
        val fondo = android.graphics.drawable.GradientDrawable().apply {
            cornerRadius = 9 * positivo.resources.displayMetrics.density
            setColor(android.graphics.Color.parseColor(if (eliminar) "#B23A3A" else "#2E8B57"))
        }
        positivo.backgroundTintList = null
        positivo.background = fondo
        positivo.setTypeface(positivo.typeface, Typeface.BOLD)
        positivo.isAllCaps = false
    }
    return this
}
