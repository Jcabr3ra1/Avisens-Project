package com.project.avisensandroid.ui

import android.os.Bundle
import android.text.InputFilter
import android.text.InputType
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.google.gson.JsonObject
import com.project.avisensandroid.controller.OfflineCache
import com.project.avisensandroid.controller.RegistroHttp
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.Au02RecuperarContrasenaBinding
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.io.IOException

class RecuperacionActivity : AperturaReanudableActivity() {

    private lateinit var binding: Au02RecuperarContrasenaBinding
    private var cambioToken: String? = null
    private var enviando = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        RetrofitClient.inicializar(applicationContext)
        binding = Au02RecuperarContrasenaBinding.inflate(layoutInflater)
        setContentView(binding.root)
        cambioToken = intent.getStringExtra("cambio_token")
        if (cambioToken != null) {
            configurarCambio()
        } else {
            binding.edtUsuario.setText(intent.getStringExtra("username").orEmpty())
        }
        binding.txtVolver.setOnClickListener { if (!enviando) finish() }
        binding.btnEnviarSolicitud.setOnClickListener { enviar() }
        if (savedInstanceState == null) animarEntrada()
    }

    private fun animarEntrada() {
        val grupos = listOf(
            listOf(binding.imgRecuperacion),
            listOf(binding.txtTitulo),
            listOf(binding.txtDescripcion),
            listOf(binding.txtCampoUno, binding.edtUsuario),
            listOf(binding.txtCampoDos, binding.edtMotivo),
            listOf(binding.btnEnviarSolicitud),
            listOf(binding.txtVolver)
        )
        val densidad = resources.displayMetrics.density
        grupos.forEachIndexed { indice, vistas ->
            vistas.forEach { vista ->
                vista.alpha = 0f
                val encabezado = indice < 3
                vista.translationX = if (encabezado) -48f * densidad else 0f
                vista.translationY = if (encabezado) 0f else -14f * densidad
                vista.animate()
                    .alpha(1f)
                    .translationX(0f)
                    .translationY(0f)
                    .setStartDelay(if (encabezado) indice * 220L else 660L + (indice - 3) * 120L)
                    .setDuration(if (encabezado) 900L else 400L)
                    .setInterpolator(DecelerateInterpolator())
                    .start()
            }
        }
    }

    private fun configurarCambio() {
        binding.txtTitulo.text = "Nueva contraseña"
        binding.txtDescripcion.text =
            "Tu contraseña es temporal. Debes reemplazarla para iniciar sesión."
        binding.txtCampoUno.text = "Nueva contraseña"
        binding.txtCampoDos.text = "Confirmar contraseña"
        listOf(binding.edtUsuario, binding.edtMotivo).forEach { campo ->
            campo.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            campo.filters = arrayOf(InputFilter.LengthFilter(72))
            campo.setSingleLine(true)
            campo.gravity = android.view.Gravity.CENTER_VERTICAL or android.view.Gravity.START
        }
        binding.edtMotivo.layoutParams = binding.edtMotivo.layoutParams.apply {
            height = (52 * resources.displayMetrics.density).toInt()
        }
        binding.edtUsuario.hint = "Mínimo 8 caracteres"
        binding.edtMotivo.hint = "Repite la contraseña"
        binding.btnEnviarSolicitud.text = "Guardar contraseña"
    }

    private fun mostrarConfirmacion(esSolicitud: Boolean) {
        val vista = layoutInflater.inflate(
            com.project.avisensandroid.R.layout.dialog_recuperacion_exitosa,
            null
        )
        val titulo = vista.findViewById<android.widget.TextView>(
            com.project.avisensandroid.R.id.txtConfirmacionTitulo
        )
        val mensaje = vista.findViewById<android.widget.TextView>(
            com.project.avisensandroid.R.id.txtConfirmacionMensaje
        )
        if (!esSolicitud) {
            titulo.text = "¡Contraseña actualizada!"
            mensaje.text = "Inicia sesión nuevamente con tu nueva contraseña."
        }
        val dialogo = AlertDialog.Builder(this)
            .setView(vista)
            .setCancelable(false)
            .create()
        vista.findViewById<View>(
            com.project.avisensandroid.R.id.btnConfirmacionInicio
        ).setOnClickListener {
            dialogo.dismiss()
            finish()
        }
        dialogo.show()
        dialogo.window?.setBackgroundDrawableResource(android.R.color.transparent)
        val densidad = resources.displayMetrics.density
        dialogo.window?.setLayout(
            (resources.displayMetrics.widthPixels - 40 * densidad).toInt()
                .coerceAtMost((360 * densidad).toInt()),
            android.view.ViewGroup.LayoutParams.WRAP_CONTENT
        )
        vista.alpha = 0f
        vista.translationY = 24 * densidad
        vista.scaleX = 0.96f
        vista.scaleY = 0.96f
        vista.animate()
            .alpha(1f)
            .translationY(0f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(350L)
            .setInterpolator(DecelerateInterpolator())
            .start()
    }

    private fun enviar() {
        if (enviando) return
        binding.txtError.text = ""
        val token = cambioToken
        val primero = binding.edtUsuario.text.toString()
        val segundo = binding.edtMotivo.text.toString()
        val datos = JsonObject()
        if (token == null) {
            val usuario = primero.trim()
            if (usuario.length !in 3..30) {
                binding.edtUsuario.error = "Ingresa un usuario de 3 a 30 caracteres"
                return
            }
            if (segundo.isBlank()) {
                binding.edtMotivo.error = "Ingresa el motivo de la solicitud"
                return
            }
            datos.addProperty("username", usuario)
            datos.addProperty("motivo", segundo.trim())
        } else {
            if (primero.length !in 8..72 || primero.toByteArray(Charsets.UTF_8).size > 72 || primero != primero.trim()) {
                binding.edtUsuario.error =
                    "Usa de 8 a 72 caracteres, máximo 72 bytes y sin espacios al inicio o final"
                return
            }
            if (primero != segundo) {
                binding.edtMotivo.error = "Las contraseñas no coinciden"
                return
            }
            datos.addProperty("nueva_password", primero)
        }
        if (!OfflineCache.hayInternet(this)) {
            binding.txtError.text = "Sin conexión a internet. Inténtalo de nuevo."
            return
        }
        enviando = true
        binding.btnEnviarSolicitud.isEnabled = false
        binding.txtVolver.isEnabled = false
        binding.progreso.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val respuesta = if (token == null) {
                    RetrofitClient.api.solicitarRecuperacion(datos)
                } else {
                    RetrofitClient.api.cambiarPasswordTemporal("Bearer $token", datos)
                }
                if (respuesta.isSuccessful) {
                    binding.edtUsuario.text?.clear()
                    binding.edtMotivo.text?.clear()
                    cambioToken = null
                    intent.removeExtra("cambio_token")
                    mostrarConfirmacion(token == null)
                } else {
                    val detalle = RegistroHttp.mensajeDeError(respuesta.errorBody()?.string())
                    binding.txtError.text = when (respuesta.code()) {
                        429 -> "Demasiadas solicitudes. Inténtalo en 15 minutos."
                        401, 403 -> if (token != null) "El permiso de cambio no es válido o venció. Vuelve a iniciar sesión." else "No se pudo enviar la solicitud."
                        400 -> detalle ?: "Revisa los datos ingresados."
                        else -> "No se pudo completar la operación. Inténtalo de nuevo."
                    }
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: IOException) {
                binding.txtError.text =
                    "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo."
            } catch (e: Exception) {
                binding.txtError.text = "No se pudo completar la operación."
            } finally {
                enviando = false
                binding.btnEnviarSolicitud.isEnabled = true
                binding.txtVolver.isEnabled = true
                binding.progreso.visibility = View.GONE
            }
        }
    }
}
