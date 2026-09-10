package com.project.avisensandroid.model

/**
 * Respuesta mínima usada por los Spinners de lotes.
 * El endpoint devuelve más campos, pero para registrar mortalidad
 * y eventos sanitarios solo necesitamos el id y el código.
 */
data class LoteSelectorResponse(
    val id: Int = 0,
    val codigo: String = ""
)
