package com.project.avisensandroid.ui

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import android.app.DatePickerDialog
import android.app.Dialog
import android.net.Uri
import android.widget.ProgressBar
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.graphics.Color
import androidx.core.content.FileProvider
import androidx.activity.result.contract.ActivityResultContracts
import java.io.File
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Handler
import android.os.Looper
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.util.Patterns
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.ArrayAdapter
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.core.os.bundleOf
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.Hu56OfflineQueue
import com.project.avisensandroid.controller.OfflineCache
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.controller.SesionExpirada
import com.project.avisensandroid.databinding.Au02RecuperarContrasenaBinding
import com.project.avisensandroid.databinding.Au03VerificarCodigoBinding
import com.project.avisensandroid.databinding.Au04NuevaContrasenaBinding
import com.project.avisensandroid.databinding.Au05ConfirmacionContrasenaBinding
import com.project.avisensandroid.databinding.Co01ConfiguracionOpBinding
import com.project.avisensandroid.databinding.Co02NotificacionesOpBinding
import com.project.avisensandroid.databinding.Co03PerfilOpBinding
import com.project.avisensandroid.databinding.Co04SeguridadOpBinding
import com.project.avisensandroid.databinding.R01RegistrarGalponBinding
import com.project.avisensandroid.databinding.R03NuevoInsumoBinding
import com.project.avisensandroid.databinding.R04RegistrarEventoMortalidadBinding
import com.project.avisensandroid.databinding.R05RegistrarEventoEnfermoBinding
import com.project.avisensandroid.databinding.R06RegistrarSeguimientoSanitarioBinding
import com.project.avisensandroid.model.EventoSanitarioRequest
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.GranjaResponse
import com.project.avisensandroid.model.InsumoRequest
import com.project.avisensandroid.model.InsumoResponse
import com.project.avisensandroid.model.LoteSelectorResponse
import com.project.avisensandroid.model.TipoAlimentoResponse
import com.project.avisensandroid.model.RegistroMortalidadRequest
import com.project.avisensandroid.model.UserRole
import com.project.avisensandroid.model.UserSession
import com.project.avisensandroid.ui.fragments.AlertasFragment
import com.project.avisensandroid.ui.fragments.AsistenteVozFragment
import com.project.avisensandroid.ui.fragments.BodegaFragment
import com.project.avisensandroid.ui.fragments.BitacoraEnfermoFragment
import com.project.avisensandroid.ui.fragments.BitacoraFragment
import com.project.avisensandroid.ui.fragments.InicioFragment
import com.project.avisensandroid.ui.fragments.GuiaPesoFragment
import com.project.avisensandroid.ui.fragments.PropietarioFragment
import com.project.avisensandroid.ui.fragments.GestionOperariosFragment
import com.project.avisensandroid.ui.fragments.SensoresFragment
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import com.project.avisensandroid.controller.NotificacionesLocales
import android.Manifest
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import java.util.Calendar
import java.util.Locale

class MainActivity : AperturaReanudableActivity() {

    private var monitoreoNotificaciones: Job? = null


    companion object {
        private const val STATE_GRANJA_ID = "state_granja_id"
        private const val STATE_GALPON_ID = "state_galpon_id"
        private const val SELECCION_PREFS = "avisens_seleccion_por_usuario"
    }

    // =========================================================
    // BINDINGS
    // =========================================================

    private lateinit var configuracionBinding: Co01ConfiguracionOpBinding
    private lateinit var perfilBinding: Co03PerfilOpBinding
    private lateinit var notificacionesBinding: Co02NotificacionesOpBinding
    private lateinit var seguridadBinding: Co04SeguridadOpBinding

    private lateinit var recuperarBinding: Au02RecuperarContrasenaBinding
    private lateinit var verificarBinding: Au03VerificarCodigoBinding
    private lateinit var nuevaContrasenaBinding: Au04NuevaContrasenaBinding
    private lateinit var confirmacionBinding: Au05ConfirmacionContrasenaBinding

    // =========================================================
    // COLORES DE SPINNER
    // =========================================================

    private val spinnerTextoSeleccionado get() =
        ColoresAdaptativos.texto(this, "#171D1A")

    private val spinnerTextoDropdown =
        0xFFFFFFFF.toInt()

    private val spinnerFondoDropdown =
        0xFF171D1A.toInt()

    // =========================================================
    // ADAPTADOR DE SPINNER ESTILIZADO
    // =========================================================

    object CausasMortalidad {
        const val OTRA = "Otra causa"
        val opciones = listOf("Golpe de calor", "Estrés por frío", "Enfermedad respiratoria",
            "Enfermedad digestiva", "Deshidratación", "Aplastamiento", "Lesiones físicas",
            "Problemas de alimentación", "Causa desconocida")
    }

    class SpinnerAdapterEstilizado(
        context: android.content.Context,
        items: MutableList<String>
    ) : ArrayAdapter<String>(
        context,
        android.R.layout.simple_spinner_item,
        items
    ) {

        private val colorTextoSeleccionado =
            ColoresAdaptativos.texto(context, "#171D1A")

        private val colorTextoDropdown =
            ColoresAdaptativos.texto(context, "#171D1A")

        private val colorFondoDropdown =
            ColoresAdaptativos.superficie(context, "#FFFFFF")

        init {
            setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
            )
        }

        override fun getView(
            position: Int,
            convertView: View?,
            parent: ViewGroup
        ): View {

            val view = super.getView(
                position,
                convertView,
                parent
            )

            if (view is TextView) {

                view.setTextColor(
                    colorTextoSeleccionado
                )

                view.textSize = 14f

                view.setPadding(
                    8,
                    0,
                    8,
                    0
                )

                view.gravity =
                    android.view.Gravity.CENTER_VERTICAL
            }

            return view
        }

        override fun getDropDownView(
            position: Int,
            convertView: View?,
            parent: ViewGroup
        ): View {

            val view = super.getDropDownView(
                position,
                convertView,
                parent
            )

            if (view is TextView) {

                view.setTextColor(
                    colorTextoDropdown
                )

                view.setBackgroundColor(
                    colorFondoDropdown
                )

                view.textSize = 14f

                view.setPadding(
                    16,
                    14,
                    16,
                    14
                )

                view.gravity =
                    android.view.Gravity.CENTER_VERTICAL
            }

            return view
        }
    }

    // =========================================================
    // CICLO DE VIDA
    // =========================================================

    // =========================================================
    // SESIÓN / ROL ACTUAL
    // =========================================================

    private var rolActual: UserRole? = null

    // Granja actualmente seleccionada por el usuario.
    // Se conserva mientras navega entre las pantallas.
    private var granjaSeleccionadaId: Int? = null

    // Galpón actualmente seleccionado dentro de la granja.
    // Se conserva mientras el usuario navega entre las pantallas.
    private var galponSeleccionadoId: Int? = null

    // Fotografía de mortalidad: captura y envío binario al backend.
    private var fotoMortalidadTemporal: File? = null
    private var fotoMortalidadTomada: Boolean = false
    private var fotoMortalidadVistaPrevia: android.widget.ImageView? = null
    private var fotoMortalidadBotonAdjuntar: View? = null
    private var fotoMortalidadContenedorPrevia: View? = null
    private val capturarFotoMortalidad = registerForActivityResult(ActivityResultContracts.TakePicture()) { exito ->
        fotoMortalidadTomada = exito && fotoMortalidadTemporal?.exists() == true
        val archivo = fotoMortalidadTemporal
        if (fotoMortalidadTomada && archivo != null) {
            fotoMortalidadVistaPrevia?.apply {
                setImageURI(null)
                setImageURI(Uri.fromFile(archivo))
                visibility = View.VISIBLE
            }
            fotoMortalidadBotonAdjuntar?.visibility = View.GONE
            fotoMortalidadContenedorPrevia?.visibility = View.VISIBLE
        } else {
            fotoMortalidadVistaPrevia?.visibility = View.GONE
            fotoMortalidadBotonAdjuntar?.visibility = View.VISIBLE
            fotoMortalidadContenedorPrevia?.visibility = View.GONE
            archivo?.delete()
            fotoMortalidadTemporal = null
        }
    }

    // El indicador es exclusivo de la reconexión, nunca del sondeo cada 15 s.
    private var indicadorReconexion: View? = null
    private val ocultarIndicadorReconexion = Runnable { ocultarCargaReconexion() }

    private fun mostrarCargaReconexion() {
        val raiz = findViewById<ViewGroup>(android.R.id.content) ?: return
        ocultarCargaReconexion()
        // Indicador pequeño en la zona superior, sin bloquear ni cubrir el contenido.
        val densidad = resources.displayMetrics.density
        val tamano = (32 * densidad).toInt()
        val contenedor = FrameLayout(this).apply {
            isClickable = false
            isFocusable = false
            elevation = 8 * densidad
        }
        contenedor.addView(ProgressBar(this).apply {
            isIndeterminate = true
        }, FrameLayout.LayoutParams(tamano, tamano))
        val posicion = FrameLayout.LayoutParams(
            tamano, tamano, android.view.Gravity.TOP or android.view.Gravity.CENTER_HORIZONTAL
        ).apply { topMargin = (72 * densidad).toInt() }
        raiz.addView(contenedor, posicion)
        indicadorReconexion = contenedor
        // Evita dejar el indicador bloqueado si la petición tarda o falla.
        mainHandler.postDelayed(ocultarIndicadorReconexion, 2500L)
    }

    private fun ocultarCargaReconexion() {
        mainHandler.removeCallbacks(ocultarIndicadorReconexion)
        indicadorReconexion?.let { (it.parent as? ViewGroup)?.removeView(it) }
        indicadorReconexion = null
    }

    private val networkManager by lazy { getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager }
    private val mainHandler = Handler(Looper.getMainLooper())
    private var ultimaConexionValidada: Boolean? = null
    private var observandoConexion = false
    private var reconexionPendiente = false
    private val reconectarRunnable = Runnable { actualizarPantallaTrasReconectar(false) }

    // Consulta el apartado visible cada 15 s mientras la app está en primer plano.
    // Así detecta cambios realizados por otras cuentas sin depender de una reconexión.
    private val intervaloActualizacionMs = 15_000L
    private val actualizacionPeriodica = object : Runnable {
        override fun run() {
            if (!observandoConexion) return
            if (com.project.avisensandroid.controller.OfflineCache.hayInternet(this@MainActivity)) {
                actualizarPantallaTrasReconectar(true)
            }
            mainHandler.postDelayed(this, intervaloActualizacionMs)
        }
    }

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) = revisarConexion()
        override fun onLost(network: Network) = revisarConexion()
        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) = revisarConexion()
    }

    private fun revisarConexion() {
        mainHandler.post {
            if (!observandoConexion) return@post
            val red = networkManager.activeNetwork
            val caps = red?.let { networkManager.getNetworkCapabilities(it) }
            val conectada = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true
            val anterior = ultimaConexionValidada
            ultimaConexionValidada = conectada
            if (!conectada) {
                reconexionPendiente = true
                mainHandler.removeCallbacks(reconectarRunnable)
            } else if (anterior == false || reconexionPendiente) {
                reconexionPendiente = false
                Hu56OfflineQueue.programar(applicationContext)
                mainHandler.removeCallbacks(reconectarRunnable)
                mainHandler.postDelayed(reconectarRunnable, 1200L)
            }
        }
    }

    private fun actualizarPantallaTrasReconectar(silenciosa: Boolean) {
        if (!observandoConexion || supportFragmentManager.isStateSaved) return
        if (!com.project.avisensandroid.controller.OfflineCache.hayInternet(this)) return
        // Actualizar el fragmento existente, sin destruirlo ni cambiar de apartado.
        val visible = supportFragmentManager.fragments.lastOrNull { it.isAdded && it.isVisible }
        if (!silenciosa && visible is InicioFragment ||
            !silenciosa && visible is SensoresFragment ||
            !silenciosa && visible is BodegaFragment ||
            !silenciosa && visible is BitacoraFragment ||
            !silenciosa && visible is AlertasFragment) {
            mostrarCargaReconexion()
        }
        when (visible) {
            is InicioFragment -> if (silenciosa) visible.actualizarSilenciosamente() else visible.actualizarAlRecuperarInternet()
            is SensoresFragment -> if (silenciosa) visible.actualizarSilenciosamente() else visible.actualizarAlRecuperarInternet()
            // Bodega ya tiene su propio progressInsumos para la carga inicial.
            // En reconexión se usa únicamente el indicador superior común.
            is BodegaFragment -> visible.actualizarSilenciosamente()
            is com.project.avisensandroid.ui.fragments.BitacoraConsumoFragment -> visible.actualizarSilenciosamente()
            is BitacoraFragment -> if (silenciosa) visible.actualizarSilenciosamente() else visible.actualizarAlRecuperarInternet()
            is GestionOperariosFragment -> visible.actualizarSilenciosamente()
            is AlertasFragment -> if (silenciosa) visible.actualizarSilenciosamente() else visible.actualizarAlRecuperarInternet()
        }
    }

    private fun preferenciasSeleccion() = getSharedPreferences(SELECCION_PREFS, MODE_PRIVATE)
    private fun claveSeleccion(tipo: String): String = "${UserSession.userId(this) ?: 0}_$tipo"

    fun obtenerRolActual(): UserRole? = rolActual

    fun obtenerGranjaSeleccionadaId(): Int? = granjaSeleccionadaId

    fun seleccionarGranja(granjaId: Int) {
        granjaSeleccionadaId = granjaId
        preferenciasSeleccion().edit().putInt(claveSeleccion("granja"), granjaId).apply()
    }

    fun obtenerGalponSeleccionadoId(): Int? = galponSeleccionadoId

    fun seleccionarGalpon(galponId: Int) {
        galponSeleccionadoId = galponId
        preferenciasSeleccion().edit().putInt(claveSeleccion("galpon"), galponId).apply()
    }

    fun limpiarGalponSeleccionado() {
        galponSeleccionadoId = null
        preferenciasSeleccion().edit().remove(claveSeleccion("galpon")).apply()
    }

    fun limpiarGranjaSeleccionada() {
        granjaSeleccionadaId = null
        galponSeleccionadoId = null
        preferenciasSeleccion().edit().remove(claveSeleccion("granja"))
            .remove(claveSeleccion("galpon")).apply()
    }

    fun obtenerNombreUsuario(): String =
        UserSession.name(this)

    fun esOperario(): Boolean =
        rolActual == UserRole.OPERARIO

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {
        super.onCreate(if (savedInstanceState?.getBoolean("configuracion_abierta") == true) null else savedInstanceState)

        granjaSeleccionadaId = savedInstanceState?.getInt(STATE_GRANJA_ID)?.takeIf { it != 0 }
            ?: preferenciasSeleccion().getInt(claveSeleccion("granja"), 0).takeIf { it > 0 }
        galponSeleccionadoId = savedInstanceState?.getInt(STATE_GALPON_ID)?.takeIf { it != 0 }
            ?: preferenciasSeleccion().getInt(claveSeleccion("galpon"), 0).takeIf { it > 0 }

        RetrofitClient.inicializar(applicationContext)
        Hu56OfflineQueue.programar(applicationContext)

        rolActual = UserSession.role(this)

        if (!UserSession.isLoggedIn(this) || rolActual == null) {
            irALogin()
            return
        }

        if (savedInstanceState?.getBoolean("configuracion_abierta") == true) {
            mostrarConfiguracion()
            return
        }

        when (rolActual) {
            UserRole.OPERARIO -> {
                setContentView(R.layout.activity_main)
                if (savedInstanceState == null) {
                    mostrarFragment(InicioFragment())
                }
            }

            UserRole.PROPIETARIO -> {
                setContentView(R.layout.activity_propietario)
                if (savedInstanceState == null) {
                    mostrarPanelPropietario()
                }
            }

            UserRole.ADMINISTRADOR -> {
                mostrarPantallaRolPendiente()
            }

            null -> irALogin()
        }
    }

    // Una sola redirección aunque varias peticiones reciban 401 a la vez:
    // SesionExpirada avisa una vez e irALogin ignora llamadas repetidas.
    private val alExpirarSesion: () -> Unit = {
        irALogin(sesionExpirada = true)
    }

    override fun onStart() {
        super.onStart()

        // Si la sesión se perdió con la app en segundo plano, nadie recibió
        // el aviso: se comprueba al volver.
        if (rolActual != null && !UserSession.isLoggedIn(this)) {
            irALogin(sesionExpirada = true)
            return
        }

        SesionExpirada.registrar(alExpirarSesion)
        if (UserSession.isLoggedIn(this)) {
            if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 712)
            }
            NotificacionesLocales.programar(applicationContext)
            monitoreoNotificaciones?.cancel()
            monitoreoNotificaciones = lifecycleScope.launch {
                while (isActive) {
                    try { NotificacionesLocales.revisar(applicationContext) }
                    catch (e: kotlinx.coroutines.CancellationException) { throw e }
                    catch (_: Exception) { /* Sin red: reintentar en la siguiente vuelta. */ }
                    delay(15_000L)
                }
            }
        }
        ultimaConexionValidada = com.project.avisensandroid.controller.OfflineCache.hayInternet(this)
        if (!ultimaConexionValidada!!) reconexionPendiente = true
        try {
            networkManager.registerDefaultNetworkCallback(networkCallback)
            observandoConexion = true
        } catch (_: Exception) {
            observandoConexion = false
        }
        mainHandler.removeCallbacks(actualizacionPeriodica)
        if (observandoConexion) {
            mainHandler.postDelayed(actualizacionPeriodica, intervaloActualizacionMs)
        }
    }

    override fun onResume() {
        super.onResume()
        if (observandoConexion) revisarConexion()
    }

    override fun onPostResume() {
        super.onPostResume()
        abrirAvisoPendiente()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (!supportFragmentManager.isStateSaved) abrirAvisoPendiente()
    }

    private fun abrirAvisoPendiente() {
        val aviso = intent ?: return
        val id = aviso.getIntExtra(NotificacionesLocales.EXTRA_NOTIFICACION, -1)
        if (id <= 0 || supportFragmentManager.isStateSaved) return
        val usuario = aviso.getIntExtra(NotificacionesLocales.EXTRA_USUARIO, -1)
        val alerta = aviso.getBooleanExtra(NotificacionesLocales.EXTRA_ALERTA, false)
        aviso.removeExtra(NotificacionesLocales.EXTRA_NOTIFICACION)
        if (!UserSession.isLoggedIn(this) || UserSession.userId(this) != usuario) return
        if (rolActual != UserRole.PROPIETARIO && rolActual != UserRole.OPERARIO) return
        if (findViewById<SlidingBottomNavigationView>(R.id.bottomNav) == null) volverAlInicio()
        if (alerta) {
            mostrarFragment(AlertasFragment())
        } else {
            volverAlInicio()
        }
        lifecycleScope.launch {
            try {
                if (UserSession.userId(this@MainActivity) == usuario) {
                    RetrofitClient.api.marcarNotificacionLeida(id)
                }
            } catch (e: kotlinx.coroutines.CancellationException) { throw e }
            catch (_: Exception) { }
        }
    }

    override fun onStop() {
        monitoreoNotificaciones?.cancel()
        monitoreoNotificaciones = null
        observandoConexion = false
        mainHandler.removeCallbacks(reconectarRunnable)
        mainHandler.removeCallbacks(actualizacionPeriodica)
        ocultarCargaReconexion()
        try { networkManager.unregisterNetworkCallback(networkCallback) } catch (_: Exception) { }
        SesionExpirada.quitar(alExpirarSesion)
        super.onStop()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean("configuracion_abierta", ::configuracionBinding.isInitialized && configuracionBinding.root.isAttachedToWindow)
        outState.putInt(STATE_GRANJA_ID, granjaSeleccionadaId ?: 0)
        outState.putInt(STATE_GALPON_ID, galponSeleccionadoId ?: 0)
    }

    private fun mostrarPantallaRolPendiente() {

        setContentView(R.layout.activity_rol_pendiente)

        val txtRol = findViewById<TextView>(R.id.txtRolActual)
        val txtMensaje = findViewById<TextView>(R.id.txtMensajeRol)
        val btnCerrarSesion = findViewById<View>(R.id.btnCerrarSesionRol)

        txtRol.text = rolActual?.displayName ?: "Usuario"
        txtMensaje.text =
            "La interfaz para ${rolActual?.displayName ?: "este rol"} todavía está en desarrollo.\n\nLa sesión fue autenticada correctamente y no se mostrará la interfaz de Operario."

        btnCerrarSesion.setOnClickListener {
            cerrarSesion()
        }
    }

    fun mostrarPanelPropietario() {
        if (rolActual != UserRole.PROPIETARIO) return

        supportFragmentManager
            .beginTransaction()
            .replace(R.id.propietarioFragmentContainer, InicioFragment())
            .commit()
    }

    fun mostrarGestionOperarios(animar: Boolean = false) {
        if (rolActual != UserRole.PROPIETARIO) return

        supportFragmentManager
            .beginTransaction()
            .replace(R.id.propietarioFragmentContainer, GestionOperariosFragment())
            .addToBackStack(null)
            .commit()
    }

    fun cerrarSesionDesdeRol() {
        cerrarSesion()
    }

    /**
     * Cierra la sesión local de inmediato y pide al backend revocarla
     * (POST /v1/auth/logout). La revocación remota no bloquea ni puede
     * impedir el cierre local si no hay red.
     */
    private fun cerrarSesion() {
        val refreshToken = UserSession.refreshToken(this)
        preferenciasSeleccion().edit().remove(claveSeleccion("granja"))
            .remove(claveSeleccion("galpon")).apply()
        UserSession.clear(this)
        NotificacionesLocales.cancelar(applicationContext)
        if (!refreshToken.isNullOrBlank()) {
            RetrofitClient.cerrarSesionRemota(refreshToken)
        }
        irALogin()
    }

    // =========================================================
    // NAVEGACIÓN PRINCIPAL
    // =========================================================

    fun mostrarFragment(
        fragment: Fragment,
        animar: Boolean = false
    ) {
        if (rolActual != UserRole.OPERARIO && rolActual != UserRole.PROPIETARIO) return

        supportFragmentManager
            .beginTransaction()
            .replace(
                if (rolActual == UserRole.PROPIETARIO) R.id.propietarioFragmentContainer
                else R.id.mainFragmentContainer,
                fragment
            )
            .commit()
    }

    private fun actualizarTrasRegistro(destino: Fragment) {
        val contenedor = if (rolActual == UserRole.PROPIETARIO)
            R.id.propietarioFragmentContainer else R.id.mainFragmentContainer
        val actual = supportFragmentManager.findFragmentById(contenedor)
        if (actual is BodegaFragment && destino is BodegaFragment && actual.view != null) {
            actual.actualizarSilenciosamente()
        } else if (actual is BitacoraFragment && destino is BitacoraFragment && actual.view != null) {
            actual.actualizarSilenciosamente()
        } else mostrarFragment(destino)
    }

    fun mostrarAsistenteVoz() {
        mostrarFragment(AsistenteVozFragment())
    }

    /** Abre la Guía de peso y permite regresar a Inicio con el botón Atrás. */
    fun mostrarGuiaPeso() {
        if (rolActual != UserRole.OPERARIO && rolActual != UserRole.PROPIETARIO) return
        val contenedor = if (rolActual == UserRole.PROPIETARIO) {
            R.id.propietarioFragmentContainer
        } else {
            R.id.mainFragmentContainer
        }
        supportFragmentManager.beginTransaction()
            .replace(contenedor, GuiaPesoFragment())
            .addToBackStack("guia_peso")
            .commit()
    }

    fun navegarDesdeBottomNav(itemId: Int) {
        val barra = findViewById<SlidingBottomNavigationView>(R.id.bottomNav)
        val menu = barra.menu
        val origen = (0 until menu.size()).firstOrNull {
            menu.getItem(it).itemId == barra.selectedItemId
        } ?: return
        val destino = (0 until menu.size()).firstOrNull {
            menu.getItem(it).itemId == itemId
        } ?: return
        if (origen == destino) return

        val fragment = when (itemId) {
            R.id.nav_inicio -> InicioFragment()
            R.id.nav_sensores -> SensoresFragment()
            R.id.nav_bodega -> BodegaFragment()
            R.id.nav_alertas -> AlertasFragment()
            R.id.nav_bitacora -> BitacoraFragment()
            R.id.nav_usuarios -> GestionOperariosFragment()
            else -> return
        }
        val contenedor = when (rolActual) {
            UserRole.PROPIETARIO -> R.id.propietarioFragmentContainer
            UserRole.OPERARIO -> R.id.mainFragmentContainer
            else -> return
        }
        val transaccion = supportFragmentManager.beginTransaction()
            .setCustomAnimations(
                if (destino > origen) R.anim.slide_entrada_derecha else R.anim.slide_entrada_izquierda,
                if (destino > origen) R.anim.slide_salida_izquierda else R.anim.slide_salida_derecha
            )
            .replace(contenedor, fragment)
        // Mantener el comportamiento anterior de Atrás en Operarios.
        if (itemId == R.id.nav_usuarios) transaccion.addToBackStack(null)
        transaccion.commit()
    }

    // =========================================================
    // API - GRANJAS
    // =========================================================

    suspend fun obtenerGranjas(soloCache: Boolean = false) =
        (if (soloCache) RetrofitClient.apiCache else RetrofitClient.api).listarGranjas(
            page = 1,
            limit = 100
        )

    // =========================================================
    // API - GALPONES
    // =========================================================

    suspend fun obtenerGalpones(soloCache: Boolean = false) =
        (if (soloCache) RetrofitClient.apiCache else RetrofitClient.api).listarGalpones(
            page = 1,
            limit = 100
        )

    // =========================================================
    // OBTENER GALPONES DE UNA GRANJA
    // =========================================================

    suspend fun obtenerGalponesDeGranja(
        granjaId: Int
    ): List<GalponResponse> {

        val response =
            RetrofitClient.api.listarGalpones(
                page = 1,
                limit = 100
            )

        if (!response.isSuccessful) {

            throw IllegalStateException(
                "No se pudieron cargar los galpones. Código: ${response.code()}"
            )
        }

        return response.body()
            ?.data
            ?.filter {
                it.granja.id == granjaId
            }
            ?: emptyList()
    }

    /**
     * Devuelve los IDs de los lotes pertenecientes a la granja actualmente
     * seleccionada. Se usa para filtrar las bitácoras aunque el endpoint
     * del registro no incluya directamente el id de la granja.
     */
    suspend fun obtenerIdsLotesDeGranjaSeleccionada(): Set<Int> {
        val granjaId = granjaSeleccionadaId ?: return emptySet()
        val todosLosLotes = mutableListOf<LoteSelectorResponse>()
        var pagina = 1
        var totalPaginas = 1

        do {
            val response = RetrofitClient.api.listarLotes(
                page = pagina,
                limit = 100
            )

            if (!response.isSuccessful) {
                throw IllegalStateException(
                    "No se pudieron cargar los lotes. Código: ${response.code()}"
                )
            }

            val body = response.body()
                ?: throw IllegalStateException("La API no devolvió información de lotes")

            todosLosLotes += body.data
            totalPaginas = body.meta.totalPages.coerceAtLeast(pagina)
            pagina++
        } while (pagina <= totalPaginas)

        return todosLosLotes
            .filter { it.galpon?.granja?.id == granjaId }
            .map { it.id }
            .toSet()
    }

    /**
     * Devuelve los IDs de los lotes pertenecientes al galpón actualmente
     * seleccionado. Se usa para que las bitácoras muestren únicamente los
     * registros del galpón activo.
     */
    suspend fun obtenerIdsLotesDeGalponSeleccionado(soloCache: Boolean = false): Set<Int> {
        val galponId = galponSeleccionadoId ?: return emptySet()
        val todosLosLotes = mutableListOf<LoteSelectorResponse>()
        var pagina = 1
        var totalPaginas = 1

        do {
            val response = (if (soloCache) RetrofitClient.apiCache else RetrofitClient.api).listarLotes(
                page = pagina,
                limit = 100
            )

            if (!response.isSuccessful) {
                throw IllegalStateException(
                    "No se pudieron cargar los lotes. Código: ${response.code()}"
                )
            }

            val body = response.body()
                ?: throw IllegalStateException("La API no devolvió información de lotes")

            todosLosLotes += body.data
            totalPaginas = body.meta.totalPages.coerceAtLeast(pagina)
            pagina++
        } while (pagina <= totalPaginas)

        return todosLosLotes
            .filter { it.galpon?.id == galponId }
            .map { it.id }
            .toSet()
    }

    // =========================================================
    // VOLVER AL INICIO
    // =========================================================

    private fun volverAlInicio() {

        if (rolActual == UserRole.PROPIETARIO) {
            setContentView(R.layout.activity_propietario)
        } else {
            setContentView(R.layout.activity_main)
        }

        mostrarFragment(InicioFragment())
    }

    // =========================================================
    // IR AL LOGIN
    // =========================================================

    private fun irALogin(sesionExpirada: Boolean = false) {

        if (isFinishing) return
        NotificacionesLocales.cancelar(applicationContext)

        // Limpia la tarea para que Atrás no regrese a pantallas sin sesión.
        startActivity(
            Intent(
                this,
                LoginActivity::class.java
            ).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                putExtra(SesionExpirada.EXTRA_SESION_EXPIRADA, sesionExpirada)
            }
        )

        finish()
    }

    // =========================================================
    // RECUPERACIÓN DE CONTRASEÑA
    // =========================================================

    fun mostrarRecuperarContrasena() {

        recuperarBinding =
            Au02RecuperarContrasenaBinding.inflate(
                layoutInflater
            )

        setContentView(
            recuperarBinding.root
        )

        recuperarBinding
            .btnVolver
            .setOnClickListener {

                irALogin()
            }

        recuperarBinding
            .btnEnviarCorreo
            .setOnClickListener {

                val correo =
                    recuperarBinding
                        .edtCorreo
                        .text
                        .toString()
                        .trim()

                when {

                    correo.isEmpty() -> {

                        recuperarBinding
                            .edtCorreo
                            .error =
                            "Ingresa tu correo electrónico"
                    }

                    !Patterns.EMAIL_ADDRESS
                        .matcher(correo)
                        .matches() -> {

                        recuperarBinding
                            .edtCorreo
                            .error =
                            "Ingresa un correo válido"
                    }

                    else -> {

                        mostrarVerificarCodigo()
                    }
                }
            }
    }

    private fun mostrarVerificarCodigo() {

        verificarBinding =
            Au03VerificarCodigoBinding.inflate(
                layoutInflater
            )

        setContentView(
            verificarBinding.root
        )

        verificarBinding
            .btnVerificarCodigo
            .setOnClickListener {

                val codigo =
                    verificarBinding
                        .edtCodigo
                        .text
                        .toString()
                        .trim()

                when {

                    codigo.isEmpty() -> {

                        verificarBinding
                            .edtCodigo
                            .error =
                            "Ingresa el código"
                    }

                    codigo.length != 6 ||
                            codigo.any {
                                !it.isDigit()
                            } -> {

                        verificarBinding
                            .edtCodigo
                            .error =
                            "El código debe tener 6 dígitos"
                    }

                    else -> {

                        mostrarNuevaContrasena()
                    }
                }
            }

        verificarBinding
            .txtReenviarCodigo
            .setOnClickListener {

                Toast.makeText(
                    this,
                    "Reenvío de código pendiente de conectar con la API",
                    Toast.LENGTH_SHORT
                ).show()
            }
    }

    private fun mostrarNuevaContrasena() {

        nuevaContrasenaBinding =
            Au04NuevaContrasenaBinding.inflate(
                layoutInflater
            )

        setContentView(
            nuevaContrasenaBinding.root
        )

        nuevaContrasenaBinding
            .btnCambiarContrasena
            .setOnClickListener {

                val nueva =
                    nuevaContrasenaBinding
                        .edtNuevaContrasena
                        .text
                        .toString()

                val confirmar =
                    nuevaContrasenaBinding
                        .edtConfirmarContrasena
                        .text
                        .toString()

                when {

                    nueva.isEmpty() -> {

                        nuevaContrasenaBinding
                            .edtNuevaContrasena
                            .error =
                            "Ingresa una contraseña"
                    }

                    nueva.length < 8 -> {

                        nuevaContrasenaBinding
                            .edtNuevaContrasena
                            .error =
                            "Mínimo 8 caracteres"
                    }

                    confirmar.isEmpty() -> {

                        nuevaContrasenaBinding
                            .edtConfirmarContrasena
                            .error =
                            "Confirma tu contraseña"
                    }

                    nueva != confirmar -> {

                        nuevaContrasenaBinding
                            .edtConfirmarContrasena
                            .error =
                            "Las contraseñas no coinciden"
                    }

                    else -> {

                        mostrarConfirmacionContrasena()
                    }
                }
            }
    }

    private fun mostrarConfirmacionContrasena() {

        confirmacionBinding =
            Au05ConfirmacionContrasenaBinding.inflate(
                layoutInflater
            )

        setContentView(
            confirmacionBinding.root
        )

        confirmacionBinding
            .btnVolverLogin
            .setOnClickListener {

                irALogin()
            }
    }

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================

    fun mostrarConfiguracion() {

        if (rolActual != UserRole.OPERARIO && rolActual != UserRole.PROPIETARIO) return

        // Configuración reemplaza el layout completo: retirar primero los
        // fragments que dependen de los contenedores de navegación.
        val manager = supportFragmentManager
        manager.executePendingTransactions()
        if (manager.backStackEntryCount > 0) {
            manager.popBackStackImmediate(null, androidx.fragment.app.FragmentManager.POP_BACK_STACK_INCLUSIVE)
        }
        if (manager.fragments.isNotEmpty()) {
            val transaction = manager.beginTransaction()
            manager.fragments.forEach { transaction.remove(it) }
            transaction.commitNow()
        }

        configuracionBinding =
            Co01ConfiguracionOpBinding.inflate(
                layoutInflater
            )

        setContentView(
            configuracionBinding.root
        )

        configuracionBinding.switchModoOscuro.isChecked = AvisensApplication.oscuro(this)
        configuracionBinding.switchModoOscuro.setOnCheckedChangeListener { _, checked ->
            AvisensApplication.cambiar(this, checked)
        }

        configuracionBinding
            .btnConfiguracionPerfil
            .setOnClickListener {

                mostrarPerfil()
            }

        configuracionBinding
            .btnConfiguracionNotificaciones
            .setOnClickListener {

                mostrarNotificaciones()
            }

        configuracionBinding
            .btnConfiguracionSeguridad
            .setOnClickListener {

                mostrarSeguridad()
            }

        configuracionBinding
            .btnCerrarConfiguracion
            .setOnClickListener {

                volverAlInicio()
            }

        configuracionBinding
            .btnCerrarSesion
            .setOnClickListener {

                cerrarSesion()
            }
    }

    // =========================================================
    // SEGURIDAD
    // =========================================================
    //
    // Las pantallas todavía no existen.
    // Por ahora solamente se muestran mensajes.
    //
    // =========================================================

    private fun mostrarSeguridad() {

        seguridadBinding =
            Co04SeguridadOpBinding.inflate(
                layoutInflater
            )

        setContentView(
            seguridadBinding.root
        )

        // -----------------------------------------------------
        // VOLVER
        // -----------------------------------------------------

        seguridadBinding
            .btnVolver
            .setOnClickListener {

                mostrarConfiguracion()
            }

        // -----------------------------------------------------
        // VERIFICACIÓN EN DOS PASOS
        // -----------------------------------------------------

        seguridadBinding
            .btnVerificacionDosPasos
            .setOnClickListener {

                Toast.makeText(
                    this,
                    "La verificación en dos pasos estará disponible próximamente",
                    Toast.LENGTH_SHORT
                ).show()
            }

        // -----------------------------------------------------
        // CAMBIAR CONTRASEÑA
        // -----------------------------------------------------

        seguridadBinding
            .btnCambiarContrasena
            .setOnClickListener {

                Toast.makeText(
                    this,
                    "La opción de cambiar contraseña estará disponible próximamente",
                    Toast.LENGTH_SHORT
                ).show()
            }

        // -----------------------------------------------------
        // SESIONES ACTIVAS
        // -----------------------------------------------------

        seguridadBinding
            .btnSesionesActivas
            .setOnClickListener {

                Toast.makeText(
                    this,
                    "La gestión de sesiones estará disponible próximamente",
                    Toast.LENGTH_SHORT
                ).show()
            }

        // -----------------------------------------------------
        // CERRAR SESIONES
        // -----------------------------------------------------

        seguridadBinding
            .btnCerrarSesiones
            .setOnClickListener {

                Toast.makeText(
                    this,
                    "La gestión de sesiones estará disponible próximamente",
                    Toast.LENGTH_SHORT
                ).show()
            }
    }

    // =========================================================
    // NOTIFICACIONES
    // =========================================================

    fun abrirCentroNotificaciones() {
        CentroNotificaciones(this).mostrar()
    }

    private fun mostrarNotificaciones() {

        notificacionesBinding =
            Co02NotificacionesOpBinding.inflate(
                layoutInflater
            )

        setContentView(
            notificacionesBinding.root
        )

        notificacionesBinding
            .btnCerrarNotificaciones
            .setOnClickListener {

                mostrarConfiguracion()
            }
    }

    // =========================================================
    // PERFIL
    // =========================================================

    private var fotoInicio: android.graphics.Bitmap? = null
    private var fotoInicioUsuario: Int? = null
    private var versionFotoInicio = 0

    fun actualizarAvatarInicio(contenedor: android.widget.FrameLayout) {
        val usuario = UserSession.userId(this) ?: return
        val icono = contenedor.getChildAt(0) as? android.widget.ImageView ?: return
        if (fotoInicioUsuario != usuario) {
            fotoInicioUsuario = usuario
            fotoInicio = null
            versionFotoInicio++
        }
        fun pintar() {
            val foto = fotoInicio
            val medida = if (foto == null) (22 * resources.displayMetrics.density).toInt() else -1
            icono.layoutParams = android.widget.FrameLayout.LayoutParams(medida, medida, android.view.Gravity.CENTER)
            icono.scaleType = android.widget.ImageView.ScaleType.CENTER_CROP
            contenedor.clipToOutline = true
            if (foto == null) icono.setImageResource(R.drawable.ic_person) else icono.setImageBitmap(foto)
        }
        pintar()
        val version = versionFotoInicio
        lifecycleScope.launch {
            try {
                for (api in listOf(RetrofitClient.apiCache, RetrofitClient.api)) {
                    val r = try { api.consultarFotoPerfil() } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (_: Exception) { continue }
                    val imagen = if (r.isSuccessful) kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                        r.body()?.use { android.graphics.BitmapFactory.decodeStream(it.byteStream()) }
                    } else {
                        r.errorBody()?.close()
                        if (r.code() != 404) return@launch
                        null
                    }
                    if (version != versionFotoInicio || UserSession.userId(this@MainActivity) != usuario) return@launch
                    fotoInicio = imagen
                    if (contenedor.isAttachedToWindow) pintar()
                }
            } catch (e: kotlinx.coroutines.CancellationException) { throw e }
            catch (_: Exception) { }
        }
    }

    private var perfilFotoOcupada = false
    private val elegirFotoPerfil = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null && ::perfilBinding.isInitialized && perfilBinding.root.isAttachedToWindow) {
            val b = perfilBinding
            operarFotoPerfil(b) {
                val bytes = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                    contentResolver.openInputStream(uri)?.use { input ->
                        val salida = java.io.ByteArrayOutputStream()
                        val buffer = ByteArray(8192)
                        while (true) {
                            val n = input.read(buffer)
                            if (n < 0) break
                            require(salida.size() + n <= 3 * 1024 * 1024) { "La foto supera 3 MB" }
                            salida.write(buffer, 0, n)
                        }
                        salida.toByteArray()
                    } ?: error("No se pudo abrir la foto")
                }
                val tipo = contentResolver.getType(uri)
                require(tipo in listOf("image/jpeg", "image/png", "image/webp")) { "Selecciona JPG, PNG o WebP" }
                val respuesta = RetrofitClient.api.subirFotoPerfil(bytes.toRequestBody(tipo!!.toMediaType()))
                check(respuesta.isSuccessful) { "No se pudo subir la foto (${respuesta.code()})" }
                cargarFotoPerfil(b)
            }
        }
    }

    private fun operarFotoPerfil(b: Co03PerfilOpBinding, accion: suspend () -> Unit) {
        if (perfilFotoOcupada) return
        if (!OfflineCache.hayInternet(this)) {
            Toast.makeText(this, "Necesitas conexión para modificar la foto", Toast.LENGTH_SHORT).show()
            return
        }
        perfilFotoOcupada = true
        lifecycleScope.launch {
            try { accion() }
            catch (e: kotlinx.coroutines.CancellationException) { throw e }
            catch (e: Exception) { Toast.makeText(this@MainActivity, e.message ?: "No se pudo actualizar la foto", Toast.LENGTH_LONG).show() }
            finally { perfilFotoOcupada = false }
        }
    }

    private suspend fun cargarFotoPerfil(b: Co03PerfilOpBinding, soloCache: Boolean = false) {
        val respuesta = (if (soloCache) RetrofitClient.apiCache else RetrofitClient.api).consultarFotoPerfil()
        if (!b.root.isAttachedToWindow) { respuesta.body()?.close(); respuesta.errorBody()?.close(); return }
        if (respuesta.code() == 404) {
            fotoInicio = null
            fotoInicioUsuario = UserSession.userId(this)
            versionFotoInicio++
            respuesta.errorBody()?.close()
            b.imgFotoPerfil.visibility = View.GONE
            b.txtInicialPerfil.visibility = View.VISIBLE

            return
        }
        check(respuesta.isSuccessful) { "No se pudo consultar la foto" }
        val imagen = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            respuesta.body()?.use { android.graphics.BitmapFactory.decodeStream(it.byteStream()) }
        }
        if (imagen != null && b.root.isAttachedToWindow) {
            fotoInicio = imagen
            fotoInicioUsuario = UserSession.userId(this)
            versionFotoInicio++
            b.imgFotoPerfil.setImageBitmap(imagen)
            b.imgFotoPerfil.visibility = View.VISIBLE
            b.txtInicialPerfil.visibility = View.GONE

        }
    }

    private fun inicialesPerfil(nombre: String): String = nombre.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1).uppercase() }.ifBlank { "U" }

    private fun mostrarPerfil() {
        val b = Co03PerfilOpBinding.inflate(layoutInflater)
        perfilBinding = b
        setContentView(b.root)
        val nombre = UserSession.name(this)
        b.txtNombrePerfil.text = nombre
        b.txtInicialPerfil.text = inicialesPerfil(nombre)
        b.edtCorreoPerfil.setText(UserSession.email(this))
        b.edtTelefonoPerfil.setText("No disponible")
        b.btnCerrarPerfil.setOnClickListener { mostrarConfiguracion() }
        b.btnCambiarFotoPerfil.setOnClickListener {
            if (perfilFotoOcupada) return@setOnClickListener
            val tieneFoto = b.imgFotoPerfil.visibility == View.VISIBLE
            val opciones = if (tieneFoto) arrayOf("Ver foto", "Cambiar foto", "Eliminar foto") else arrayOf("Elegir foto")
            androidx.appcompat.app.AlertDialog.Builder(this).setItems(opciones) { _, indice ->
                when (opciones[indice]) {
                    "Ver foto" -> {
                        val imagen = android.widget.ImageView(this).apply {
                            setImageDrawable(b.imgFotoPerfil.drawable)
                            adjustViewBounds = true
                            scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
                        }
                        androidx.appcompat.app.AlertDialog.Builder(this).setView(imagen).setPositiveButton("Cerrar", null).show()
                    }
                    "Eliminar foto" -> androidx.appcompat.app.AlertDialog.Builder(this)
                        .setMessage("¿Eliminar tu foto de perfil?")
                        .setNegativeButton("Cancelar", null)
                        .setPositiveButton("Eliminar") { _, _ ->
                            operarFotoPerfil(b) {
                                val r = RetrofitClient.api.eliminarFotoPerfil()
                                check(r.isSuccessful) { "No se pudo eliminar la foto" }
                                fotoInicio = null
                                fotoInicioUsuario = UserSession.userId(this@MainActivity)
                                versionFotoInicio++
                                b.imgFotoPerfil.visibility = View.GONE
                                b.txtInicialPerfil.visibility = View.VISIBLE
                            }
                        }.show()
                    else -> elegirFotoPerfil.launch("image/*")
                }
            }.show()
        }
        lifecycleScope.launch {
            val usuario = UserSession.userId(this@MainActivity)
            for (soloCache in listOf(true, false)) {
                if (!b.root.isAttachedToWindow || usuario != UserSession.userId(this@MainActivity)) break
                if (!soloCache && !OfflineCache.hayInternet(this@MainActivity)) break
                try {
                    if (!perfilFotoOcupada) {
                        try { cargarFotoPerfil(b, soloCache) }
                        catch (e: kotlinx.coroutines.CancellationException) { throw e }
                        catch (_: Exception) { }
                    }
                    val r = (if (soloCache) RetrofitClient.apiCache else RetrofitClient.api).consultarPerfil()
                    val datos = r.body() ?: continue
                    if (!b.root.isAttachedToWindow || usuario != UserSession.userId(this@MainActivity)) break
                    fun dato(clave: String) = datos.get(clave)?.takeUnless { it.isJsonNull }?.asString.orEmpty()
                    b.txtNombrePerfil.text = dato("nombre_completo")
                    b.txtInicialPerfil.text = inicialesPerfil(dato("nombre_completo"))
                    b.edtCorreoPerfil.setText(dato("email").ifBlank { "No registrado" })
                    b.edtTelefonoPerfil.setText(dato("telefono").ifBlank { "No registrado" })
                    b.txtDetallePerfil.text = dato("rol").lowercase().replaceFirstChar { it.uppercase() }
                    b.txtUsuarioPerfil.text = dato("username").ifBlank { "No registrado" }
                    b.txtOrganizacionPerfil.text = datos.get("organizacion")?.takeIf { it.isJsonObject }?.asJsonObject?.get("nombre")?.takeUnless { it.isJsonNull }?.asString ?: "No registrada"

                } catch (e: kotlinx.coroutines.CancellationException) { throw e }
                catch (_: Exception) { }
            }
        }
    }

    // =========================================================
    // DIALOG - GESTIÓN DE GALPÓN
    // =========================================================

    fun mostrarDialogGestionGalpon() {

        val dialog =
            Dialog(this)

        val binding =
            R01RegistrarGalponBinding.inflate(
                layoutInflater
            )

        dialog.setContentView(
            binding.root
        )

        dialog.window
            ?.setBackgroundDrawableResource(
                android.R.color.transparent
            )

        dialog.show()

        dialog.window?.setLayout(
            (
                    resources.displayMetrics.widthPixels *
                            0.90f
                    ).toInt(),
            WindowManager.LayoutParams.WRAP_CONTENT
        )

        configurarSpinnerRecursos(
            binding
        )

        binding
            .btnCancelarGalpon
            .setOnClickListener {

                dialog.dismiss()
            }

        binding
            .btnCrearLote
            .setOnClickListener {

                val nombre =
                    binding
                        .edtNombreGalpon
                        .text
                        .toString()
                        .trim()

                val cantidad =
                    binding
                        .edtCantidadPollos
                        .text
                        .toString()
                        .trim()

                var primerError: View? = null
                if (nombre.isBlank()) {
                    binding.edtNombreGalpon.error = "Ingresa el nombre del galpón"
                    primerError = primerError ?: binding.edtNombreGalpon
                }
                if ((cantidad.toIntOrNull() ?: 0) <= 0) {
                    binding.edtCantidadPollos.error = "Ingresa una cantidad mayor que cero"
                    primerError = primerError ?: binding.edtCantidadPollos
                }
                if (primerError != null) {
                    primerError.requestFocus()
                    return@setOnClickListener
                }

                Toast.makeText(
                    this,
                    "Datos del galpón validados",
                    Toast.LENGTH_SHORT
                ).show()

                dialog.dismiss()
            }
    }

    private fun configurarSpinnerRecursos(
        binding: R01RegistrarGalponBinding
    ) {

        val marcas =
            SpinnerAdapterEstilizado(
                this,
                resources
                    .getStringArray(
                        R.array.marcas_alimento
                    )
                    .toMutableList()
            )

        binding
            .spinnerMarcaAlimento
            .adapter = marcas

        val lineas =
            SpinnerAdapterEstilizado(
                this,
                resources
                    .getStringArray(
                        R.array.lineas_alimento
                    )
                    .toMutableList()
            )

        binding
            .spinnerLineas
            .adapter = lineas
    }

    // =========================================================
    // DIALOG - NUEVO INSUMO (SOLO PROPIETARIO)
    // =========================================================

    fun mostrarDialogNuevoInsumo() {

        if (rolActual != UserRole.PROPIETARIO) {
            Toast.makeText(
                this,
                "Solo el Propietario puede crear nuevos insumos",
                Toast.LENGTH_SHORT
            ).show()
            return
        }

        val dialog = Dialog(this)
        val binding = R03NuevoInsumoBinding.inflate(layoutInflater)

        dialog.setContentView(binding.root)
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
        dialog.show()

        dialog.window?.setLayout(
            (resources.displayMetrics.widthPixels * 0.90f).toInt(),
            WindowManager.LayoutParams.WRAP_CONTENT
        )

        val tiposAlimento = mutableListOf<TipoAlimentoResponse>()
        val nombresTipos = mutableListOf("Cargando tipos de alimento...")

        val adapterTipos = SpinnerAdapterEstilizado(
            this,
            nombresTipos
        )
        binding.spinnerTipoAlimento.adapter = adapterTipos

        val unidadesMedida = mutableListOf(
            "Seleccionar unidad",
            "Kg",
            "Gramos",
            "Bultos",
            "Toneladas"
        )

        val adapterUnidades = SpinnerAdapterEstilizado(
            this,
            unidadesMedida
        )
        binding.spinnerUnidadInsumo.adapter = adapterUnidades
        fun actualizarCamposUnidad(esBultos: Boolean) {
            binding.txtCantidadInsumo.text = if (esBultos)
                "Cantidad a ingresar (kg por bulto)" else "Cantidad a ingresar"
            binding.edtCantidadInsumo.hint = if (esBultos) "Ej. 40" else "Ej. 100"
            binding.contenedorNumeroBultos.visibility = if (esBultos) View.VISIBLE else View.GONE
            binding.txtStockMinimoInsumo.text = if (esBultos)
                "Stock mínimo para alerta (kg)" else "Stock mínimo para alerta"
            binding.edtCantidadInsumo.error = null
            if (!esBultos) {
                binding.edtNumeroBultos.text.clear()
                binding.edtNumeroBultos.error = null
            }
        }
        binding.spinnerUnidadInsumo.onItemSelectedListener =
            object : android.widget.AdapterView.OnItemSelectedListener {
                override fun onItemSelected(parent: android.widget.AdapterView<*>?,
                                            view: View?, position: Int, id: Long) {
                    actualizarCamposUnidad(unidadesMedida.getOrNull(position) == "Bultos")
                }
                override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {
                    actualizarCamposUnidad(false)
                }
            }

        cargarTiposAlimentoParaInsumo(
            tiposAlimento,
            nombresTipos,
            adapterTipos,
            binding
        )


        binding.btnCancelarInsumo.setOnClickListener {
            dialog.dismiss()
        }

        binding.btnAgregarInsumo.setOnClickListener {
            val posicionTipo = binding.spinnerTipoAlimento.selectedItemPosition
            val tipoAlimento = tiposAlimento.getOrNull(posicionTipo)

            val cantidadTexto = binding.edtCantidadInsumo.text.toString().trim()
            val unidadSeleccionada = binding.spinnerUnidadInsumo.selectedItemPosition
            val unidad = binding.spinnerUnidadInsumo.selectedItem?.toString()?.trim().orEmpty()
            val cantidad = cantidadTexto.replace(',', '.').toDoubleOrNull()
            val esBultos = unidad == "Bultos"
            val numeroBultos = binding.edtNumeroBultos.text.toString().trim().toIntOrNull()
            val minimoTexto = binding.edtStockMinimoInsumo.text.toString().trim()
                .replace(',', '.')
            val stockMinimo = minimoTexto.takeIf { it.isNotBlank() }?.toDoubleOrNull()

            var primerError: View? = null
            val faltanSelecciones = mutableListOf<String>()
            if (minimoTexto.isNotBlank() &&
                (stockMinimo == null || stockMinimo <= 0.0 || !stockMinimo.isFinite())) {
                binding.edtStockMinimoInsumo.error = "Ingresa un mínimo mayor que 0"
                primerError = primerError ?: binding.edtStockMinimoInsumo
            }
            if (tipoAlimento == null) faltanSelecciones.add("tipo de alimento")
            if (cantidad == null || !cantidad.isFinite() || cantidad < 0.0 || (esBultos && cantidad <= 0.0)) {
                binding.edtCantidadInsumo.error = "Ingresa una cantidad válida"
                primerError = primerError ?: binding.edtCantidadInsumo
            }
            if (esBultos && (numeroBultos == null || numeroBultos <= 0)) {
                binding.edtNumeroBultos.error = "Ingresa un número de bultos mayor que 0"
                primerError = primerError ?: binding.edtNumeroBultos
            }
            if (unidadSeleccionada <= 0 || unidad.isEmpty()) faltanSelecciones.add("unidad de medida")
            if (faltanSelecciones.isNotEmpty() || primerError != null) {
                if (faltanSelecciones.isNotEmpty()) Toast.makeText(
                    this, "Selecciona: ${faltanSelecciones.joinToString(", ")}", Toast.LENGTH_SHORT
                ).show()
                primerError?.requestFocus()
                return@setOnClickListener
            }


            val tipoAlimentoValidado = tipoAlimento ?: return@setOnClickListener
            val cantidadValidada = cantidad ?: return@setOnClickListener
            val total = if (esBultos) cantidadValidada * (numeroBultos ?: return@setOnClickListener) else cantidadValidada
            if (!total.isFinite()) {
                binding.edtCantidadInsumo.error = "La cantidad total no es válida"
                return@setOnClickListener
            }

            crearInsumo(
                dialog = dialog,
                binding = binding,
                nombre = tipoAlimentoValidado.nombre.trim(),
                categoria = "alimento",
                cantidad = total,
                unidad = if (esBultos) "Kg" else unidad,
                proveedorId = null,
                stockMinimo = stockMinimo
            )
        }
    }

    private fun cargarTiposAlimentoParaInsumo(
        tiposAlimento: MutableList<TipoAlimentoResponse>,
        nombres: MutableList<String>,
        adapter: ArrayAdapter<String>,
        binding: R03NuevoInsumoBinding
    ) {
        lifecycleScope.launch {
            try {
                val todos = mutableListOf<TipoAlimentoResponse>()
                var page = 1
                var totalPages = 1

                do {
                    val response = RetrofitClient.api.listarTiposAlimento(
                        page = page,
                        limit = 100
                    )

                    if (!response.isSuccessful) {
                        throw IllegalStateException(
                            "No se pudieron cargar los tipos de alimento. Código: ${response.code()}"
                        )
                    }

                    val body = response.body()
                        ?: throw IllegalStateException("La API no devolvió tipos de alimento")

                    todos += body.data.filter { it.activo }
                    totalPages = body.meta.totalPages
                    page++
                } while (page <= totalPages)

                tiposAlimento.clear()
                tiposAlimento.addAll(todos.distinctBy { it.id })

                nombres.clear()
                if (tiposAlimento.isEmpty()) {
                    nombres.add("No hay tipos de alimento disponibles")
                    binding.btnAgregarInsumo.isEnabled = false
                } else {
                    nombres.addAll(tiposAlimento.map { tipo ->
                        buildString {
                            append(tipo.nombre)
                            tipo.marca?.trim()?.takeIf { it.isNotEmpty() }?.let {
                                append(" — ").append(it)
                            }
                            tipo.etapa?.trim()?.takeIf { it.isNotEmpty() }?.let {
                                append(" · ").append(it)
                            }
                        }
                    })
                }

                adapter.notifyDataSetChanged()

            } catch (e: Exception) {
                nombres.clear()
                nombres.add("No se pudieron cargar los alimentos")
                adapter.notifyDataSetChanged()
                binding.btnAgregarInsumo.isEnabled = false

                Toast.makeText(
                    this@MainActivity,
                    "Error al cargar tipos de alimento: ${e.message ?: "error desconocido"}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun crearInsumo(
        dialog: Dialog,
        binding: R03NuevoInsumoBinding,
        nombre: String,
        categoria: String,
        cantidad: Double,
        unidad: String,
        proveedorId: Int?,
        stockMinimo: Double?
    ) {
        binding.btnAgregarInsumo.isEnabled = false

        lifecycleScope.launch {
            try {
                val granjaId = obtenerGranjaActivaId()

                val request = InsumoRequest(
                    granja_id = granjaId,
                    nombre = nombre,
                    tipo = categoria,
                    unidad_medida = unidad,
                    stock_actual = cantidad,
                    stock_minimo = stockMinimo,
                    precio_unitario_cop = null,
                    proveedor_habitual_id = proveedorId,
                    ubicacion_almacen = null,
                    fecha_vencimiento = null
                )

                val response = RetrofitClient.api.crearInsumo(request)

                if (response.isSuccessful) {
                    // Mostrar la granja en la que el backend acaba de crear el alimento.
                    // Evita que Bodega lo oculte por un selector anterior.
                    seleccionarGranja(response.body()?.granja_id ?: granjaId)
                    Toast.makeText(
                        this@MainActivity,
                        "Alimento agregado correctamente",
                        Toast.LENGTH_SHORT
                    ).show()
                    dialog.dismiss()
                    actualizarTrasRegistro(BodegaFragment())
                } else {
                    binding.btnAgregarInsumo.isEnabled = true
                    val detalle = response.errorBody()?.string()?.take(250).orEmpty()
                    val mensaje = when (response.code()) {
                        401 -> "Sesión no válida. Inicia sesión nuevamente."
                        403 -> "El backend rechazó la creación del alimento (403)."
                        400 -> "Los datos del alimento no son válidos."
                        else -> "No se pudo crear el alimento. Código: ${response.code()}"
                    }
                    Toast.makeText(
                        this@MainActivity,
                        if (detalle.isBlank()) mensaje else "$mensaje\n$detalle",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                binding.btnAgregarInsumo.isEnabled = true
                Toast.makeText(
                    this@MainActivity,
                    "Error al crear el alimento: ${e.message ?: "error desconocido"}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private suspend fun obtenerGranjaActivaId(): Int {
        granjaSeleccionadaId?.let { return it }

        val response = RetrofitClient.api.listarGranjas(
            page = 1,
            limit = 100
        )

        if (!response.isSuccessful) {
            throw IllegalStateException(
                "No se pudieron cargar las granjas. Código: ${response.code()}"
            )
        }

        return response.body()
            ?.data
            ?.firstOrNull { it.activa }
            ?.id
            ?: throw IllegalStateException("No hay una granja activa disponible")
    }

    // =========================================================
    // DIALOG - MORTALIDAD
    // =========================================================

    fun mostrarDialogRegistrarEvento(
        dialogExistente: Dialog? = null
    ) {

        val dialog =
            dialogExistente
                ?: Dialog(this).also {

                    it.window
                        ?.setBackgroundDrawableResource(
                            android.R.color.transparent
                        )
                }

        val binding =
            R04RegistrarEventoMortalidadBinding
                .inflate(layoutInflater)

        dialog.setContentView(
            binding.root
        )

        // Foto opcional, almacenada localmente y asociada al ID del registro.
        fotoMortalidadTemporal = null
        fotoMortalidadTomada = false
        fotoMortalidadVistaPrevia = binding.imgFotoMortalidad
        fotoMortalidadBotonAdjuntar = binding.btnTomarFotoMortalidad
        fotoMortalidadContenedorPrevia = binding.contenedorFotoMortalidad

        binding.imgFotoMortalidad.setOnClickListener {
            val foto = fotoMortalidadTemporal
            if (fotoMortalidadTomada && foto?.exists() == true) {
                val visor = Dialog(this)
                val imagenAmpliada = android.widget.ImageView(this).apply {
                    setImageURI(Uri.fromFile(foto))
                    scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
                    adjustViewBounds = true
                    setBackgroundColor(android.graphics.Color.BLACK)
                }
                visor.setContentView(imagenAmpliada)
                visor.show()
                visor.window?.setBackgroundDrawableResource(android.R.color.black)
                visor.window?.setLayout(
                    (resources.displayMetrics.widthPixels * 0.95f).toInt(),
                    (resources.displayMetrics.heightPixels * 0.85f).toInt()
                )
                imagenAmpliada.setOnClickListener { visor.dismiss() }
            }
        }

        // El botón inferior "Ampliar" utiliza la misma vista previa que la foto.
        binding.btnAmpliarFotoMortalidad.setOnClickListener {
            binding.imgFotoMortalidad.performClick()
        }

        binding.btnEliminarFotoMortalidad.setOnClickListener {
            fotoMortalidadTemporal?.delete()
            fotoMortalidadTemporal = null
            fotoMortalidadTomada = false
            binding.imgFotoMortalidad.setImageDrawable(null)
            binding.imgFotoMortalidad.visibility = View.GONE
            binding.contenedorFotoMortalidad.visibility = View.GONE
            binding.btnTomarFotoMortalidad.visibility = View.VISIBLE
        }

        binding.btnTomarFotoMortalidad.setOnClickListener {
            try {
                val carpeta = File(filesDir, "evidencias_mortalidad").apply { mkdirs() }
                val archivo = File.createTempFile("captura_", ".jpg", carpeta)
                fotoMortalidadTemporal = archivo
                val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", archivo)
                omitirAperturaPorActividadExterna()
                capturarFotoMortalidad.launch(uri)
            } catch (e: Exception) {
                cancelarOmisionApertura()
                Toast.makeText(this, "No se pudo abrir la cámara", Toast.LENGTH_LONG).show()
            }
        }
        dialog.setOnDismissListener {
            fotoMortalidadVistaPrevia = null
            fotoMortalidadBotonAdjuntar = null
            fotoMortalidadContenedorPrevia = null
            if (fotoMortalidadTemporal?.name?.startsWith("captura_") == true) {
                fotoMortalidadTemporal?.delete()
            }
            fotoMortalidadTemporal = null
            fotoMortalidadTomada = false
        }

        binding.root.alpha = 0f

        binding.root.animate()
            .alpha(1f)
            .setDuration(180)
            .start()

        if (dialogExistente == null) {

            dialog.show()

            dialog.window?.setLayout(
                (
                        resources.displayMetrics.widthPixels *
                                0.92f
                        ).toInt(),
                WindowManager.LayoutParams.WRAP_CONTENT
            )
        }

        val nombresLotes =
            mutableListOf(
                "Seleccionar lote"
            )

        val idsLotes =
            mutableListOf<Int?>(null)

        val adapterLotes =
            SpinnerAdapterEstilizado(
                this,
                nombresLotes
            )

        binding
            .spinnerLote
            .adapter = adapterLotes

        cargarLotes(
            nombresLotes,
            idsLotes,
            adapterLotes
        )

        binding
            .edtFecha
            .setOnClickListener {

                mostrarSelectorFecha(
                    binding.edtFecha
                )
            }

        binding
            .btnCancelarEvento
            .setOnClickListener {

                dialog.dismiss()
            }

        val causas = (listOf("Sin causa registrada") + CausasMortalidad.opciones + CausasMortalidad.OTRA).toMutableList()
        binding.spinnerCausaPresuntiva.adapter = SpinnerAdapterEstilizado(this, causas)
        binding.spinnerCausaPresuntiva.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                binding.edtCausaPresuntiva.visibility = if (causas[position] == CausasMortalidad.OTRA) View.VISIBLE else View.GONE
            }
            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
        }

        binding
            .btnGuardarEvento
            .setOnClickListener {

                val lotePosition =
                    binding
                        .spinnerLote
                        .selectedItemPosition

                val loteId =
                    if (
                        lotePosition in idsLotes.indices
                    ) {
                        idsLotes[lotePosition]
                    } else {
                        null
                    }

                val fecha =
                    binding
                        .edtFecha
                        .text
                        .toString()
                        .trim()

                val cantidad =
                    binding
                        .edtCantidadAves
                        .text
                        .toString()
                        .trim()

                val seleccionCausa = causas.getOrNull(binding.spinnerCausaPresuntiva.selectedItemPosition)
                val causa = when (seleccionCausa) {
                    null, "Sin causa registrada" -> null
                    CausasMortalidad.OTRA -> binding.edtCausaPresuntiva.text.toString().trim()
                    else -> seleccionCausa
                }
                if (seleccionCausa == CausasMortalidad.OTRA && (causa.isNullOrBlank() || causa.length > 150 || causa.none { it.isLetter() })) {
                    binding.edtCausaPresuntiva.error = "Escribe una causa válida (máximo 150 caracteres)"
                    binding.edtCausaPresuntiva.requestFocus()
                    return@setOnClickListener
                }

                var primerError: View? = null
                var faltanSelecciones = false
                if (loteId == null) faltanSelecciones = true
                if (fecha.isBlank()) {
                    binding.edtFecha.error = "Selecciona una fecha"
                    primerError = primerError ?: binding.edtFecha
                }
                if ((cantidad.toIntOrNull() ?: 0) <= 0) {
                    binding.edtCantidadAves.error = "Ingresa una cantidad válida mayor que cero"
                    primerError = primerError ?: binding.edtCantidadAves
                }
                if (faltanSelecciones || primerError != null) {
                    if (faltanSelecciones) Toast.makeText(this, "Selecciona un lote", Toast.LENGTH_SHORT).show()
                    primerError?.requestFocus()
                    return@setOnClickListener
                }

                // Las validaciones anteriores ya mostraron todos los errores.
                // A partir de aquí se utilizan valores no nulos para construir la solicitud.
                val loteIdValidado = loteId ?: return@setOnClickListener

                val request =
                    RegistroMortalidadRequest(
                        lote_id = loteIdValidado,
                        fecha =
                            convertirFechaParaApi(
                                fecha
                            ),
                        cantidad_aves =
                            cantidad.toInt(),
                        causa_presuntiva =
                            causa,
                        observaciones =
                            binding
                                .edtObservaciones
                                .text
                                .toString()
                                .trim()
                                .ifBlank {
                                    null
                                }
                    )

                binding
                    .btnGuardarEvento
                    .isEnabled = false

                lifecycleScope.launch {

                    if (!OfflineCache.hayInternet(this@MainActivity)) {
                        val bytesFoto = try {
                            if (fotoMortalidadTomada) com.project.avisensandroid.controller.FotosMortalidad.preparar(checkNotNull(fotoMortalidadTemporal)) else null
                        } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (_: Exception) {
                            binding.btnGuardarEvento.isEnabled = true
                            Toast.makeText(this@MainActivity, "No se pudo preparar la fotografía", Toast.LENGTH_LONG).show()
                            return@launch
                        }
                        val guardado = Hu56OfflineQueue.guardar(this@MainActivity, "mortalidad", request, bytesFoto)
                        binding.btnGuardarEvento.isEnabled = !guardado
                        Toast.makeText(this@MainActivity,
                            if (guardado) "Registro guardado sin conexión. Pendiente de sincronizar" else "No se pudo guardar localmente el registro",
                            Toast.LENGTH_LONG).show()
                        if (guardado) {
                            dialog.dismiss()
                            actualizarTrasRegistro(BitacoraFragment())
                        }
                        return@launch
                    }
                    try {
                        val foto = fotoMortalidadTemporal
                        val bytesFoto = if (fotoMortalidadTomada && foto != null) {
                            com.project.avisensandroid.controller.FotosMortalidad.preparar(foto)
                        } else null
                        dialog.setCancelable(false)
                        dialog.setCanceledOnTouchOutside(false)


                        val response =
                            RetrofitClient.api
                                .crearRegistroMortalidad(
                                    request
                                )

                        if (response.isSuccessful) {
                            val registroId = response.body()?.id
                            val fotoGuardada = if (bytesFoto != null && registroId != null) {
                                try {
                                    com.project.avisensandroid.controller.FotosMortalidad.subir(this@MainActivity, registroId, bytesFoto)
                                } catch (e: kotlinx.coroutines.CancellationException) { throw e }
                                catch (_: Exception) { false }
                            } else bytesFoto == null
                            Toast.makeText(this@MainActivity,
                                if (fotoGuardada) "Registro de mortalidad guardado correctamente"
                                else "Registro guardado, pero la foto no se confirmó. Revisa el registro en Bitácora.",
                                Toast.LENGTH_LONG).show()

                            dialog.dismiss()

                            actualizarTrasRegistro(BitacoraFragment())

                        } else {
                            dialog.setCancelable(true)
                            dialog.setCanceledOnTouchOutside(true)

                            binding
                                .btnGuardarEvento
                                .isEnabled = true

                            mostrarErrorApi(
                                "No se pudo guardar la mortalidad",
                                response.code(),
                                response.errorBody()
                                    ?.string()
                            )
                        }

                    } catch (e: kotlinx.coroutines.CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        dialog.setCancelable(true)
                        dialog.setCanceledOnTouchOutside(true)

                        binding
                            .btnGuardarEvento
                            .isEnabled = true

                        Toast.makeText(
                            this@MainActivity,
                            "Error al guardar la mortalidad: ${e.message ?: "error desconocido"}",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
    }

    // =========================================================
    // DIALOG - SEGUIMIENTO SANITARIO (DISEÑO / DEMO)
    // =========================================================

    fun mostrarDialogRegistrarSeguimientoSanitario(lotePreseleccionado: String? = null) {

        val dialog = Dialog(this)
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val binding =
            R06RegistrarSeguimientoSanitarioBinding.inflate(layoutInflater)

        dialog.setContentView(binding.root)
        dialog.show()

        dialog.window?.setLayout(
            (resources.displayMetrics.widthPixels * 0.92f).toInt(),
            WindowManager.LayoutParams.WRAP_CONTENT
        )

        val nombresLotes = mutableListOf("Seleccionar lote")
        val idsLotes = mutableListOf<Int?>(null)

        val adapterLotes = SpinnerAdapterEstilizado(this, nombresLotes)
        binding.spinnerLoteSeguimiento.adapter = adapterLotes

        cargarLotes(
            nombresLotes,
            idsLotes,
            adapterLotes,
            binding.spinnerLoteSeguimiento,
            lotePreseleccionado
        )

        binding.edtFechaSeguimiento.setOnClickListener {
            mostrarSelectorFecha(binding.edtFechaSeguimiento)
        }

        binding.btnCancelarSeguimiento.setOnClickListener {
            dialog.dismiss()
        }

        binding.btnGuardarSeguimiento.setOnClickListener {
            val lotePosition = binding.spinnerLoteSeguimiento.selectedItemPosition
            val loteId = idsLotes.getOrNull(lotePosition)
            val fecha = binding.edtFechaSeguimiento.text.toString().trim()
            val cantidadTexto = binding.edtCantidadAvesSeguimiento.text.toString().trim()
            val observacion = binding.edtObservacionesSeguimiento.text.toString().trim()

            val cantidad = cantidadTexto.toIntOrNull()

            var primerError: View? = null
            val lotePendiente = lotePosition <= 0 || loteId == null
            if (fecha.isBlank()) {
                binding.edtFechaSeguimiento.error = "Selecciona una fecha"
                primerError = primerError ?: binding.edtFechaSeguimiento
            }
            if (cantidad == null || cantidad < 0) {
                binding.edtCantidadAvesSeguimiento.error = "Ingresa una cantidad válida"
                primerError = primerError ?: binding.edtCantidadAvesSeguimiento
            }
            if (lotePendiente || primerError != null) {
                if (lotePendiente) Toast.makeText(this, "Selecciona un lote", Toast.LENGTH_SHORT).show()
                primerError?.requestFocus()
                return@setOnClickListener
            }

            // El estado pertenece a cada seguimiento y se determina de forma
            // automática para esta versión demo, sin pedir otro campo al usuario.
            val estadoAutomatico = if (cantidad == 0) {
                "Recuperadas"
            } else {
                "En tratamiento"
            }

            supportFragmentManager.setFragmentResult(
                "seguimiento_demo_guardado",
                bundleOf(
                    "lote_id" to loteId,
                    "lote" to nombresLotes[lotePosition],
                    "fecha" to fecha,
                    "aves" to cantidad,
                    "estado" to estadoAutomatico,
                    "observacion" to observacion
                )
            )

            Toast.makeText(
                this,
                "Seguimiento guardado (demo)",
                Toast.LENGTH_SHORT
            ).show()
            dialog.dismiss()
        }
    }

    // =========================================================
    // DIALOG - TRATAMIENTO
    // =========================================================

    fun mostrarDialogRegistrarTratamiento(
        dialogExistente: Dialog? = null
    ) {

        val dialog =
            dialogExistente
                ?: Dialog(this).also {

                    it.window
                        ?.setBackgroundDrawableResource(
                            android.R.color.transparent
                        )
                }

        val binding =
            R05RegistrarEventoEnfermoBinding
                .inflate(layoutInflater)

        dialog.setContentView(
            binding.root
        )

        binding.root.alpha = 0f

        binding.root.animate()
            .alpha(1f)
            .setDuration(180)
            .start()

        if (dialogExistente == null) {

            dialog.show()

            dialog.window?.setLayout(
                (
                        resources.displayMetrics.widthPixels *
                                0.92f
                        ).toInt(),
                WindowManager.LayoutParams.WRAP_CONTENT
            )
        }

        val nombresLotes =
            mutableListOf(
                "Seleccionar lote"
            )

        val idsLotes =
            mutableListOf<Int?>(null)

        val adapterLotes =
            SpinnerAdapterEstilizado(
                this,
                nombresLotes
            )

        binding
            .spinnerLoteEnfermo
            .adapter = adapterLotes

        cargarLotes(
            nombresLotes,
            idsLotes,
            adapterLotes
        )

        val nombresInsumos =
            mutableListOf(
                "Seleccionar insumo"
            )

        val idsInsumos =
            mutableListOf<Int?>(null)

        val adapterInsumos =
            SpinnerAdapterEstilizado(
                this,
                nombresInsumos
            )

        binding
            .spinnerInsumoEnfermo
            .adapter = adapterInsumos

        cargarInsumos(
            nombresInsumos,
            idsInsumos,
            adapterInsumos
        )

        val vias =
            mutableListOf(
                "Oral",
                "Intramuscular",
                "Subcutánea",
                "Ocular",
                "Nasal",
                "Agua de bebida",
                "Alimento",
                "Otra"
            )

        val adapterVia =
            SpinnerAdapterEstilizado(
                this,
                vias
            )

        binding
            .spinnerViaAplicacionEnfermo
            .adapter = adapterVia

        binding
            .edtFechaEnfermo
            .setOnClickListener {

                mostrarSelectorFecha(
                    binding.edtFechaEnfermo
                )
            }

        binding
            .btnCancelarEnfermo
            .setOnClickListener {

                dialog.dismiss()
            }

        binding
            .btnGuardarEnfermo
            .setOnClickListener {

                val lotePosition =
                    binding
                        .spinnerLoteEnfermo
                        .selectedItemPosition

                val insumoPosition =
                    binding
                        .spinnerInsumoEnfermo
                        .selectedItemPosition

                val loteId =
                    if (
                        lotePosition in idsLotes.indices
                    ) {
                        idsLotes[lotePosition]
                    } else {
                        null
                    }

                val insumoId =
                    if (
                        insumoPosition in idsInsumos.indices
                    ) {
                        idsInsumos[insumoPosition]
                    } else {
                        null
                    }

                val fecha =
                    binding
                        .edtFechaEnfermo
                        .text
                        .toString()
                        .trim()

                val cantidad =
                    binding
                        .edtCantidadAvesEnfermo
                        .text
                        .toString()
                        .trim()

                val dosis =
                    binding
                        .edtDosisEnfermo
                        .text
                        .toString()
                        .trim()

                var primerError: View? = null
                val seleccionesPendientes = mutableListOf<String>()
                if (loteId == null) seleccionesPendientes.add("lote")
                if (insumoId == null) seleccionesPendientes.add("insumo")
                if (fecha.isBlank()) {
                    binding.edtFechaEnfermo.error = "Selecciona una fecha"
                    primerError = primerError ?: binding.edtFechaEnfermo
                }
                if ((cantidad.toIntOrNull() ?: 0) <= 0) {
                    binding.edtCantidadAvesEnfermo.error = "Ingresa una cantidad válida mayor que cero"
                    primerError = primerError ?: binding.edtCantidadAvesEnfermo
                }
                if (dosis.isBlank()) {
                    binding.edtDosisEnfermo.error = "Ingresa la dosis"
                    primerError = primerError ?: binding.edtDosisEnfermo
                }
                if (seleccionesPendientes.isNotEmpty() || primerError != null) {
                    if (seleccionesPendientes.isNotEmpty()) {
                        Toast.makeText(this, "Selecciona: ${seleccionesPendientes.joinToString(", ")}", Toast.LENGTH_SHORT).show()
                    }
                    primerError?.requestFocus()
                    return@setOnClickListener
                }

                val via =
                    binding
                        .spinnerViaAplicacionEnfermo
                        .selectedItem
                        ?.toString()
                        ?.trim()
                        ?.ifBlank {
                            null
                        }

                // Solo continuar con IDs no nulos después de validar todos los campos.
                val loteIdValidado = loteId ?: return@setOnClickListener
                val insumoIdValidado = insumoId ?: return@setOnClickListener

                val request =
                    EventoSanitarioRequest(
                        lote_id = loteIdValidado,
                        tipo = "tratamiento",
                        fecha =
                            convertirFechaParaApi(
                                fecha
                            ),
                        insumo_id = insumoIdValidado,
                        diagnostico = null,
                        producto = null,
                        dosis = dosis,
                        via_aplicacion = via,
                        cantidad_aves =
                            cantidad.toInt(),
                        observaciones =
                            binding
                                .edtObservacionesEnfermo
                                .text
                                .toString()
                                .trim()
                                .ifBlank {
                                    null
                                }
                    )

                binding
                    .btnGuardarEnfermo
                    .isEnabled = false

                lifecycleScope.launch {

                    if (!OfflineCache.hayInternet(this@MainActivity)) {
                        val guardado = Hu56OfflineQueue.guardar(this@MainActivity, "sanitario", request)
                        binding.btnGuardarEnfermo.isEnabled = !guardado
                        Toast.makeText(this@MainActivity,
                            if (guardado) "Registro guardado sin conexión. Pendiente de sincronizar" else "No se pudo guardar localmente el registro",
                            Toast.LENGTH_LONG).show()
                        if (guardado) {
                            dialog.dismiss()
                            mostrarFragment(BitacoraEnfermoFragment())
                        }
                        return@launch
                    }
                    try {

                        val response =
                            RetrofitClient.api
                                .crearEventoSanitario(
                                    request
                                )

                        if (response.isSuccessful) {

                            Toast.makeText(
                                this@MainActivity,
                                "Tratamiento registrado correctamente",
                                Toast.LENGTH_LONG
                            ).show()

                            dialog.dismiss()

                            mostrarFragment(
                                BitacoraEnfermoFragment()
                            )

                        } else {

                            binding
                                .btnGuardarEnfermo
                                .isEnabled = true

                            mostrarErrorApi(
                                "No se pudo registrar el tratamiento",
                                response.code(),
                                response.errorBody()
                                    ?.string()
                            )
                        }

                    } catch (e: Exception) {

                        binding
                            .btnGuardarEnfermo
                            .isEnabled = true

                        Toast.makeText(
                            this@MainActivity,
                            "Error al registrar el tratamiento: ${e.message ?: "error desconocido"}",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
    }

    // =========================================================
    // CARGAR LOTES
    // =========================================================

    private fun cargarLotes(
        nombres: MutableList<String>,
        ids: MutableList<Int?>,
        adapter: ArrayAdapter<String>,
        spinner: Spinner? = null,
        codigoLotePreseleccionado: String? = null
    ) {
        lifecycleScope.launch {
            try {
                val todosLosLotes = mutableListOf<LoteSelectorResponse>()
                var pagina = 1
                var totalPaginas = 1

                // GET /v1/lotes es paginado. Recorremos todas las páginas para
                // que el Spinner no se quede limitado a los primeros 100 lotes.
                do {
                    val response = RetrofitClient.api.listarLotes(
                        page = pagina,
                        limit = 100
                    )

                    if (!response.isSuccessful) {
                        val detalle = response.errorBody()?.string()?.take(220).orEmpty()
                        Toast.makeText(
                            this@MainActivity,
                            if (detalle.isBlank()) {
                                "No se pudieron cargar los lotes. Código: ${response.code()}"
                            } else {
                                "No se pudieron cargar los lotes. Código: ${response.code()}\n$detalle"
                            },
                            Toast.LENGTH_LONG
                        ).show()
                        return@launch
                    }

                    val body = response.body()
                    if (body == null) {
                        Toast.makeText(
                            this@MainActivity,
                            "La API no devolvió información de lotes",
                            Toast.LENGTH_LONG
                        ).show()
                        return@launch
                    }

                    todosLosLotes.addAll(body.data)
                    totalPaginas = body.meta.totalPages.coerceAtLeast(pagina)
                    if (body.data.isEmpty()) {
                        break
                    }
                    pagina++
                } while (pagina <= totalPaginas)

                val galponIdSeleccionado = galponSeleccionadoId
                val granjaIdSeleccionada = granjaSeleccionadaId

                // Los formularios de mortalidad/enfermo trabajan sobre el
                // galpón activo de Inicio. Si existe una selección de galpón,
                // los lotes de otros galpones no deben aparecer en el Spinner.
                val lotesDeSeleccion = when {
                    galponIdSeleccionado != null -> {
                        todosLosLotes.filter { it.galpon?.id == galponIdSeleccionado }
                    }
                    granjaIdSeleccionada != null -> {
                        todosLosLotes.filter { it.galpon?.granja?.id == granjaIdSeleccionada }
                    }
                    else -> todosLosLotes
                }

                nombres.clear()
                ids.clear()
                nombres.add("Seleccionar lote")
                ids.add(null)

                // Para el selector solo necesitamos id y código. Así evitamos
                // que un campo anidado opcional de la respuesta (/galpon o
                // /proveedor) impida deserializar los lotes.
                lotesDeSeleccion
                    .filter { it.codigo.isNotBlank() }
                    .distinctBy { it.id }
                    .forEach { lote ->
                        nombres.add(lote.codigo)
                        ids.add(lote.id)
                    }

                adapter.notifyDataSetChanged()

                // Si se pidió dejar un lote ya elegido (por ejemplo, al
                // continuar el seguimiento de un caso puntual), lo busca
                // por su código una vez que el spinner ya tiene los datos
                // reales cargados.
                if (spinner != null && codigoLotePreseleccionado != null) {
                    val posicion = nombres.indexOf(codigoLotePreseleccionado)
                    if (posicion >= 0) {
                        spinner.setSelection(posicion)
                    }
                }

                if (ids.size == 1) {
                    Toast.makeText(
                        this@MainActivity,
                        "No hay lotes registrados disponibles",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                Toast.makeText(
                    this@MainActivity,
                    "Error al cargar lotes: ${e.message ?: "error desconocido"}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    // =========================================================
    // CARGAR INSUMOS
    // =========================================================

    private fun cargarInsumos(
        nombres: MutableList<String>,
        ids: MutableList<Int?>,
        adapter: ArrayAdapter<String>
    ) {

        lifecycleScope.launch {

            try {

                val response =
                    RetrofitClient.api
                        .listarInsumos(
                            page = 1,
                            limit = 100
                        )

                if (!response.isSuccessful) {

                    Toast.makeText(
                        this@MainActivity,
                        "No se pudieron cargar los insumos. Código: ${response.code()}",
                        Toast.LENGTH_LONG
                    ).show()

                    return@launch
                }

                val data =
                    response.body()
                        ?.data
                        ?: emptyList()

                nombres.clear()
                ids.clear()

                nombres.add(
                    "Seleccionar insumo"
                )

                ids.add(null)

                data
                    .filter {
                        it.activo
                    }
                    .forEach { insumo ->

                        nombres.add(
                            insumo.nombre
                        )

                        ids.add(
                            insumo.id
                        )
                    }

                adapter.notifyDataSetChanged()

            } catch (e: Exception) {

                Toast.makeText(
                    this@MainActivity,
                    "Error al cargar insumos: ${e.message ?: "error desconocido"}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    // =========================================================
    // SELECTOR DE FECHA
    // =========================================================

    private fun mostrarSelectorFecha(
        view: android.widget.EditText
    ) {

        val calendario =
            Calendar.getInstance()

        DatePickerDialog(
            this,
            { _, year, month, day ->

                view.setText(
                    String.format(
                        Locale.getDefault(),
                        "%02d/%02d/%04d",
                        day,
                        month + 1,
                        year
                    )
                )
            },
            calendario.get(
                Calendar.YEAR
            ),
            calendario.get(
                Calendar.MONTH
            ),
            calendario.get(
                Calendar.DAY_OF_MONTH
            )
        ).show()
    }

    // =========================================================
    // ERROR API
    // =========================================================

    private fun mostrarErrorApi(
        mensaje: String,
        codigo: Int,
        detalle: String?
    ) {

        val texto =
            buildString {

                append(
                    "$mensaje. Código: $codigo"
                )

                if (!detalle.isNullOrBlank()) {

                    append("\n")
                    append(detalle)
                }
            }

        Toast.makeText(
            this,
            texto,
            Toast.LENGTH_LONG
        ).show()
    }

    // =========================================================
    // FECHA PARA API
    // =========================================================

    private fun convertirFechaParaApi(
        fecha: String
    ): String {

        val partes =
            fecha.split("/")

        if (partes.size != 3) {
            return fecha
        }

        val dia =
            partes[0].padStart(
                2,
                '0'
            )

        val mes =
            partes[1].padStart(
                2,
                '0'
            )

        val anio =
            partes[2]

        return "$anio-$mes-$dia"
    }
}