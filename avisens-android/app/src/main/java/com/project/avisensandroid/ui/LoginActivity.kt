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
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding

    // Controla si la contraseña está visible
    private var passwordVisible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Inicializar Retrofit
        RetrofitClient.inicializar(applicationContext)

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // ==========================================
        // MOSTRAR / OCULTAR CONTRASEÑA
        // ==========================================

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

            // Mantener cursor al final
            binding.etContrasena.setSelection(
                binding.etContrasena.text.length
            )
        }

        // ==========================================
        // BOTÓN ENTRAR
        // ==========================================

        binding.btnEntrar.setOnClickListener {
            hacerLogin()
        }
    }

    // ==========================================
    // LOGIN
    // ==========================================

    private fun hacerLogin() {

        val email =
            binding.etCorreo.text
                .toString()
                .trim()

        val password =
            binding.etContrasena.text
                .toString()
                .trim()

        // Limpiar mensaje anterior
        binding.txtError.text = ""

        // ==========================================
        // VALIDAR CAMPOS
        // ==========================================

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

        // ==========================================
        // MOSTRAR CARGANDO
        // ==========================================

        binding.progressLogin.visibility =
            View.VISIBLE

        binding.btnEntrar.isEnabled = false

        // ==========================================
        // LLAMAR API
        // ==========================================

        lifecycleScope.launch {

            try {

                val response =
                    RetrofitClient.api.login(
                        LoginRequest(
                            email = email,
                            password = password
                        )
                    )

                // ======================================
                // LOGIN CORRECTO
                // ======================================

                if (response.isSuccessful) {

                    val loginData =
                        response.body()

                    if (loginData == null) {

                        binding.txtError.text =
                            "El servidor no devolvió información"

                        return@launch
                    }

                    // ==================================
                    // GUARDAR ACCESS TOKEN
                    // ==================================

                    guardarToken(
                        loginData.access_token
                    )

                    // ==================================
                    // NAVEGAR A MAIN ACTIVITY
                    // ==================================

                    startActivity(
                        Intent(
                            this@LoginActivity,
                            MainActivity::class.java
                        )
                    )

                    finish()

                } else {

                    // ==================================
                    // ERROR DEL SERVIDOR
                    // ==================================

                    when (response.code()) {

                        401 -> {
                            binding.txtError.text =
                                "Correo o contraseña incorrectos"
                        }

                        403 -> {
                            binding.txtError.text =
                                "Tu cuenta está bloqueada"
                        }

                        else -> {
                            binding.txtError.text =
                                "Error del servidor: ${response.code()}"
                        }
                    }
                }

            } catch (e: Exception) {

                // ==================================
                // ERROR DE CONEXIÓN
                // ==================================

                binding.txtError.text =
                    "Error de conexión: ${e.message}"

            } finally {

                // ==================================
                // OCULTAR CARGANDO
                // ==================================

                binding.progressLogin.visibility =
                    View.GONE

                binding.btnEntrar.isEnabled =
                    true
            }
        }
    }

    // ==========================================
    // GUARDAR TOKEN
    // ==========================================

    private fun guardarToken(token: String) {

        val prefs =
            getSharedPreferences(
                "app_prefs",
                MODE_PRIVATE
            )

        prefs.edit()
            .putString(
                "token",
                token
            )
            .apply()
    }
}