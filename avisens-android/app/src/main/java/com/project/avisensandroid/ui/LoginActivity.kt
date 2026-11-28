
package com.project.avisensandroid.ui

import android.content.Intent
import android.graphics.Rect
import android.os.Bundle
import android.text.method.HideReturnsTransformationMethod
import android.text.method.PasswordTransformationMethod
import android.view.View
import android.view.ViewTreeObserver
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.OfflineCache
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

class LoginActivity : AperturaReanudableActivity() {
    companion object {
        const val EXTRA_ADMIN_NO_PERMITIDO = "admin_no_permitido"
        private const val MENSAJE_ADMIN =
            "El acceso de administradores está disponible únicamente desde la plataforma web."
    }

    private fun rolMovilPermitido(): Boolean =
        UserSession.role(this) == UserRole.PROPIETARIO ||
                UserSession.role(this) == UserRole.OPERARIO


    private lateinit var binding: ActivityLoginBinding

    private var passwordVisible = false

    // Control del teclado.
    private var tecladoVisible = false
    private var alturaNormalVentana = 0

    private var listenerTeclado:
            ViewTreeObserver.OnGlobalLayoutListener? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        RetrofitClient.inicializar(applicationContext)

        // Android ajusta la ventana al abrir el teclado.
        window.setSoftInputMode(
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or
                    WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN
        )

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        configurarPassword()
        configurarDesplazamientoTeclado()

        val administradorGuardado = UserSession.role(this) == UserRole.ADMINISTRADOR
        if (administradorGuardado) {
            val refreshToken = UserSession.refreshToken(this)
            UserSession.clear(this)
            if (!refreshToken.isNullOrBlank()) {
                RetrofitClient.cerrarSesionRemota(refreshToken)
            }
        }

        // Reutilizar únicamente una sesión previamente autenticada.
        if (
            !intent.getBooleanExtra(
                SesionExpirada.EXTRA_SESION_EXPIRADA,
                false
            ) &&
            UserSession.isLoggedIn(this) &&
            rolMovilPermitido()
        ) {
            abrirSesionGuardada()
            return
        }

        if (
            intent.getBooleanExtra(
                SesionExpirada.EXTRA_SESION_EXPIRADA,
                false
            )
        ) {
            binding.txtError.text =
                "Tu sesión expiró. Inicia sesión nuevamente."
        }

        if (administradorGuardado || intent.getBooleanExtra(EXTRA_ADMIN_NO_PERMITIDO, false)) {
            binding.txtError.text = MENSAJE_ADMIN
        }

        if (savedInstanceState == null) {
            animarEntradaLogin()
        }

        binding.btnEntrar.setOnClickListener {
            hacerLogin()
        }
        binding.btnRecuperarPassword.setOnClickListener {
            startActivity(Intent(this, RecuperarPasswordActivity::class.java).apply {
                putExtra(RecuperarPasswordActivity.EXTRA_USERNAME, binding.etCorreo.text.toString())
            })
        }
    }

    // Animación de entrada escalonada, sin mover la tarjeta del login.
    private fun animarEntradaLogin() {
        val grupos = listOf(
            listOf(binding.imgLogo),
            listOf(binding.txtNombreApp),
            listOf(binding.txtHeroTitulo),
            listOf(binding.txtIniciarSesion),
            listOf(binding.txtSubtitulo),
            listOf(binding.txtCorreo, binding.etCorreo, binding.iconCorreo),
            listOf(binding.txtContrasena, binding.etContrasena,
                binding.iconContrasena, binding.btnTogglePassword),
            listOf(binding.checkRecordarme, binding.btnRecuperarPassword),
            listOf(binding.btnEntrar)
        )

        grupos.forEachIndexed { indice, vistas ->
            vistas.forEach { vista ->
                vista.alpha = 0f
                // Encabezado: entrada de izquierda a derecha.
                // Formulario: entrada de arriba hacia abajo.
                val esEncabezado = indice < 3
                vista.translationX = if (esEncabezado) -dp(48).toFloat() else 0f
                vista.translationY = if (esEncabezado) 0f else -dp(14).toFloat()
                vista.animate()
                    .alpha(1f)
                    .translationX(0f)
                    .translationY(0f)
                    .setStartDelay(if (esEncabezado) indice * 220L else 660L + (indice - 3) * 120L)
                    .setDuration(if (esEncabezado) 900L else 400L)
                    .setInterpolator(DecelerateInterpolator())
                    .start()
            }
        }
    }

    // =========================================================
    // DESPLAZAMIENTO AUTOMÁTICO DEL LOGIN
    // =========================================================

    private fun configurarDesplazamientoTeclado() {

        val root = binding.root
        val tarjeta = binding.cardLogin

        // Altura inicial de la ventana.
        root.post {
            val rect = Rect()
            root.getWindowVisibleDisplayFrame(rect)

            alturaNormalVentana = rect.height()
            tarjeta.translationY = 0f
        }

        // Detector principal del teclado.
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->

            val imeVisible = insets.isVisible(
                WindowInsetsCompat.Type.ime()
            )

            if (imeVisible) {

                actualizarEstadoTeclado(true)

            } else {

                // Algunos celulares no informan correctamente
                // el estado del teclado mediante WindowInsets.
                root.post {
                    comprobarTecladoPorAreaVisible()
                }
            }

            insets
        }

        // Detector alternativo para diferentes celulares.
        val listener = ViewTreeObserver.OnGlobalLayoutListener {
            comprobarTecladoPorAreaVisible()
        }

        listenerTeclado = listener

        root.viewTreeObserver.addOnGlobalLayoutListener(listener)

        // Recalcular el desplazamiento al cambiar de campo.
        binding.etCorreo.setOnFocusChangeListener { _, tieneFoco ->

            if (tieneFoco && tecladoVisible) {
                root.post {
                    moverTarjetaSobreTeclado()
                }
            }
        }

        binding.etContrasena.setOnFocusChangeListener { _, tieneFoco ->

            if (tieneFoco && tecladoVisible) {
                root.post {
                    moverTarjetaSobreTeclado()
                }
            }
        }

        ViewCompat.requestApplyInsets(root)
    }

    // =========================================================
    // DETECTAR TECLADO POR ÁREA VISIBLE
    // =========================================================

    private fun comprobarTecladoPorAreaVisible() {

        if (!::binding.isInitialized) return

        val root = binding.root

        if (!ViewCompat.isAttachedToWindow(root)) return

        val rect = Rect()
        root.getWindowVisibleDisplayFrame(rect)

        val alturaVisible = rect.height()

        if (alturaVisible <= 0) return

        if (alturaVisible > alturaNormalVentana) {
            alturaNormalVentana = alturaVisible
        }

        if (alturaNormalVentana <= 0) return

        val diferencia =
            alturaNormalVentana - alturaVisible

        val tecladoAbierto =
            diferencia > dp(150)

        if (tecladoAbierto) {

            actualizarEstadoTeclado(true)

        } else {

            val insets = ViewCompat.getRootWindowInsets(root)

            val imeVisible = insets?.isVisible(
                WindowInsetsCompat.Type.ime()
            ) == true

            if (!imeVisible) {
                actualizarEstadoTeclado(false)
            }
        }
    }

    // =========================================================
    // ACTUALIZAR ESTADO DEL TECLADO
    // =========================================================

    private fun actualizarEstadoTeclado(visible: Boolean) {

        if (!::binding.isInitialized) return

        val cambioEstado = tecladoVisible != visible

        tecladoVisible = visible

        if (visible) {

            binding.root.post {

                if (tecladoVisible) {
                    moverTarjetaSobreTeclado()
                }
            }

        } else if (
            cambioEstado ||
            binding.cardLogin.translationY != 0f
        ) {

            // Regresar a la posición original.
            binding.cardLogin.animate().cancel()
            binding.cardLogin.translationY = 0f
        }
    }

    // =========================================================
    // MOVER TARJETA SOBRE EL TECLADO
    // =========================================================

    private fun moverTarjetaSobreTeclado() {

        if (!tecladoVisible) return

        val tarjeta = binding.cardLogin
        val root = binding.root

        if (!ViewCompat.isAttachedToWindow(tarjeta)) return

        val rectVisible = Rect()
        root.getWindowVisibleDisplayFrame(rectVisible)

        val posicionTarjeta = IntArray(2)
        tarjeta.getLocationOnScreen(posicionTarjeta)

        // Recuperar la posición original de la tarjeta.
        val parteInferiorOriginal =
            posicionTarjeta[1] -
                    tarjeta.translationY +
                    tarjeta.height

        // Utilizar solamente el área visible real.
        // No descontar nuevamente la altura del teclado.
        val limiteInferior = rectVisible.bottom

        // Margen pequeño sobre el teclado.
        val margen = dp(12)

        val desplazamientoNecesario =
            (parteInferiorOriginal - limiteInferior + margen)
                .coerceAtLeast(0f)

        // Desplazar únicamente lo necesario.
        tarjeta.translationY = -desplazamientoNecesario
    }

    private fun dp(valor: Int): Int {
        return (valor * resources.displayMetrics.density).toInt()
    }

    // =========================================================
    // LIMPIEZA DE LISTENERS
    // =========================================================

    override fun onDestroy() {

        if (::binding.isInitialized) {

            listenerTeclado?.let { listener ->

                val observer = binding.root.viewTreeObserver

                if (observer.isAlive) {
                    observer.removeOnGlobalLayoutListener(listener)
                }
            }

            ViewCompat.setOnApplyWindowInsetsListener(
                binding.root,
                null
            )
        }

        listenerTeclado = null

        super.onDestroy()
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
    // SESIÓN GUARDADA
    // =========================================================

    private fun abrirSesionGuardada() {

        startActivity(
            Intent(
                this,
                MainActivity::class.java
            )
        )

        finish()
    }

    // =========================================================
    // INICIO DE SESIÓN
    // =========================================================

    private fun hacerLogin() {

        if (!OfflineCache.hayInternet(this)) {

            if (
                UserSession.isLoggedIn(this) &&
                rolMovilPermitido()
            ) {

                abrirSesionGuardada()

            } else {

                binding.txtError.text =
                    "Sin conexión a internet. Inténtalo de nuevo."
            }

            return
        }

        val username = binding.etCorreo.text
            .toString()
            .trim()

        val password = binding.etContrasena.text
            .toString()
            .trim()

        binding.txtError.text = ""

        // Validaciones locales.
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
        binding.btnRecuperarPassword.isEnabled = false

        lifecycleScope.launch {

            try {

                val response = RetrofitClient.api.login(
                    LoginRequest(
                        username = username,
                        password = password
                    )
                )

                if (response.isSuccessful) {

                    when (
                        val resultado = ResultadoLogin.desde(
                            response.body()
                        )
                    ) {

                        is ResultadoLogin.SesionIniciada -> {
                            if (resultado.rol == UserRole.ADMINISTRADOR) {
                                RetrofitClient.cerrarSesionRemota(resultado.refreshToken)
                                binding.txtError.text = MENSAJE_ADMIN
                                return@launch
                            }

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

                        ResultadoLogin.CambioPasswordRequerido -> {

                            binding.txtError.text =
                                "Tu contraseña es temporal y debes cambiarla. " +
                                        "Hazlo desde la web de AVÍSENS y vuelve a iniciar sesión aquí."
                        }

                        is ResultadoLogin.RolNoValido -> {

                            binding.txtError.text =
                                "El usuario no tiene un rol válido: " +
                                        "${resultado.rol ?: "sin rol"}"
                        }

                        ResultadoLogin.RespuestaIncompleta -> {

                            binding.txtError.text =
                                "El servidor devolvió una respuesta incompleta. " +
                                        "Inténtalo de nuevo."
                        }
                    }

                } else {

                    val detalle = RegistroHttp.mensajeDeError(
                        response.errorBody()?.string()
                    )

                    binding.txtError.text = when (
                        response.code()
                    ) {

                        400 -> detalle
                            ?: "Revisa el nombre de usuario y la contraseña"

                        401 ->
                            "Usuario o contraseña incorrectos."

                        403 -> {
                            if (
                                detalle?.contains(
                                    "bloqueada temporalmente",
                                    ignoreCase = true
                                ) == true
                            ) {
                                "Cuenta bloqueada por seguridad, intenta de nuevo en 15 minutos."
                            } else {
                                detalle ?: "Acceso denegado."
                            }
                        }

                        409 -> detalle
                            ?: "No se pudo iniciar sesión. Inténtalo de nuevo."

                        429 ->
                            "Demasiados intentos. Espera un minuto."

                        else ->
                            "Error del servidor: ${response.code()}"
                    }
                }

            } catch (cancelacion: CancellationException) {

                throw cancelacion

            } catch (e: IOException) {

                binding.txtError.text =
                    "Sin conexión a internet. Inténtalo de nuevo."

            } catch (e: Exception) {

                binding.txtError.text =
                    "No se pudo procesar la respuesta del servidor."

            } finally {

                binding.progressLogin.visibility = View.GONE
                binding.btnEntrar.isEnabled = true
                binding.btnRecuperarPassword.isEnabled = true
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
