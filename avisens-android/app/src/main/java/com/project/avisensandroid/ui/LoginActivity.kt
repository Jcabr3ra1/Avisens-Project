package com.project.avisensandroid.ui

import android.content.Intent
import android.os.Bundle
import android.text.method.HideReturnsTransformationMethod
import android.text.method.PasswordTransformationMethod
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.ActivityLoginBinding
import com.project.avisensandroid.model.LoginRequest
import com.project.avisensandroid.model.UserRole
import com.project.avisensandroid.model.UserSession
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding

    private var passwordVisible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        RetrofitClient.inicializar(applicationContext)

        binding =
            ActivityLoginBinding.inflate(layoutInflater)

        setContentView(binding.root)

        configurarPassword()

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

        val email =
            binding.etCorreo.text
                .toString()
                .trim()

        val password =
            binding.etContrasena.text
                .toString()
                .trim()

        binding.txtError.text = ""

        // =====================================================
        // VALIDACIONES
        // =====================================================

        if (email.isEmpty()) {

            binding.txtError.text =
                "Ingresa tu correo electrónico"

            return
        }

        if (password.isEmpty()) {

            binding.txtError.text =
                "Ingresa tu contraseña"

            return
        }

        // =====================================================
        // CARGANDO
        // =====================================================

        binding.progressLogin.visibility =
            View.VISIBLE

        binding.btnEntrar.isEnabled = false

        // =====================================================
        // API
        // =====================================================

        lifecycleScope.launch {

            try {

                val response =
                    RetrofitClient.api.login(
                        LoginRequest(
                            email = email,
                            password = password
                        )
                    )

                if (response.isSuccessful) {

                    val loginData =
                        response.body()

                    if (loginData == null) {

                        binding.txtError.text =
                            "El servidor no devolvió información"

                        return@launch
                    }

                    // =================================================
                    // DATOS DEL USUARIO
                    // =================================================

                    val usuario =
                        loginData.usuario

                    val role =
                        UserRole.fromApiValue(usuario.rol)

                    if (role == null) {

                        binding.txtError.text =
                            "El usuario no tiene un rol válido: ${usuario.rol}"

                        return@launch
                    }

                    // =================================================
                    // GUARDAR SESIÓN CON EL ROL REAL DE LA API
                    // =================================================

                    guardarSesion(
                        token = loginData.access_token,
                        refreshToken = loginData.refresh_token,
                        usuarioId = usuario.id,
                        nombre = usuario.nombre,
                        email = usuario.email,
                        rol = role
                    )

                    // =================================================
                    // IR A MAIN
                    // =================================================

                    startActivity(
                        Intent(
                            this@LoginActivity,
                            MainActivity::class.java
                        )
                    )

                    finish()

                } else {

                    when (response.code()) {

                        401 -> {

                            binding.txtError.text =
                                "Correo o contraseña incorrectos"
                        }

                        403 -> {

                            binding.txtError.text =
                                "No tienes permisos para acceder"
                        }

                        else -> {

                            binding.txtError.text =
                                "Error del servidor: ${response.code()}"
                        }
                    }
                }

            } catch (e: Exception) {

                binding.txtError.text =
                    "Error de conexión: ${
                        e.message ?: "error desconocido"
                    }"

            } finally {

                binding.progressLogin.visibility =
                    View.GONE

                binding.btnEntrar.isEnabled =
                    true
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
        email: String,
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