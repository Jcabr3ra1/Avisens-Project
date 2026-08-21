package com.project.avisensandroid

import android.app.DatePickerDialog
import android.app.Dialog
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.view.WindowManager
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

import com.project.avisensandroid.databinding.Po01InicioOpBinding
import com.project.avisensandroid.databinding.Po02SensoresOpBinding
import com.project.avisensandroid.databinding.Po06BitacoraMortalidadOpBinding
import com.project.avisensandroid.databinding.Po07BitacoraConsumoOpBinding
import com.project.avisensandroid.databinding.Po05AlertasOpBinding
import com.project.avisensandroid.databinding.Po03BodegaOpBinding
import com.project.avisensandroid.databinding.Po04BodegaProveedoresOpBinding
import com.project.avisensandroid.databinding.R01RegistrarGalponBinding
import com.project.avisensandroid.databinding.R02DetallesGalponBinding
import com.project.avisensandroid.databinding.R04RegistrarEventoMortalidadBinding
import com.project.avisensandroid.databinding.Au02RecuperarContrasenaBinding
import com.project.avisensandroid.databinding.Au03VerificarCodigoBinding
import com.project.avisensandroid.databinding.Au04NuevaContrasenaBinding
import com.project.avisensandroid.databinding.Au05ConfirmacionContrasenaBinding
import com.project.avisensandroid.databinding.Co03PerfilOpBinding
import com.project.avisensandroid.databinding.R03NuevoInsumoBinding
import com.project.avisensandroid.databinding.Co01ConfiguracionOpBinding
import com.project.avisensandroid.databinding.Co02NotificacionesOpBinding
import com.project.avisensandroid.databinding.Co04SeguridadOpBinding

import java.util.Calendar


class MainActivity : AppCompatActivity() {

    // =========================================================
    // BINDINGS PRINCIPALES
    // =========================================================

    private lateinit var inicioBinding: Po01InicioOpBinding
    private lateinit var sensoresBinding: Po02SensoresOpBinding
    private lateinit var bitacoraMortalidadBinding: Po06BitacoraMortalidadOpBinding
    private lateinit var bitacoraConsumoBinding: Po07BitacoraConsumoOpBinding
    private lateinit var alertasBinding: Po05AlertasOpBinding
    private lateinit var bodegaBinding: Po03BodegaOpBinding
    private lateinit var proveedoresBinding: Po04BodegaProveedoresOpBinding

    // =========================================================
    // CONFIGURACIÓN / PERFIL / NOTIFICACIONES / SEGURIDAD
    // =========================================================

    private lateinit var configuracionBinding: Co01ConfiguracionOpBinding
    private lateinit var perfilBinding: Co03PerfilOpBinding
    private lateinit var notificacionesBinding: Co02NotificacionesOpBinding
    private lateinit var seguridadBinding: Co04SeguridadOpBinding

    // =========================================================
    // RECUPERACIÓN DE CONTRASEÑA
    // =========================================================

    private lateinit var recuperarBinding: Au02RecuperarContrasenaBinding
    private lateinit var verificarBinding: Au03VerificarCodigoBinding
    private lateinit var nuevaContrasenaBinding: Au04NuevaContrasenaBinding
    private lateinit var confirmacionBinding: Au05ConfirmacionContrasenaBinding

    // =========================================================
    // GRANJAS
    // =========================================================

    private lateinit var granjas: Array<String>

    private var granjaSeleccionada: String = ""

    // =========================================================
    // GALPÓN SELECCIONADO
    // =========================================================

    private var galponSeleccionado: String = "Galpón Norte"


        // =========================================================
        // ON CREATE
        // =========================================================

        override fun onCreate(savedInstanceState: Bundle?) {
            super.onCreate(savedInstanceState)

            granjas = resources.getStringArray(R.array.granjas)

            if (granjas.isNotEmpty()) {
                granjaSeleccionada = granjas[0]
            }

            // El login ya se hizo en LoginActivity antes de llegar aquí,
            // así que MainActivity arranca directo en la pantalla de inicio.
            mostrarInicio()
        }


        // =========================================================
        // IR AL LOGIN (cerrar sesión / volver desde recuperación)
        // =========================================================

        private fun irALogin() {

            startActivity(
                Intent(this, LoginActivity::class.java)
            )

            finish()
        }


        // =========================================================
        // RECUPERAR CONTRASEÑA
        // =========================================================

        private fun mostrarRecuperarContrasena() {

            recuperarBinding =
                Au02RecuperarContrasenaBinding.inflate(layoutInflater)

            setContentView(recuperarBinding.root)

            recuperarBinding.btnVolver.setOnClickListener {
                irALogin()
            }

            recuperarBinding.btnEnviarCorreo.setOnClickListener {

                val correo =
                    recuperarBinding.edtCorreo.text
                        .toString()
                        .trim()

                if (correo.isEmpty()) {

                    recuperarBinding.edtCorreo.error =
                        "Ingresa tu correo electrónico"

                    return@setOnClickListener
                }

                if (
                    !android.util.Patterns.EMAIL_ADDRESS
                        .matcher(correo)
                        .matches()
                ) {

                    recuperarBinding.edtCorreo.error =
                        "Ingresa un correo válido"

                    return@setOnClickListener
                }

                mostrarVerificarCodigo()
            }
        }


        // =========================================================
        // VERIFICAR CÓDIGO
        // =========================================================

        private fun mostrarVerificarCodigo() {

            verificarBinding =
                Au03VerificarCodigoBinding.inflate(layoutInflater)

            setContentView(verificarBinding.root)

            verificarBinding.btnVerificarCodigo.setOnClickListener {

                val codigo =
                    verificarBinding.edtCodigo.text
                        .toString()
                        .trim()

                if (codigo.isEmpty()) {

                    verificarBinding.edtCodigo.error =
                        "Ingresa el código"

                    return@setOnClickListener
                }

                if (codigo.length != 6) {

                    verificarBinding.edtCodigo.error =
                        "El código debe tener 6 dígitos"

                    return@setOnClickListener
                }

                mostrarNuevaContrasena()
            }

            verificarBinding.txtReenviarCodigo.setOnClickListener {
                // Pendiente conectar con API
            }
        }


        // =========================================================
        // NUEVA CONTRASEÑA
        // =========================================================

        private fun mostrarNuevaContrasena() {

            nuevaContrasenaBinding =
                Au04NuevaContrasenaBinding.inflate(layoutInflater)

            setContentView(nuevaContrasenaBinding.root)

            nuevaContrasenaBinding.btnCambiarContrasena
                .setOnClickListener {

                    val nueva =
                        nuevaContrasenaBinding.edtNuevaContrasena
                            .text
                            .toString()

                    val confirmar =
                        nuevaContrasenaBinding.edtConfirmarContrasena
                            .text
                            .toString()

                    if (nueva.isEmpty()) {

                        nuevaContrasenaBinding.edtNuevaContrasena
                            .error =
                            "Ingresa una contraseña"

                        return@setOnClickListener
                    }

                    if (nueva.length < 8) {

                        nuevaContrasenaBinding.edtNuevaContrasena
                            .error =
                            "Mínimo 8 caracteres"

                        return@setOnClickListener
                    }

                    if (confirmar.isEmpty()) {

                        nuevaContrasenaBinding.edtConfirmarContrasena
                            .error =
                            "Confirma tu contraseña"

                        return@setOnClickListener
                    }

                    if (nueva != confirmar) {

                        nuevaContrasenaBinding.edtConfirmarContrasena
                            .error =
                            "Las contraseñas no coinciden"

                        return@setOnClickListener
                    }

                    mostrarConfirmacionContrasena()
                }
        }


        // =========================================================
        // CONFIRMACIÓN CONTRASEÑA
        // =========================================================

        private fun mostrarConfirmacionContrasena() {

            confirmacionBinding =
                Au05ConfirmacionContrasenaBinding.inflate(layoutInflater)

            setContentView(confirmacionBinding.root)

            confirmacionBinding.btnVolverLogin.setOnClickListener {
                irALogin()
            }
        }


        // =========================================================
        // INICIO
        // =========================================================

        private fun mostrarInicio() {

            inicioBinding =
                Po01InicioOpBinding.inflate(layoutInflater)

            setContentView(inicioBinding.root)

            configurarSpinnerInicio()
            configurarNavegacionInicio()
            configurarBotonesGalpones()

            inicioBinding.btnNuevoGalpon.setOnClickListener {
                mostrarDialogGestionGalpon()
            }

            inicioBinding.btnPerfil.setOnClickListener {
                mostrarConfiguracion()
            }
        }


        // =========================================================
        // BOTONES DE GALPONES
        // =========================================================

        private fun configurarBotonesGalpones() {

            val galpones = listOf(
                inicioBinding.btnGalponNorte,
                inicioBinding.btnGalponSur,
                inicioBinding.btnGalponEste,
                inicioBinding.btnGalponOeste
            )

            fun obtenerNombreGalpon(
                galpon: LinearLayout
            ): String {

                return when (galpon.id) {

                    R.id.btnGalponNorte ->
                        "Galpón Norte"

                    R.id.btnGalponSur ->
                        "Galpón Sur"

                    R.id.btnGalponEste ->
                        "Galpón Este"

                    R.id.btnGalponOeste ->
                        "Galpón Oeste"

                    else ->
                        ""
                }
            }

            fun actualizarGalponSeleccionado() {

                galpones.forEach { galpon ->

                    val nombreGalpon =
                        obtenerNombreGalpon(galpon)

                    val seleccionado =
                        nombreGalpon == galponSeleccionado

                    if (seleccionado) {

                        galpon.setBackgroundResource(
                            R.drawable.bg_galpon_selected
                        )

                        if (galpon.childCount > 0) {
                            galpon.getChildAt(0).visibility =
                                View.VISIBLE
                        }

                        cambiarColorTextoGalpon(
                            galpon,
                            Color.WHITE
                        )

                    } else {

                        galpon.setBackgroundResource(
                            R.drawable.bg_galpon_unselected
                        )

                        if (galpon.childCount > 0) {
                            galpon.getChildAt(0).visibility =
                                View.INVISIBLE
                        }

                        cambiarColorTextoGalpon(
                            galpon,
                            Color.WHITE
                        )
                    }
                }
            }

            galpones.forEach { galpon ->

                galpon.setOnClickListener {

                    galponSeleccionado =
                        obtenerNombreGalpon(galpon)

                    actualizarGalponSeleccionado()
                }
            }

            actualizarGalponSeleccionado()
        }


        // =========================================================
        // CAMBIAR COLOR DEL TEXTO DEL GALPÓN
        // =========================================================

        private fun cambiarColorTextoGalpon(
            galpon: LinearLayout,
            color: Int
        ) {

            for (i in 0 until galpon.childCount) {

                val hijo = galpon.getChildAt(i)

                if (hijo is TextView) {
                    hijo.setTextColor(color)
                }
            }
        }


        // =========================================================
        // SPINNER DE GRANJAS
        // =========================================================

        private fun configurarSpinnerInicio() {

            val adapter =
                ArrayAdapter(
                    this,
                    android.R.layout.simple_spinner_item,
                    granjas
                )

            adapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
            )

            inicioBinding.spinnerGranjas.adapter =
                adapter

            val posicion =
                granjas.indexOf(granjaSeleccionada)

            if (posicion >= 0) {
                inicioBinding.spinnerGranjas
                    .setSelection(posicion)
            }

            inicioBinding.spinnerGranjas
                .onItemSelectedListener =
                object : AdapterView.OnItemSelectedListener {

                    override fun onItemSelected(
                        parent: AdapterView<*>?,
                        view: View?,
                        position: Int,
                        id: Long
                    ) {

                        if (
                            position >= 0 &&
                            position < granjas.size
                        ) {

                            granjaSeleccionada =
                                granjas[position]
                        }
                    }

                    override fun onNothingSelected(
                        parent: AdapterView<*>?
                    ) {
                    }
                }
        }


        // =========================================================
        // NAVEGACIÓN INICIO
        // =========================================================

        private fun configurarNavegacionInicio() {

            inicioBinding.bottomNav
                .setOnItemSelectedListener { item ->

                    when (item.itemId) {

                        R.id.nav_inicio -> {
                            true
                        }

                        R.id.nav_sensores -> {
                            mostrarSensores()
                            true
                        }

                        R.id.nav_bodega -> {
                            mostrarBodega()
                            true
                        }

                        R.id.nav_alertas -> {
                            mostrarAlertas()
                            true
                        }

                        R.id.nav_bitacora -> {
                            mostrarBitacoraMortalidad()
                            true
                        }

                        else -> false
                    }
                }
        }


        // =========================================================
        // SENSORES
        // =========================================================

        private fun mostrarSensores() {

            sensoresBinding =
                Po02SensoresOpBinding.inflate(layoutInflater)

            setContentView(sensoresBinding.root)

            sensoresBinding.bottomNav.selectedItemId =
                R.id.nav_sensores

            sensoresBinding.bottomNav
                .setOnItemSelectedListener { item ->

                    when (item.itemId) {

                        R.id.nav_inicio -> {
                            mostrarInicio()
                            true
                        }

                        R.id.nav_sensores -> {
                            true
                        }

                        R.id.nav_bodega -> {
                            mostrarBodega()
                            true
                        }

                        R.id.nav_alertas -> {
                            mostrarAlertas()
                            true
                        }

                        R.id.nav_bitacora -> {
                            mostrarBitacoraMortalidad()
                            true
                        }

                        else -> false
                    }
                }

            actualizarTemperatura(24f)
        }


        // =========================================================
        // BODEGA
        // =========================================================

        private fun mostrarBodega() {

            bodegaBinding =
                Po03BodegaOpBinding.inflate(layoutInflater)

            setContentView(bodegaBinding.root)

            bodegaBinding.bottomNav.selectedItemId =
                R.id.nav_bodega

            bodegaBinding.bottomNav
                .setOnItemSelectedListener { item ->

                    when (item.itemId) {

                        R.id.nav_inicio -> {
                            mostrarInicio()
                            true
                        }

                        R.id.nav_sensores -> {
                            mostrarSensores()
                            true
                        }

                        R.id.nav_bodega -> {
                            true
                        }

                        R.id.nav_alertas -> {
                            mostrarAlertas()
                            true
                        }

                        R.id.nav_bitacora -> {
                            mostrarBitacoraMortalidad()
                            true
                        }

                        else -> false
                    }
                }

            bodegaBinding.btnProveedores.setOnClickListener {
                mostrarProveedores()
            }

            bodegaBinding.btnInsumos.setOnClickListener {
                mostrarBodega()
            }

            bodegaBinding.btnNuevoInsumo.setOnClickListener {
                mostrarDialogNuevoInsumo()
            }
        }


        // =========================================================
        // PROVEEDORES
        // =========================================================

        private fun mostrarProveedores() {

            proveedoresBinding =
                Po04BodegaProveedoresOpBinding
                    .inflate(layoutInflater)

            setContentView(proveedoresBinding.root)

            proveedoresBinding.bottomNav.selectedItemId =
                R.id.nav_bodega

            proveedoresBinding.bottomNav
                .setOnItemSelectedListener { item ->

                    when (item.itemId) {

                        R.id.nav_inicio -> {
                            mostrarInicio()
                            true
                        }

                        R.id.nav_sensores -> {
                            mostrarSensores()
                            true
                        }

                        R.id.nav_bodega -> {
                            mostrarBodega()
                            true
                        }

                        R.id.nav_alertas -> {
                            mostrarAlertas()
                            true
                        }

                        R.id.nav_bitacora -> {
                            mostrarBitacoraMortalidad()
                            true
                        }

                        else -> false
                    }
                }

            proveedoresBinding.btnInsumos.setOnClickListener {
                mostrarBodega()
            }
        }


        // =========================================================
        // ALERTAS
        // =========================================================

        private fun mostrarAlertas() {

            alertasBinding =
                Po05AlertasOpBinding.inflate(layoutInflater)

            setContentView(alertasBinding.root)

            alertasBinding.bottomNav.selectedItemId =
                R.id.nav_alertas

            alertasBinding.bottomNav
                .setOnItemSelectedListener { item ->

                    when (item.itemId) {

                        R.id.nav_inicio -> {
                            mostrarInicio()
                            true
                        }

                        R.id.nav_sensores -> {
                            mostrarSensores()
                            true
                        }

                        R.id.nav_bodega -> {
                            mostrarBodega()
                            true
                        }

                        R.id.nav_alertas -> {
                            true
                        }

                        R.id.nav_bitacora -> {
                            mostrarBitacoraMortalidad()
                            true
                        }

                        else -> false
                    }
                }

            alertasBinding.tabActivas.setOnClickListener {

                alertasBinding.tabActivas
                    .setBackgroundResource(
                        R.drawable.bg_tab_selected
                    )

                alertasBinding.tabHistorial
                    .setBackgroundResource(
                        R.drawable.bg_tabs
                    )
            }

            alertasBinding.tabHistorial.setOnClickListener {

                alertasBinding.tabHistorial
                    .setBackgroundResource(
                        R.drawable.bg_tab_selected
                    )

                alertasBinding.tabActivas
                    .setBackgroundResource(
                        R.drawable.bg_tabs
                    )
            }

            alertasBinding.btnEscalar1.setOnClickListener {
                // Pendiente conectar con backend
            }

            alertasBinding.btnCerrar1.setOnClickListener {
                // Pendiente conectar con backend
            }

            alertasBinding.btnEscalar2.setOnClickListener {
                // Pendiente conectar con backend
            }

            alertasBinding.btnCerrar2.setOnClickListener {
                // Pendiente conectar con backend
            }
        }


        // =========================================================
        // BITÁCORA MORTALIDAD
        // =========================================================

        private fun mostrarBitacoraMortalidad() {

            bitacoraMortalidadBinding =
                Po06BitacoraMortalidadOpBinding
                    .inflate(layoutInflater)

            setContentView(bitacoraMortalidadBinding.root)

            bitacoraMortalidadBinding.bottomNav
                .selectedItemId =
                R.id.nav_bitacora

            bitacoraMortalidadBinding.bottomNav
                .setOnItemSelectedListener { item ->

                    when (item.itemId) {

                        R.id.nav_inicio -> {
                            mostrarInicio()
                            true
                        }

                        R.id.nav_sensores -> {
                            mostrarSensores()
                            true
                        }

                        R.id.nav_bodega -> {
                            mostrarBodega()
                            true
                        }

                        R.id.nav_alertas -> {
                            mostrarAlertas()
                            true
                        }

                        R.id.nav_bitacora -> {
                            true
                        }

                        else -> false
                    }
                }

            bitacoraMortalidadBinding
                .tbnConsumo
                .setOnClickListener {

                    mostrarBitacoraConsumo()
                }

            bitacoraMortalidadBinding
                .btnRegistrarEvento
                .setOnClickListener {

                    mostrarDialogRegistrarEvento()
                }
        }


        // =========================================================
        // BITÁCORA CONSUMO
        // =========================================================

        private fun mostrarBitacoraConsumo() {

            bitacoraConsumoBinding =
                Po07BitacoraConsumoOpBinding
                    .inflate(layoutInflater)

            setContentView(bitacoraConsumoBinding.root)

            bitacoraConsumoBinding.bottomNav
                .selectedItemId =
                R.id.nav_bitacora

            bitacoraConsumoBinding.bottomNav
                .setOnItemSelectedListener { item ->

                    when (item.itemId) {

                        R.id.nav_inicio -> {
                            mostrarInicio()
                            true
                        }

                        R.id.nav_sensores -> {
                            mostrarSensores()
                            true
                        }

                        R.id.nav_bodega -> {
                            mostrarBodega()
                            true
                        }

                        R.id.nav_alertas -> {
                            mostrarAlertas()
                            true
                        }

                        R.id.nav_bitacora -> {
                            true
                        }

                        else -> false
                    }
                }

            bitacoraConsumoBinding
                .btnMortalidad
                .setOnClickListener {

                    mostrarBitacoraMortalidad()
                }
        }


        // =========================================================
        // CONFIGURACIÓN
        // =========================================================

        private fun mostrarConfiguracion() {

            configuracionBinding =
                Co01ConfiguracionOpBinding
                    .inflate(layoutInflater)

            setContentView(configuracionBinding.root)

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
                    mostrarInicio()
                }

            configuracionBinding
                .btnCerrarSesion
                .setOnClickListener {
                    irALogin()
                }
        }


        // =========================================================
        // SEGURIDAD
        // =========================================================

        private fun mostrarSeguridad() {

            seguridadBinding =
                Co04SeguridadOpBinding
                    .inflate(layoutInflater)

            setContentView(seguridadBinding.root)

            seguridadBinding
                .btnVolver
                .setOnClickListener {
                    mostrarConfiguracion()
                }

            seguridadBinding
                .btnVerificacionDosPasos
                .setOnClickListener {
                    // Pendiente
                }

            seguridadBinding
                .btnCambiarContrasena
                .setOnClickListener {
                    // Pendiente
                }

            seguridadBinding
                .btnSesionesActivas
                .setOnClickListener {
                    // Pendiente
                }

            seguridadBinding
                .btnCerrarSesiones
                .setOnClickListener {
                    // Pendiente
                }
        }


        // =========================================================
        // NOTIFICACIONES
        // =========================================================

        private fun mostrarNotificaciones() {

            notificacionesBinding =
                Co02NotificacionesOpBinding
                    .inflate(layoutInflater)

            setContentView(notificacionesBinding.root)

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
                Co03PerfilOpBinding
                    .inflate(layoutInflater)

            setContentView(perfilBinding.root)

            val nombreInicial =
                perfilBinding.edtNombrePerfil.text
                    .toString()

            val correoInicial =
                perfilBinding.edtCorreoPerfil.text
                    .toString()

            val telefonoInicial =
                perfilBinding.edtTelefonoPerfil.text
                    .toString()

            perfilBinding.edtNombrePerfil.isEnabled = false
            perfilBinding.edtCorreoPerfil.isEnabled = false
            perfilBinding.edtTelefonoPerfil.isEnabled = false

            perfilBinding.btnGuardarPerfil.visibility =
                View.GONE

            fun revisarCambios() {

                val nombreActual =
                    perfilBinding.edtNombrePerfil.text
                        .toString()

                val correoActual =
                    perfilBinding.edtCorreoPerfil.text
                        .toString()

                val telefonoActual =
                    perfilBinding.edtTelefonoPerfil.text
                        .toString()

                val hayCambios =
                    nombreActual != nombreInicial ||
                            correoActual != correoInicial ||
                            telefonoActual != telefonoInicial

                perfilBinding.btnGuardarPerfil.visibility =
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
                    ) {
                    }

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
                    ) {
                    }
                }

            perfilBinding.edtNombrePerfil
                .addTextChangedListener(textWatcher)

            perfilBinding.edtCorreoPerfil
                .addTextChangedListener(textWatcher)

            perfilBinding.edtTelefonoPerfil
                .addTextChangedListener(textWatcher)

            perfilBinding
                .btnCerrarPerfil
                .setOnClickListener {
                    mostrarConfiguracion()
                }

            perfilBinding
                .btnEditarNombre
                .setOnClickListener {

                    perfilBinding.edtNombrePerfil.isEnabled = true
                    perfilBinding.edtNombrePerfil.requestFocus()

                    perfilBinding.edtNombrePerfil.setSelection(
                        perfilBinding.edtNombrePerfil.text.length
                    )
                }

            perfilBinding
                .btnEditarCorreo
                .setOnClickListener {

                    perfilBinding.edtCorreoPerfil.isEnabled = true
                    perfilBinding.edtCorreoPerfil.requestFocus()

                    perfilBinding.edtCorreoPerfil.setSelection(
                        perfilBinding.edtCorreoPerfil.text.length
                    )
                }

            perfilBinding
                .btnEditarTelefono
                .setOnClickListener {

                    perfilBinding.edtTelefonoPerfil.isEnabled = true
                    perfilBinding.edtTelefonoPerfil.requestFocus()

                    perfilBinding.edtTelefonoPerfil.setSelection(
                        perfilBinding.edtTelefonoPerfil.text.length
                    )
                }

            perfilBinding
                .btnGuardarPerfil
                .setOnClickListener {

                    val nuevoNombre =
                        perfilBinding.edtNombrePerfil.text
                            .toString()
                            .trim()

                    val nuevoCorreo =
                        perfilBinding.edtCorreoPerfil.text
                            .toString()
                            .trim()

                    val nuevoTelefono =
                        perfilBinding.edtTelefonoPerfil.text
                            .toString()
                            .trim()

                    if (nuevoNombre.isEmpty()) {

                        perfilBinding.edtNombrePerfil.error =
                            "Ingresa tu nombre"

                        return@setOnClickListener
                    }

                    if (
                        nuevoCorreo.isEmpty() ||
                        !android.util.Patterns.EMAIL_ADDRESS
                            .matcher(nuevoCorreo)
                            .matches()
                    ) {

                        perfilBinding.edtCorreoPerfil.error =
                            "Ingresa un correo válido"

                        return@setOnClickListener
                    }

                    if (nuevoTelefono.isEmpty()) {

                        perfilBinding.edtTelefonoPerfil.error =
                            "Ingresa tu teléfono"

                        return@setOnClickListener
                    }

                    perfilBinding.edtNombrePerfil.isEnabled = false
                    perfilBinding.edtCorreoPerfil.isEnabled = false
                    perfilBinding.edtTelefonoPerfil.isEnabled = false

                    perfilBinding.btnGuardarPerfil.visibility =
                        View.GONE
                }
        }


        // =========================================================
        // SPINNER BITÁCORA
        // =========================================================

        private fun configurarSpinnerBitacora(
            spinner: android.widget.Spinner
        ) {

            val adapter =
                ArrayAdapter(
                    this,
                    android.R.layout.simple_spinner_item,
                    granjas
                )

            adapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
            )

            spinner.adapter = adapter

            val posicion =
                granjas.indexOf(granjaSeleccionada)

            if (posicion >= 0) {
                spinner.setSelection(posicion)
            }

            spinner.onItemSelectedListener =
                object : AdapterView.OnItemSelectedListener {

                    override fun onItemSelected(
                        parent: AdapterView<*>?,
                        view: View?,
                        position: Int,
                        id: Long
                    ) {

                        if (
                            position >= 0 &&
                            position < granjas.size
                        ) {

                            granjaSeleccionada =
                                granjas[position]
                        }
                    }

                    override fun onNothingSelected(
                        parent: AdapterView<*>?
                    ) {
                    }
                }
        }


        // =========================================================
        // DIALOG GESTIÓN GALPÓN
        // =========================================================

        private fun mostrarDialogGestionGalpon() {

            val dialog = Dialog(this)

            val binding =
                R01RegistrarGalponBinding
                    .inflate(layoutInflater)

            dialog.setContentView(binding.root)

            dialog.window?.setBackgroundDrawableResource(
                android.R.color.transparent
            )

            dialog.show()

            dialog.window?.setLayout(
                (resources.displayMetrics.widthPixels * 0.90)
                    .toInt(),
                WindowManager.LayoutParams.WRAP_CONTENT
            )

            ArrayAdapter.createFromResource(
                this,
                R.array.marcas_alimento,
                android.R.layout.simple_spinner_item
            ).also { adapter ->

                adapter.setDropDownViewResource(
                    android.R.layout.simple_spinner_dropdown_item
                )

                binding.spinnerMarcaAlimento.adapter =
                    adapter
            }

            ArrayAdapter.createFromResource(
                this,
                R.array.lineas_alimento,
                android.R.layout.simple_spinner_item
            ).also { adapter ->

                adapter.setDropDownViewResource(
                    android.R.layout.simple_spinner_dropdown_item
                )

                binding.spinnerLineas.adapter =
                    adapter
            }

            binding.btnCancelarGalpon.setOnClickListener {
                dialog.dismiss()
            }

            binding.btnCrearLote.setOnClickListener {

                val nombre =
                    binding.edtNombreGalpon.text
                        .toString()
                        .trim()

                val cantidad =
                    binding.edtCantidadPollos.text
                        .toString()
                        .trim()

                val alimento =
                    binding.spinnerMarcaAlimento
                        .selectedItem
                        ?.toString()
                        ?: ""

                val linea =
                    binding.spinnerLineas
                        .selectedItem
                        ?.toString()
                        ?: ""

                dialog.dismiss()

                mostrarDialogDetalles(
                    nombre,
                    cantidad,
                    alimento,
                    linea
                )
            }
        }


        // =========================================================
        // DIALOG DETALLES GALPÓN
        // =========================================================

        private fun mostrarDialogDetalles(
            nombre: String,
            cantidad: String,
            alimento: String,
            linea: String
        ) {

            val dialog = Dialog(this)

            val binding =
                R02DetallesGalponBinding
                    .inflate(layoutInflater)

            dialog.setContentView(binding.root)

            dialog.window?.setBackgroundDrawableResource(
                android.R.color.transparent
            )

            dialog.show()

            dialog.window?.setLayout(
                (resources.displayMetrics.widthPixels * 0.92)
                    .toInt(),
                WindowManager.LayoutParams.WRAP_CONTENT
            )

            binding.txtDetalleNombre.text =
                if (nombre.isNotBlank()) {
                    nombre
                } else {
                    "Detalles del galpón"
                }

            binding.txtSubtituloDetalles.text =
                "Galpón creado · lote recién creado"

            binding.txtDetallePollos.text =
                "Pollos: ${
                    if (cantidad.isNotBlank()) {
                        cantidad
                    } else {
                        "0"
                    }
                }"

            binding.txtDetalleAlimento.text =
                "Alimento: $alimento"

            binding.txtDetalleLineas.text =
                "Líneas: $linea"

            binding.btnCerrarDetalles.setOnClickListener {
                dialog.dismiss()
            }

            binding.btnAtrasDetalles.setOnClickListener {

                dialog.dismiss()

                mostrarDialogGestionGalpon()
            }
        }


        // =========================================================
        // DIALOG NUEVO INSUMO
        // =========================================================

        private fun mostrarDialogNuevoInsumo() {

            val dialog = Dialog(this)

            val binding =
                R03NuevoInsumoBinding
                    .inflate(layoutInflater)

            dialog.setContentView(binding.root)

            dialog.window?.setBackgroundDrawableResource(
                android.R.color.transparent
            )

            dialog.show()

            dialog.window?.setLayout(
                (resources.displayMetrics.widthPixels * 0.90)
                    .toInt(),
                WindowManager.LayoutParams.WRAP_CONTENT
            )

            val categorias =
                resources.getStringArray(
                    R.array.categorias_insumo
                )

            val adapterCategorias =
                ArrayAdapter(
                    this,
                    android.R.layout.simple_spinner_item,
                    categorias
                )

            adapterCategorias.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
            )

            binding.spinnerCategoria.adapter =
                adapterCategorias

            val proveedores = arrayOf(
                "Seleccionar proveedor",
                "Proveedor 1",
                "Proveedor 2",
                "Proveedor 3"
            )

            val adapterProveedores =
                ArrayAdapter(
                    this,
                    android.R.layout.simple_spinner_item,
                    proveedores
                )

            adapterProveedores.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
            )

            binding.spinnerProveedor.adapter =
                adapterProveedores

            fun configurarUnidades(
                categoria: String
            ) {

                val unidades: Array<String> =
                    when (categoria) {

                        "Alimento" ->
                            resources.getStringArray(
                                R.array.unidades_alimento
                            )

                        "Medicamento" ->
                            resources.getStringArray(
                                R.array.unidades_medicamento
                            )

                        "Otro" ->
                            arrayOf(
                                "Seleccionar unidad"
                            )

                        else ->
                            arrayOf(
                                "Seleccionar unidad"
                            )
                    }

                val adapterUnidades =
                    ArrayAdapter(
                        this,
                        android.R.layout.simple_spinner_item,
                        unidades
                    )

                adapterUnidades.setDropDownViewResource(
                    android.R.layout.simple_spinner_dropdown_item
                )

                binding.spinnerUnidad.adapter =
                    adapterUnidades
            }

            configurarUnidades(
                "Seleccionar categoría"
            )

            binding.spinnerCategoria
                .onItemSelectedListener =
                object : AdapterView.OnItemSelectedListener {

                    override fun onItemSelected(
                        parent: AdapterView<*>?,
                        view: View?,
                        position: Int,
                        id: Long
                    ) {

                        if (
                            position >= 0 &&
                            position < categorias.size
                        ) {

                            configurarUnidades(
                                categorias[position]
                            )
                        }
                    }

                    override fun onNothingSelected(
                        parent: AdapterView<*>?
                    ) {
                    }
                }

            binding.btnCancelarInsumo.setOnClickListener {
                dialog.dismiss()
            }

            binding.btnAgregarInsumo.setOnClickListener {

                val nombre =
                    binding.edtNombreInsumo.text
                        .toString()
                        .trim()

                val cantidad =
                    binding.edtCantidadInsumo.text
                        .toString()
                        .trim()

                val categoria =
                    binding.spinnerCategoria
                        .selectedItem
                        ?.toString()
                        ?: ""

                val unidad =
                    binding.spinnerUnidad
                        .selectedItem
                        ?.toString()
                        ?: ""

                val proveedor =
                    binding.spinnerProveedor
                        .selectedItem
                        ?.toString()
                        ?: ""

                if (nombre.isEmpty()) {

                    binding.edtNombreInsumo.error =
                        "Ingresa el nombre del insumo"

                    return@setOnClickListener
                }

                if (
                    categoria.isEmpty() ||
                    categoria == "Seleccionar categoría"
                ) {

                    return@setOnClickListener
                }

                if (cantidad.isEmpty()) {

                    binding.edtCantidadInsumo.error =
                        "Ingresa la cantidad"

                    return@setOnClickListener
                }

                if (
                    unidad.isEmpty() ||
                    unidad == "Seleccionar unidad"
                ) {

                    return@setOnClickListener
                }

                if (
                    proveedor.isEmpty() ||
                    proveedor == "Seleccionar proveedor"
                ) {

                    return@setOnClickListener
                }

                dialog.dismiss()
            }
        }


        // =========================================================
        // DIALOG REGISTRAR EVENTO MORTALIDAD
        // =========================================================

        private fun mostrarDialogRegistrarEvento() {

            val dialog = Dialog(this)

            val binding =
                R04RegistrarEventoMortalidadBinding
                    .inflate(layoutInflater)

            dialog.setContentView(binding.root)

            dialog.window?.setBackgroundDrawableResource(
                android.R.color.transparent
            )

            dialog.show()

            dialog.window?.setLayout(
                (resources.displayMetrics.widthPixels * 0.92)
                    .toInt(),
                WindowManager.LayoutParams.WRAP_CONTENT
            )

            // =====================================================
            // EVENTO SELECCIONADO
            // =====================================================

            var eventoSeleccionado = "Murió"


            // =====================================================
            // COLORES
            // =====================================================

            val rojoSeleccionado =
                Color.parseColor("#E53935")

            val grisNoSeleccionado =
                Color.parseColor("#66736D")

            val fondoNormal =
                Color.parseColor("#F2F8F6")

            val bordeNormal =
                Color.parseColor("#D6DED9")


            // =====================================================
            // ACTUALIZAR BOTONES
            // =====================================================

            fun actualizarBotonesEvento() {

                val fondoSeleccionado =
                    Color.parseColor("#FDE8E8")

                // -----------------------------------------------
                // MURIÓ
                // -----------------------------------------------

                if (eventoSeleccionado == "Murió") {

                    binding.btnEventoMurio.backgroundTintList =
                        ColorStateList.valueOf(
                            fondoSeleccionado
                        )

                    binding.btnEventoMurio.strokeColor =
                        ColorStateList.valueOf(
                            rojoSeleccionado
                        )

                    binding.btnEventoMurio.setTextColor(
                        rojoSeleccionado
                    )


                    // -------------------------------------------
                    // ENFERMO NORMAL
                    // -------------------------------------------

                    binding.btnEventoEnfermo.backgroundTintList =
                        ColorStateList.valueOf(
                            fondoNormal
                        )

                    binding.btnEventoEnfermo.strokeColor =
                        ColorStateList.valueOf(
                            bordeNormal
                        )

                    binding.btnEventoEnfermo.setTextColor(
                        grisNoSeleccionado
                    )

                } else {

                    // -----------------------------------------------
                    // ENFERMO
                    // -----------------------------------------------

                    binding.btnEventoEnfermo.backgroundTintList =
                        ColorStateList.valueOf(
                            fondoSeleccionado
                        )

                    binding.btnEventoEnfermo.strokeColor =
                        ColorStateList.valueOf(
                            rojoSeleccionado
                        )

                    binding.btnEventoEnfermo.setTextColor(
                        rojoSeleccionado
                    )


                    // -------------------------------------------
                    // MURIÓ NORMAL
                    // -------------------------------------------

                    binding.btnEventoMurio.backgroundTintList =
                        ColorStateList.valueOf(
                            fondoNormal
                        )

                    binding.btnEventoMurio.strokeColor =
                        ColorStateList.valueOf(
                            bordeNormal
                        )

                    binding.btnEventoMurio.setTextColor(
                        grisNoSeleccionado
                    )
                }
            }


            // =====================================================
            // CONFIGURAR CAUSAS
            // =====================================================

            fun configurarCausas(
                evento: String
            ) {

                val causas: Array<String> =
                    when (evento) {

                        "Murió" ->
                            resources.getStringArray(
                                R.array.causas_muerte
                            )

                        "Enfermo" ->
                            resources.getStringArray(
                                R.array.causas_enfermedad
                            )

                        else ->
                            resources.getStringArray(
                                R.array.causas_muerte
                            )
                    }

                val adapterCausas =
                    ArrayAdapter(
                        this,
                        android.R.layout.simple_spinner_item,
                        causas
                    )

                adapterCausas.setDropDownViewResource(
                    android.R.layout.simple_spinner_dropdown_item
                )

                binding.spinnerCausa.adapter =
                    adapterCausas
            }


            // =====================================================
            // ESTADO INICIAL
            // =====================================================

            configurarCausas(
                eventoSeleccionado
            )

            actualizarBotonesEvento()


            // =====================================================
            // BOTÓN MURIÓ
            // =====================================================

            binding.btnEventoMurio.setOnClickListener {

                eventoSeleccionado = "Murió"

                actualizarBotonesEvento()

                configurarCausas(
                    eventoSeleccionado
                )
            }


            // =====================================================
            // BOTÓN ENFERMO
            // =====================================================

            binding.btnEventoEnfermo.setOnClickListener {

                eventoSeleccionado = "Enfermo"

                actualizarBotonesEvento()

                configurarCausas(
                    eventoSeleccionado
                )
            }


            // =====================================================
            // FECHA
            // =====================================================

            binding.edtFecha.setOnClickListener {

                val calendario =
                    Calendar.getInstance()

                DatePickerDialog(
                    this,
                    { _, year, month, day ->

                        val fecha =
                            String.format(
                                "%02d/%02d/%04d",
                                day,
                                month + 1,
                                year
                            )

                        binding.edtFecha.setText(
                            fecha
                        )
                    },
                    calendario.get(Calendar.YEAR),
                    calendario.get(Calendar.MONTH),
                    calendario.get(Calendar.DAY_OF_MONTH)
                ).show()
            }


            // =====================================================
            // ZONAS
            // =====================================================

            val zonas = listOf(
                binding.btnZonaNorte,
                binding.btnZonaSur,
                binding.btnZonaEste,
                binding.btnZonaOeste
            )

            zonas.forEach { zona ->

                zona.setOnClickListener {

                    zonas.forEach { otraZona ->

                        otraZona.backgroundTintList =
                            ColorStateList.valueOf(
                                Color.WHITE
                            )

                        otraZona.strokeColor =
                            ColorStateList.valueOf(
                                bordeNormal
                            )

                        otraZona.setTextColor(
                            grisNoSeleccionado
                        )
                    }

                    zona.backgroundTintList =
                        ColorStateList.valueOf(
                            Color.parseColor("#2E8B57")
                        )

                    zona.strokeColor =
                        ColorStateList.valueOf(
                            Color.parseColor("#2E8B57")
                        )

                    zona.setTextColor(
                        Color.WHITE
                    )
                }
            }


            // =====================================================
            // ADJUNTAR FOTO
            // =====================================================

            binding.btnAdjuntarFoto.setOnClickListener {
                // Pendiente conectar cámara / galería.
            }


            // =====================================================
            // CANCELAR
            // =====================================================

            binding.btnCancelarEvento.setOnClickListener {
                dialog.dismiss()
            }


            // =====================================================
            // GUARDAR
            // =====================================================

            binding.btnGuardarEvento.setOnClickListener {

                val causa =
                    binding.spinnerCausa
                        .selectedItem
                        ?.toString()
                        ?: ""

                if (causa.isEmpty()) {
                    return@setOnClickListener
                }

                dialog.dismiss()
            }
        }


        // =========================================================
        // ACTUALIZAR TEMPERATURA
        // =========================================================

        private fun actualizarTemperatura(
            valor: Float
        ) {

            sensoresBinding.arcTemperatura
                .setTemperature(valor)

            sensoresBinding.txtTemperatura.text =
                "${valor.toInt()}°"
        }
    }