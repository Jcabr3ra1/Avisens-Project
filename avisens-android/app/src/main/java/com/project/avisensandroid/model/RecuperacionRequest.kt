package com.project.avisensandroid.model

import com.google.gson.annotations.SerializedName

data class RecuperacionRequest(val username: String)
data class MensajeResponse(val mensaje: String?)
data class CambioPasswordRequest(@SerializedName("nueva_password") val nuevaPassword: String)
