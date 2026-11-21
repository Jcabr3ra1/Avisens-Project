
package com.project.avisensandroid.ui

import android.content.Intent
import android.os.Bundle
import android.text.method.HideReturnsTransformationMethod
import android.text.method.PasswordTransformationMethod
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RegistroHttp
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.controller.SesionExpirada
import com.project.avisensandroid.databinding.ActivityLoginBinding
import com.project.avisensandroid.model.LoginRequest
import com.project.avisensandroid.model.ResultadoLogin
import com.project.avisensandroid.model.UserRole
import com.project.avisensandroid.model.UserSession
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.io.IOException

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private var passwordVisible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        RetrofitClient.inicializar(applicationContext)

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        configurarPassword()

        if (intent.getBooleanExtra(SesionExpirada.EXTRA_SESION_EXPIRADA, false)) {
            binding.txtError.text =
                "Tu sesión expiró. Inicia sesión nuevamente."
        }

        binding.btnEntrar.setOnClickListener {
            hacerLogin()
        }
    }

    // =========================================================
    // MOSTRAR / OCULTAR CONTRASEÑA
    // =========================================================

    private fun configurarPassword() {
        binding.btnTogglePassword.setOnClickListener {
            passwordVisible = !passwordVisible

            if (passwordVisible) {
                binding.etContrasena.transformationMethod =
                    HideReturnsTransformationMethod.getInstance()

                binding.btnTogglePassword.setImageResource(
                    R.drawable.ic_eye
                )
            } else {
                binding.etContrasena.transformationMethod =
                    PasswordTransformationMethod.getInstance()

                binding.btnTogglePassword.setImageResource(
                    R.drawable.ic_eye_off
                )
            }

            binding.etContrasena.setSelection(
                binding.etContrasena.text.length
            )
        }
    }

    // =========================================================
    // LOGIN
    // =========================================================

    private fun hacerLogin() {

        val username = binding.etCorreo.text
            .toString()
            .trim()

        val password = binding.etContrasena.text
            .toString()
            .trim()

        binding.txtError.text = ""

        // Validaciones locales
        if (username.isEmpty()) {
            binding.txtError.text =
                "Ingresa tu nombre de usuario"
            return
        }

        if (password.isEmpty()) {
            binding.txtError.text =
                "Ingresa tu contraseña"
            return
        }

        binding.progressLogin.visibility = View.VISIBLE
        binding.btnEntrar.isEnabled = false

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.api.login(
                    LoginRequest(
                        username = username,
                        password = password
                    )
                )

                if (response.isSuccessful) {

                    when (val resultado = ResultadoLogin.desde(response.body())) {

                        is ResultadoLogin.SesionIniciada -> {
                            guardarSesion(
                                token = resultado.accessToken,
                                refreshToken = resultado.refreshToken,
                                usuarioId = resultado.usuarioId,
                                nombre = resultado.nombre,
                                email = resultado.email,
                                rol = resultado.rol
                            )
                            SesionExpirada.reiniciar()

                            startActivity(
                                Intent(
                                    this@LoginActivity,
                                    MainActivity::class.java
                                )
                            )

                            finish()
                        }

                        // La app aún no tiene la pantalla de cambio de
                        // contraseña temporal: el token de cambio no se guarda.
                        ResultadoLogin.CambioPasswordRequerido -> {
                            binding.txtError.text =
                                "Tu contraseña es temporal y debes cambiarla. " +
                                        "Hazlo desde la web de AVÍSENS y vuelve a iniciar sesión aquí."
                        }

                        is ResultadoLogin.RolNoValido -> {
                            binding.txtError.text =
                                "El usuario no tiene un rol válido: ${resultado.rol ?: "sin rol"}"
                        }

                        ResultadoLogin.RespuestaIncompleta -> {
                            binding.txtError.text =
                                "El servidor devolvió una respuesta incompleta. Inténtalo de nuevo."
                        }
                    }

                } else {

                    // El backend responde {"message": "..."} con textos
                    // pensados para el usuario (cuenta bloqueada, contraseña
                    // temporal vencida, sesión ocupada...).
                    val detalle = RegistroHttp.mensajeDeError(
                        response.errorBody()?.string()
                    )

                    binding.txtError.text = when (response.code()) {

                        400 -> detalle
                            ?: "Revisa el nombre de usuario y la contraseña"

                        401 -> "Nombre de usuario o contraseña incorrectos"

                        403 -> detalle ?: "No tienes permisos para acceder"

                        409 -> detalle
                            ?: "No se pudo iniciar sesión. Inténtalo de nuevo."

                        429 -> "Demasiados intentos. Espera un minuto e inténtalo de nuevo."

                        else -> "Error del servidor: ${response.code()}"
                    }
                }

            } catch (cancelacion: CancellationException) {
                throw cancelacion

            } catch (e: IOException) {
                binding.txtError.text =
                    "Error de conexión: ${e.message ?: "error desconocido"}"

            } catch (e: Exception) {
                binding.txtError.text =
                    "No se pudo procesar la respuesta del servidor."

            } finally {
                binding.progressLogin.visibility = View.GONE
                binding.btnEntrar.isEnabled = true
            }
        }
    }

    // =========================================================
    // GUARDAR SESIÓN
    // =========================================================

    private fun guardarSesion(
        token: String,
        refreshToken: String,
        usuarioId: Int,
        nombre: String,
        email: String?,
        rol: UserRole
    ) {
        UserSession.save(
            context = this,
            token = token,
            refreshToken = refreshToken,
            userId = usuarioId,
            name = nombre,
            email = email,
            role = rol
        )
    }
}
