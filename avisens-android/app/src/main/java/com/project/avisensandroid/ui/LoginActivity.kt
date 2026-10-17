package com.project.avisensandroid.ui

import android.content.Intent
import android.os.Bundle
import java.util.Locale
import kotlinx.coroutines.CancellationException
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

        binding.txtOlvideContrasena.setOnClickListener {
            startActivity(Intent(this, AccesoAsistidoActivity::class.java))
        }

        binding.btnEntrar.setOnClickListener {
            hacerLogin()
        }
    }

    private fun hacerLogin() {

        val username = binding.etUsuario.text.toString().trim().lowercase(Locale.ROOT)
        val password = binding.etContrasena.text.toString()

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
                        username = username,
                        password = password
                    )
                )

                if (response.isSuccessful) {

                    val loginData = response.body()

                    if (loginData?.requiereCambioPassword == true) {
                        val cambioToken = loginData.cambioPasswordToken
                        if (cambioToken.isNullOrBlank()) {
                            binding.txtError.text = "No se pudo iniciar el cambio de contraseña. Intenta de nuevo."
                        } else {
                            getSharedPreferences("app_prefs", MODE_PRIVATE).edit().clear().apply()
                            binding.etContrasena.text.clear()
                            startActivity(Intent(this@LoginActivity, AccesoAsistidoActivity::class.java)
                                .putExtra("cambio_password_token", cambioToken))
                        }
                    } else {
                        val accessToken = loginData?.accessToken
                        val refreshToken = loginData?.refreshToken
                        if (accessToken.isNullOrBlank() || refreshToken.isNullOrBlank()) {
                            binding.txtError.text = "No se pudo iniciar sesión. Intenta de nuevo."
                        } else {
                            getSharedPreferences("app_prefs", MODE_PRIVATE).edit()
                                .putString("token", accessToken)
                                .putString("refresh_token", refreshToken)
                                .apply()
                            startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                            finish()
                        }
                    }

                } else {

                    binding.txtError.text =
                        when (response.code()) {
                            403 -> "Acceso bloqueado. Revisa tu cuenta o solicita recuperación."
                            429 -> "Demasiados intentos. Espera un momento antes de volver a intentar."
                            401 -> "Usuario o contraseña incorrectos"
                            else -> "No se pudo iniciar sesión. Intenta de nuevo."
                        }
                }

            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {

                binding.txtError.text =
                    "No se pudo conectar. Revisa tu conexión e intenta de nuevo."

            } finally {

                binding.progressLogin.visibility = View.GONE
                binding.btnEntrar.isEnabled = true
            }
        }
    }

}
