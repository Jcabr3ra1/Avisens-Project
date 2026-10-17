package com.project.avisensandroid.ui

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.Au02RecuperarContrasenaBinding
import com.project.avisensandroid.databinding.Au04NuevaContrasenaBinding
import com.project.avisensandroid.model.CambioPasswordRequest
import com.project.avisensandroid.model.RecuperacionRequest
import java.util.Locale
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

class AccesoAsistidoActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val token = intent.getStringExtra("cambio_password_token")
        if (token.isNullOrBlank()) mostrarRecuperacion() else mostrarCambio(token)
    }

    private fun mostrarRecuperacion() {
        val form = Au02RecuperarContrasenaBinding.inflate(layoutInflater)
        setContentView(form.root)
        form.btnVolver.setOnClickListener { finish() }
        form.btnSolicitarRecuperacion.setOnClickListener {
            val username = form.edtUsuario.text.toString().trim().lowercase(Locale.ROOT)
            if (!Regex("^[a-z0-9][a-z0-9._-]{2,29}$").matches(username)) {
                form.edtUsuario.error = "Escribe un usuario válido de 3 a 30 caracteres"
                return@setOnClickListener
            }
            form.btnSolicitarRecuperacion.isEnabled = false
            lifecycleScope.launch {
                try {
                    val response = RetrofitClient.api.solicitarRecuperacion(RecuperacionRequest(username))
                    form.txtInfo.text = if (response.isSuccessful) {
                        form.btnSolicitarRecuperacion.visibility = android.view.View.GONE
                        "Si la cuenta existe, un administrador revisará tu solicitud. Contacta al administrador para recibir la contraseña temporal."
                    } else if (response.code() == 429) {
                        "Ya se enviaron varios intentos. Espera antes de volver a solicitar."
                    } else {
                        "No se pudo enviar la solicitud. Intenta de nuevo."
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    form.txtInfo.text = "No se pudo conectar. Revisa tu conexión e intenta de nuevo."
                } finally {
                    form.btnSolicitarRecuperacion.isEnabled = true
                }
            }
        }
    }

    private fun mostrarCambio(token: String) {
        val form = Au04NuevaContrasenaBinding.inflate(layoutInflater)
        setContentView(form.root)
        form.btnCambiarContrasena.setOnClickListener {
            val nueva = form.edtNuevaContrasena.text.toString()
            if (nueva.length < 8) {
                form.edtNuevaContrasena.error = "Mínimo 8 caracteres"
                return@setOnClickListener
            }
            if (nueva != form.edtConfirmarContrasena.text.toString()) {
                form.edtConfirmarContrasena.error = "Las contraseñas no coinciden"
                return@setOnClickListener
            }
            form.btnCambiarContrasena.isEnabled = false
            lifecycleScope.launch {
                try {
                    val response = RetrofitClient.api.cambiarPassword("Bearer $token", CambioPasswordRequest(nueva))
                    if (response.isSuccessful) {
                        Toast.makeText(this@AccesoAsistidoActivity, "Contraseña actualizada. Ingresa de nuevo.", Toast.LENGTH_LONG).show()
                        finish()
                    } else {
                        form.txtDescripcionNuevaContrasena.text = "No se pudo cambiar la contraseña. Vuelve al ingreso y solicita otra recuperación si la temporal venció."
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    form.txtDescripcionNuevaContrasena.text = "No se pudo conectar. Revisa tu conexión e intenta de nuevo."
                } finally {
                    form.btnCambiarContrasena.isEnabled = true
                }
            }
        }
    }
}
