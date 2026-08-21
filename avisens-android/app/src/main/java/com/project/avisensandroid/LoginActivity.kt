package com.project.avisensandroid

import android.content.Intent
import android.os.Bundle
import android.text.method.HideReturnsTransformationMethod
import android.text.method.PasswordTransformationMethod
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.databinding.ActivityLoginBinding
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding

    // Controla si la contraseña está visible o escondida
    private var passwordVisible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // ==========================================
        // MOSTRAR / OCULTAR CONTRASEÑA
        // ==========================================

        binding.btnTogglePassword.setOnClickListener {

            passwordVisible = !passwordVisible

            if (passwordVisible) {

                // Mostrar contraseña
                binding.etContrasena.transformationMethod =
                    HideReturnsTransformationMethod.getInstance()

                // Cambiar icono a ojo
                binding.btnTogglePassword.setImageResource(
                    R.drawable.ic_eye
                )

            } else {

                // Ocultar contraseña
                binding.etContrasena.transformationMethod =
                    PasswordTransformationMethod.getInstance()

                // Cambiar icono a ojo tachado
                binding.btnTogglePassword.setImageResource(
                    R.drawable.ic_eye_off
                )
            }

            // Mantener el cursor al final del texto
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

    private fun hacerLogin() {

        val username = binding.etCorreo.text.toString().trim()
        val password = binding.etContrasena.text.toString().trim()

        binding.txtError.text = ""

        if (username.isEmpty() || password.isEmpty()) {
            binding.txtError.text = "Completa todos los campos"
            return
        }

        binding.progressLogin.visibility = View.VISIBLE
        binding.btnEntrar.isEnabled = false

        lifecycleScope.launch {
            try {

                val response = RetrofitClient.api.login(
                    LoginRequest(
                        email = username,
                        password = password
                    )
                )

                if (response.isSuccessful) {

                    val loginData = response.body()

                    // Guardar el token
                    guardarToken(
                        loginData?.accessToken ?: ""
                    )

                    // Navegar a MainActivity
                    startActivity(
                        Intent(
                            this@LoginActivity,
                            MainActivity::class.java
                        )
                    )

                    // Cerrar LoginActivity
                    finish()

                } else {

                    binding.txtError.text =
                        "Usuario o contraseña incorrectos"
                }

            } catch (e: Exception) {

                binding.txtError.text =
                    "Error de conexión: ${e.message}"

            } finally {

                binding.progressLogin.visibility = View.GONE
                binding.btnEntrar.isEnabled = true
            }
        }
    }

    private fun guardarToken(token: String) {

        val prefs = getSharedPreferences(
            "app_prefs",
            MODE_PRIVATE
        )

        prefs.edit()
            .putString("token", token)
            .apply()
    }
}