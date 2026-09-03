package com.project.avisensandroid.ui

import android.app.DatePickerDialog
import android.app.Dialog
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.util.Patterns
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.ArrayAdapter
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
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
import com.project.avisensandroid.model.EventoSanitarioRequest
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.GranjaResponse
import com.project.avisensandroid.model.InsumoRequest
import com.project.avisensandroid.model.RegistroMortalidadRequest
import com.project.avisensandroid.model.UserRole
import com.project.avisensandroid.model.UserSession
import com.project.avisensandroid.ui.fragments.AlertasFragment
import com.project.avisensandroid.ui.fragments.BodegaFragment
import com.project.avisensandroid.ui.fragments.BitacoraEnfermoFragment
import com.project.avisensandroid.ui.fragments.BitacoraFragment
import com.project.avisensandroid.ui.fragments.InicioFragment
import com.project.avisensandroid.ui.fragments.SensoresFragment
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.Locale

class MainActivity : AppCompatActivity() {

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

    private val spinnerTextoSeleccionado =
        0xFF171D1A.toInt()

    private val spinnerTextoDropdown =
        0xFFFFFFFF.toInt()

    private val spinnerFondoDropdown =
        0xFF171D1A.toInt()

    // =========================================================
    // ADAPTADOR DE SPINNER ESTILIZADO
    // =========================================================

    private class SpinnerAdapterEstilizado(
        context: android.content.Context,
        items: MutableList<String>
    ) : ArrayAdapter<String>(
        context,
        android.R.layout.simple_spinner_item,
        items
    ) {

        private val colorTextoSeleccionado =
            0xFF171D1A.toInt()

        private val colorTextoDropdown =
            0xFFFFFFFF.toInt()

        private val colorFondoDropdown =
            0xFF171D1A.toInt()

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

                view.textSize = 13f

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

                view.textSize = 13f

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

    fun obtenerRolActual(): UserRole? = rolActual

    fun obtenerNombreUsuario(): String =
        UserSession.name(this)

    fun esOperario(): Boolean =
        rolActual == UserRole.OPERARIO

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {
        super.onCreate(savedInstanceState)

        RetrofitClient.inicializar(applicationContext)

        rolActual = UserSession.role(this)

        if (!UserSession.isLoggedIn(this) || rolActual == null) {
            irALogin()
            return
        }

        if (rolActual == UserRole.OPERARIO) {

            setContentView(R.layout.activity_main)

            if (savedInstanceState == null) {
                mostrarFragment(InicioFragment())
            }

        } else {
            mostrarPantallaRolPendiente()
        }
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

    private fun cerrarSesion() {
        UserSession.clear(this)
        irALogin()
    }

    // =========================================================
    // NAVEGACIÓN PRINCIPAL
    // =========================================================

    fun mostrarFragment(
        fragment: Fragment
    ) {

        if (!esOperario()) return

        supportFragmentManager
            .beginTransaction()
            .replace(
                R.id.mainFragmentContainer,
                fragment
            )
            .commit()
    }

    fun navegarDesdeBottomNav(
        itemId: Int
    ) {

        if (!esOperario()) return

        when (itemId) {

            R.id.nav_inicio -> {
                mostrarFragment(
                    InicioFragment()
                )
            }

            R.id.nav_sensores -> {
                mostrarFragment(
                    SensoresFragment()
                )
            }

            R.id.nav_bodega -> {
                mostrarFragment(
                    BodegaFragment()
                )
            }

            R.id.nav_alertas -> {
                mostrarFragment(
                    AlertasFragment()
                )
            }

            R.id.nav_bitacora -> {
                mostrarFragment(
                    BitacoraFragment()
                )
            }
        }
    }

    // =========================================================
    // API - GRANJAS
    // =========================================================

    suspend fun obtenerGranjas() =
        RetrofitClient.api.listarGranjas(
            page = 1,
            limit = 100
        )

    // =========================================================
    // API - GALPONES
    // =========================================================

    suspend fun obtenerGalpones() =
        RetrofitClient.api.listarGalpones(
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

    // =========================================================
    // VOLVER AL INICIO
    // =========================================================

    private fun volverAlInicio() {

        setContentView(
            R.layout.activity_main
        )

        mostrarFragment(
            InicioFragment()
        )
    }

    // =========================================================
    // IR AL LOGIN
    // =========================================================

    private fun irALogin() {

        startActivity(
            Intent(
                this,
                LoginActivity::class.java
            )
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

        if (!esOperario()) return

        configuracionBinding =
            Co01ConfiguracionOpBinding.inflate(
                layoutInflater
            )

        setContentView(
            configuracionBinding.root
        )

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

    private fun mostrarPerfil() {

        perfilBinding =
            Co03PerfilOpBinding.inflate(
                layoutInflater
            )

        setContentView(
            perfilBinding.root
        )

        val nombreInicial =
            perfilBinding
                .edtNombrePerfil
                .text
                .toString()

        val correoInicial =
            perfilBinding
                .edtCorreoPerfil
                .text
                .toString()

        val telefonoInicial =
            perfilBinding
                .edtTelefonoPerfil
                .text
                .toString()

        setPerfilEditable(false)

        perfilBinding
            .btnGuardarPerfil
            .visibility =
            View.GONE

        fun revisarCambios() {

            val hayCambios =
                perfilBinding
                    .edtNombrePerfil
                    .text
                    .toString() != nombreInicial ||

                        perfilBinding
                            .edtCorreoPerfil
                            .text
                            .toString() != correoInicial ||

                        perfilBinding
                            .edtTelefonoPerfil
                            .text
                            .toString() != telefonoInicial

            perfilBinding
                .btnGuardarPerfil
                .visibility =
                if (hayCambios) {
                    View.VISIBLE
                } else {
                    View.GONE
                }
        }

        val textWatcher =
            object : TextWatcher {

                override fun beforeTextChanged(
                    s: CharSequence?,
                    start: Int,
                    count: Int,
                    after: Int
                ) = Unit

                override fun onTextChanged(
                    s: CharSequence?,
                    start: Int,
                    before: Int,
                    count: Int
                ) {

                    revisarCambios()
                }

                override fun afterTextChanged(
                    s: Editable?
                ) = Unit
            }

        perfilBinding
            .edtNombrePerfil
            .addTextChangedListener(
                textWatcher
            )

        perfilBinding
            .edtCorreoPerfil
            .addTextChangedListener(
                textWatcher
            )

        perfilBinding
            .edtTelefonoPerfil
            .addTextChangedListener(
                textWatcher
            )

        perfilBinding
            .btnCerrarPerfil
            .setOnClickListener {

                mostrarConfiguracion()
            }

        perfilBinding
            .btnEditarNombre
            .setOnClickListener {

                perfilBinding
                    .edtNombrePerfil
                    .isEnabled = true

                perfilBinding
                    .edtNombrePerfil
                    .requestFocus()
            }

        perfilBinding
            .btnEditarCorreo
            .setOnClickListener {

                perfilBinding
                    .edtCorreoPerfil
                    .isEnabled = true

                perfilBinding
                    .edtCorreoPerfil
                    .requestFocus()
            }

        perfilBinding
            .btnEditarTelefono
            .setOnClickListener {

                perfilBinding
                    .edtTelefonoPerfil
                    .isEnabled = true

                perfilBinding
                    .edtTelefonoPerfil
                    .requestFocus()
            }

        perfilBinding
            .btnGuardarPerfil
            .setOnClickListener {

                val nombre =
                    perfilBinding
                        .edtNombrePerfil
                        .text
                        .toString()
                        .trim()

                val correo =
                    perfilBinding
                        .edtCorreoPerfil
                        .text
                        .toString()
                        .trim()

                val telefono =
                    perfilBinding
                        .edtTelefonoPerfil
                        .text
                        .toString()
                        .trim()

                when {

                    nombre.isEmpty() -> {

                        perfilBinding
                            .edtNombrePerfil
                            .error =
                            "Ingresa tu nombre"
                    }

                    !Patterns.EMAIL_ADDRESS
                        .matcher(correo)
                        .matches() -> {

                        perfilBinding
                            .edtCorreoPerfil
                            .error =
                            "Ingresa un correo válido"
                    }

                    telefono.isEmpty() -> {

                        perfilBinding
                            .edtTelefonoPerfil
                            .error =
                            "Ingresa tu teléfono"
                    }

                    else -> {

                        setPerfilEditable(false)

                        perfilBinding
                            .btnGuardarPerfil
                            .visibility =
                            View.GONE

                        Toast.makeText(
                            this,
                            "Perfil actualizado",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            }
    }

    private fun setPerfilEditable(
        editable: Boolean
    ) {

        perfilBinding
            .edtNombrePerfil
            .isEnabled = editable

        perfilBinding
            .edtCorreoPerfil
            .isEnabled = editable

        perfilBinding
            .edtTelefonoPerfil
            .isEnabled = editable
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

                if (nombre.isEmpty()) {

                    binding
                        .edtNombreGalpon
                        .error =
                        "Ingresa el nombre del galpón"

                    return@setOnClickListener
                }

                if (cantidad.isEmpty()) {

                    binding
                        .edtCantidadPollos
                        .error =
                        "Ingresa la cantidad de pollos"

                    return@setOnClickListener
                }

                if (
                    (cantidad.toIntOrNull() ?: 0) <= 0
                ) {

                    binding
                        .edtCantidadPollos
                        .error =
                        "La cantidad debe ser mayor que cero"

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
    // DIALOG - NUEVO INSUMO
    // =========================================================

    fun mostrarDialogNuevoInsumo() {

        val dialog =
            Dialog(this)

        val binding =
            R03NuevoInsumoBinding.inflate(
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

        val nombresProveedores =
            mutableListOf(
                "Seleccionar proveedor"
            )

        val idsProveedores =
            mutableListOf<Int?>(null)

        val adapterProveedores =
            SpinnerAdapterEstilizado(
                this,
                nombresProveedores
            )

        binding
            .spinnerProveedor
            .adapter =
            adapterProveedores

        cargarProveedoresParaInsumo(
            nombresProveedores,
            idsProveedores,
            adapterProveedores
        )

        binding
            .btnCancelarInsumo
            .setOnClickListener {

                dialog.dismiss()
            }

        binding
            .btnAgregarInsumo
            .setOnClickListener {

                val nombre =
                    binding
                        .edtNombreInsumo
                        .text
                        .toString()
                        .trim()

                val categoria =
                    binding
                        .edtCategoriaInsumo
                        .text
                        .toString()
                        .trim()

                val cantidadTexto =
                    binding
                        .edtCantidadInsumo
                        .text
                        .toString()
                        .trim()

                val unidad =
                    binding
                        .edtUnidadInsumo
                        .text
                        .toString()
                        .trim()

                val posicion =
                    binding
                        .spinnerProveedor
                        .selectedItemPosition

                if (nombre.isEmpty()) {

                    binding
                        .edtNombreInsumo
                        .error =
                        "Ingresa el nombre del insumo"

                    return@setOnClickListener
                }

                if (categoria.isEmpty()) {

                    binding
                        .edtCategoriaInsumo
                        .error =
                        "Ingresa la categoría"

                    return@setOnClickListener
                }

                val cantidad =
                    cantidadTexto.toDoubleOrNull()

                if (
                    cantidad == null ||
                    cantidad < 0
                ) {

                    binding
                        .edtCantidadInsumo
                        .error =
                        "Ingresa una cantidad válida"

                    return@setOnClickListener
                }

                if (unidad.isEmpty()) {

                    binding
                        .edtUnidadInsumo
                        .error =
                        "Ingresa la unidad"

                    return@setOnClickListener
                }

                if (
                    posicion <= 0 ||
                    posicion >= idsProveedores.size
                ) {

                    Toast.makeText(
                        this,
                        "Selecciona un proveedor",
                        Toast.LENGTH_SHORT
                    ).show()

                    return@setOnClickListener
                }

                val proveedorId =
                    idsProveedores[posicion]

                if (proveedorId == null) {

                    Toast.makeText(
                        this,
                        "Selecciona un proveedor válido",
                        Toast.LENGTH_SHORT
                    ).show()

                    return@setOnClickListener
                }

                crearInsumo(
                    dialog = dialog,
                    binding = binding,
                    nombre = nombre,
                    categoria = categoria,
                    cantidad = cantidad,
                    unidad = unidad,
                    proveedorId = proveedorId
                )
            }
    }

    private fun cargarProveedoresParaInsumo(
        nombres: MutableList<String>,
        ids: MutableList<Int?>,
        adapter: ArrayAdapter<String>
    ) {

        lifecycleScope.launch {

            try {

                val response =
                    RetrofitClient.api
                        .listarProveedores(
                            page = 1,
                            limit = 100
                        )

                if (!response.isSuccessful) {

                    Toast.makeText(
                        this@MainActivity,
                        "No se pudieron cargar los proveedores. Código: ${response.code()}",
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
                    "Seleccionar proveedor"
                )

                ids.add(null)

                data
                    .filter {
                        it.activo
                    }
                    .forEach {

                        nombres.add(
                            it.nombre
                        )

                        ids.add(
                            it.id
                        )
                    }

                adapter.notifyDataSetChanged()

            } catch (e: Exception) {

                Toast.makeText(
                    this@MainActivity,
                    "Error al cargar proveedores: ${e.message ?: "error desconocido"}",
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
        proveedorId: Int
    ) {

        binding
            .btnAgregarInsumo
            .isEnabled = false

        lifecycleScope.launch {

            try {

                val granjaId =
                    obtenerGranjaActivaId()

                val request =
                    InsumoRequest(
                        granja_id = granjaId,
                        nombre = nombre,
                        tipo = categoria,
                        unidad_medida = unidad,
                        stock_actual = cantidad,
                        stock_minimo = null,
                        precio_unitario_cop = null,
                        proveedor_habitual_id = proveedorId,
                        ubicacion_almacen = null,
                        fecha_vencimiento = null
                    )

                val response =
                    RetrofitClient.api
                        .crearInsumo(
                            request
                        )

                if (response.isSuccessful) {

                    Toast.makeText(
                        this@MainActivity,
                        "Insumo agregado correctamente",
                        Toast.LENGTH_SHORT
                    ).show()

                    dialog.dismiss()

                    mostrarFragment(
                        BodegaFragment()
                    )

                } else {

                    binding
                        .btnAgregarInsumo
                        .isEnabled = true

                    Toast.makeText(
                        this@MainActivity,
                        "No se pudo crear el insumo. Código: ${response.code()}",
                        Toast.LENGTH_LONG
                    ).show()
                }

            } catch (e: Exception) {

                binding
                    .btnAgregarInsumo
                    .isEnabled = true

                Toast.makeText(
                    this@MainActivity,
                    "Error al crear el insumo: ${e.message ?: "error desconocido"}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private suspend fun obtenerGranjaActivaId(): Int {

        val response =
            RetrofitClient.api
                .listarGranjas(
                    page = 1,
                    limit = 100
                )

        if (!response.isSuccessful) {

            throw IllegalStateException(
                "No se pudieron cargar las granjas. Código: ${response.code()}"
            )
        }

        val granja =
            response.body()
                ?.data
                ?.firstOrNull {
                    it.activa
                }
                ?: throw IllegalStateException(
                    "No hay una granja activa disponible"
                )

        return granja.id
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

        val metodos =
            mutableListOf(
                "manual",
                "automatico"
            )

        val adapterMetodo =
            SpinnerAdapterEstilizado(
                this,
                metodos
            )

        binding
            .spinnerMetodoRegistro
            .adapter = adapterMetodo

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

                val causa =
                    binding
                        .edtCausaPresuntiva
                        .text
                        .toString()
                        .trim()
                        .ifBlank {
                            null
                        }

                val disposicion =
                    binding
                        .edtDisposicion
                        .text
                        .toString()
                        .trim()
                        .ifBlank {
                            null
                        }

                val metodo =
                    binding
                        .spinnerMetodoRegistro
                        .selectedItem
                        ?.toString()
                        ?.trim()

                when {

                    loteId == null -> {

                        Toast.makeText(
                            this,
                            "Selecciona un lote",
                            Toast.LENGTH_SHORT
                        ).show()

                        return@setOnClickListener
                    }

                    fecha.isEmpty() -> {

                        binding
                            .edtFecha
                            .error =
                            "Selecciona una fecha"

                        return@setOnClickListener
                    }

                    cantidad.toIntOrNull() == null ||
                            cantidad.toInt() <= 0 -> {

                        binding
                            .edtCantidadAves
                            .error =
                            "Ingresa una cantidad válida mayor que cero"

                        return@setOnClickListener
                    }
                }

                val request =
                    RegistroMortalidadRequest(
                        lote_id = loteId,
                        fecha =
                            convertirFechaParaApi(
                                fecha
                            ),
                        cantidad_aves =
                            cantidad.toInt(),
                        causa_presuntiva =
                            causa,
                        disposicion =
                            disposicion,
                        metodo_registro =
                            metodo,
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

                    try {

                        val response =
                            RetrofitClient.api
                                .crearRegistroMortalidad(
                                    request
                                )

                        if (response.isSuccessful) {

                            Toast.makeText(
                                this@MainActivity,
                                "Registro de mortalidad guardado correctamente",
                                Toast.LENGTH_LONG
                            ).show()

                            dialog.dismiss()

                            mostrarFragment(
                                BitacoraFragment()
                            )

                        } else {

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

                    } catch (e: Exception) {

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

        val metodos =
            mutableListOf(
                "manual",
                "automatico"
            )

        val adapterMetodo =
            SpinnerAdapterEstilizado(
                this,
                metodos
            )

        binding
            .spinnerMetodoRegistroEnfermo
            .adapter = adapterMetodo

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

                when {

                    loteId == null -> {

                        Toast.makeText(
                            this,
                            "Selecciona un lote",
                            Toast.LENGTH_SHORT
                        ).show()

                        return@setOnClickListener
                    }

                    insumoId == null -> {

                        Toast.makeText(
                            this,
                            "Selecciona un insumo",
                            Toast.LENGTH_SHORT
                        ).show()

                        return@setOnClickListener
                    }

                    fecha.isEmpty() -> {

                        binding
                            .edtFechaEnfermo
                            .error =
                            "Selecciona una fecha"

                        return@setOnClickListener
                    }

                    cantidad.toIntOrNull() == null ||
                            cantidad.toInt() <= 0 -> {

                        binding
                            .edtCantidadAvesEnfermo
                            .error =
                            "Ingresa una cantidad válida mayor que cero"

                        return@setOnClickListener
                    }

                    dosis.isEmpty() -> {

                        binding
                            .edtDosisEnfermo
                            .error =
                            "Ingresa la dosis"

                        return@setOnClickListener
                    }
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

                val metodo =
                    binding
                        .spinnerMetodoRegistroEnfermo
                        .selectedItem
                        ?.toString()
                        ?.trim()
                        ?.ifBlank {
                            null
                        }

                val request =
                    EventoSanitarioRequest(
                        lote_id = loteId,
                        tipo = "tratamiento",
                        fecha =
                            convertirFechaParaApi(
                                fecha
                            ),
                        insumo_id = insumoId,
                        diagnostico = null,
                        producto = null,
                        dosis = dosis,
                        via_aplicacion = via,
                        cantidad_aves =
                            cantidad.toInt(),
                        metodo_registro = metodo,
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
        adapter: ArrayAdapter<String>
    ) {

        lifecycleScope.launch {

            try {

                val response =
                    RetrofitClient.api
                        .listarLotes(
                            page = 1,
                            limit = 100
                        )

                if (!response.isSuccessful) {

                    Toast.makeText(
                        this@MainActivity,
                        "No se pudieron cargar los lotes. Código: ${response.code()}",
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
                    "Seleccionar lote"
                )

                ids.add(null)

                data
                    .filter {

                        !it.estado.equals(
                            "finalizado",
                            ignoreCase = true
                        ) &&
                                !it.estado.equals(
                                    "cerrado",
                                    ignoreCase = true
                                )
                    }
                    .forEach { lote ->

                        nombres.add(
                            "${lote.codigo} - ${lote.galpon.nombre}"
                        )

                        ids.add(
                            lote.id
                        )
                    }

                adapter.notifyDataSetChanged()

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