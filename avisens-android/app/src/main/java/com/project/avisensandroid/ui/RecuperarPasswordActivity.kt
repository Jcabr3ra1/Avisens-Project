package com.project.avisensandroid.ui

import android.os.Bundle
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.core.view.updatePadding
import androidx.lifecycle.lifecycleScope
import com.google.gson.JsonParseException
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.Au02RecuperarContrasenaBinding
import com.project.avisensandroid.model.SolicitudRecuperacionRequest
import kotlinx.coroutines.launch
import java.io.IOException

class RecuperarPasswordActivity : AperturaReanudableActivity() {
    companion object {
        const val EXTRA_USERNAME = "username"
        private const val ESTADO_RESPUESTA = "respuesta_recuperacion"
        private val formatoUsername = Regex("[a-z0-9][a-z0-9._-]{2,29}")
    }

    private lateinit var binding: Au02RecuperarContrasenaBinding
    private var confirmacion: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        RetrofitClient.inicializar(applicationContext)
        binding = Au02RecuperarContrasenaBinding.inflate(layoutInflater)
        setContentView(binding.root)
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { vista, insets ->
            val margenes = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime() or
                    WindowInsetsCompat.Type.displayCutout()
            )
            vista.updatePadding(margenes.left, margenes.top, margenes.right, margenes.bottom)
            insets
        }

        if (savedInstanceState == null) {
            binding.edtUsuario.setText(intent.getStringExtra(EXTRA_USERNAME).orEmpty().trim())
        }
        savedInstanceState?.getString(ESTADO_RESPUESTA)?.let(::mostrarConfirmacion)
        binding.btnVolver.setOnClickListener { finish() }
        binding.btnVolverLogin.setOnClickListener { finish() }
        binding.btnEnviarSolicitud.setOnClickListener { solicitarRecuperacion() }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(ESTADO_RESPUESTA, confirmacion)
    }

    private fun solicitarRecuperacion() {
        val username = binding.edtUsuario.text.toString().trim().lowercase()
        binding.txtError.isVisible = false
        binding.edtUsuario.error = null
        if (!formatoUsername.matches(username)) {
            binding.edtUsuario.error = getString(
                if (username.isEmpty()) R.string.recuperacion_usuario_requerido
                else R.string.recuperacion_usuario_invalido
            )
            return
        }

        mostrarCarga(true)
        WindowCompat.getInsetsController(window, binding.root).hide(WindowInsetsCompat.Type.ime())
        lifecycleScope.launch {
            try {
                val respuesta = RetrofitClient.api.solicitarRecuperacion(
                    SolicitudRecuperacionRequest(username)
                )
                when {
                    respuesta.isSuccessful -> mostrarConfirmacion(
                        respuesta.body()?.mensaje?.takeIf { it.isNotBlank() }
                            ?: getString(R.string.recuperacion_confirmacion)
                    )
                    respuesta.code() == 429 -> mostrarError(R.string.recuperacion_limite)
                    else -> mostrarError(R.string.recuperacion_error)
                }
            } catch (_: IOException) {
                mostrarError(R.string.recuperacion_conexion)
            } catch (_: JsonParseException) {
                mostrarError(R.string.recuperacion_error)
            } finally {
                mostrarCarga(false)
            }
        }
    }

    private fun mostrarCarga(cargando: Boolean) {
        binding.btnEnviarSolicitud.isEnabled = !cargando
        binding.edtUsuario.isEnabled = !cargando
        binding.btnEnviarSolicitud.setText(
            if (cargando) R.string.recuperacion_enviando else R.string.recuperacion_enviar
        )
    }

    private fun mostrarConfirmacion(mensaje: String) {
        confirmacion = mensaje
        binding.formularioRecuperacion.isVisible = false
        binding.txtConfirmacion.text = mensaje
        binding.txtConfirmacion.isVisible = true
        binding.btnVolverLogin.isVisible = true
    }

    private fun mostrarError(recurso: Int) {
        binding.txtError.setText(recurso)
        binding.txtError.isVisible = true
    }
}
