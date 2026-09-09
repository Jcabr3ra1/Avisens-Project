package com.project.avisensandroid.ui.fragments

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.google.android.material.textfield.TextInputEditText
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.model.AsignarGalponRequest
import com.project.avisensandroid.model.CreateUsuarioRequest
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.UsuarioGalponResponse
import com.project.avisensandroid.model.UsuarioGestionResponse
import kotlinx.coroutines.launch

class GestionOperariosFragment : BaseBottomNavFragment() {

    private lateinit var containerOperarios: LinearLayout

    private var rolOperarioId: Int? = null

    // ============================================================
    // CREAR VISTA
    // ============================================================

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {

        return inflater.inflate(
            R.layout.fragment_gestion_operarios,
            container,
            false
        )
    }

    // ============================================================
    // VISTA CREADA
    // ============================================================

    override fun onViewCreated(
        view: View,
        savedInstanceState: Bundle?
    ) {
        super.onViewCreated(
            view,
            savedInstanceState
        )

        configurarBottomNav(
            R.id.nav_usuarios
        )

        containerOperarios =
            view.findViewById(
                R.id.containerOperarios
            )

        // Botón Nuevo Operario
        view.findViewById<View>(
            R.id.btnNuevoOperario
        ).setOnClickListener {

            mostrarDialogCrearOperario()
        }

        cargarOperarios()
    }

    // ============================================================
    // CARGAR OPERARIOS
    // ============================================================

    private fun cargarOperarios() {

        viewLifecycleOwner.lifecycleScope.launch {

            try {

                // ------------------------------------------------
                // Obtener catálogo de roles
                // ------------------------------------------------

                val rolesResponse =
                    RetrofitClient.api.listarRolesUsuarios()

                if (rolesResponse.isSuccessful) {

                    rolOperarioId =
                        rolesResponse
                            .body()
                            .orEmpty()
                            .firstOrNull {

                                it.nombre.equals(
                                    "operario",
                                    ignoreCase = true
                                )
                            }
                            ?.id
                }

                // ------------------------------------------------
                // Obtener usuarios
                // ------------------------------------------------

                val response =
                    RetrofitClient.api.listarUsuarios(
                        page = 1,
                        limit = 100
                    )

                if (!response.isSuccessful) {

                    mostrarError(
                        "No se pudieron cargar los usuarios. " +
                                "Código: ${response.code()}"
                    )

                    return@launch
                }

                // ------------------------------------------------
                // Filtrar solamente Operarios
                // ------------------------------------------------

                val operarios =
                    response.body()
                        ?.data
                        .orEmpty()
                        .filter {

                            it.rol.nombre.equals(
                                "operario",
                                ignoreCase = true
                            )
                        }

                mostrarOperarios(
                    operarios
                )

            } catch (e: Exception) {

                mostrarError(
                    "Error al cargar operarios: " +
                            (e.message
                                ?: "sin detalle")
                )
            }
        }
    }

    // ============================================================
    // MOSTRAR OPERARIOS
    // ============================================================

    private fun mostrarOperarios(
        operarios: List<UsuarioGestionResponse>
    ) {

        containerOperarios.removeAllViews()

        // --------------------------------------------------------
        // Sin operarios
        // --------------------------------------------------------

        if (operarios.isEmpty()) {

            val mensaje =
                TextView(requireContext()).apply {

                    text =
                        "No hay operarios registrados " +
                                "en tu organización."

                    textSize = 15f

                    setTextColor(
                        Color.parseColor(
                            "#6F7A74"
                        )
                    )

                    setPadding(
                        0,
                        24,
                        0,
                        24
                    )
                }

            containerOperarios.addView(
                mensaje
            )

            return
        }

        // --------------------------------------------------------
        // Crear tarjeta por operario
        // --------------------------------------------------------

        operarios.forEach { usuario ->

            val card =
                LinearLayout(
                    requireContext()
                ).apply {

                    orientation =
                        LinearLayout.VERTICAL

                    setPadding(
                        20,
                        18,
                        20,
                        18
                    )

                    setBackgroundResource(
                        R.drawable.bg_card_simple
                    )
                }

            // ----------------------------------------------------
            // Nombre
            // ----------------------------------------------------

            val nombre =
                TextView(
                    requireContext()
                ).apply {

                    text =
                        usuario.nombre_completo

                    textSize = 18f

                    setTextColor(
                        Color.parseColor(
                            "#1A1A1A"
                        )
                    )

                    setTypeface(
                        null,
                        android.graphics.Typeface.BOLD
                    )
                }

            card.addView(
                nombre
            )

            // ----------------------------------------------------
            // Información
            // ----------------------------------------------------

            val informacion =
                TextView(
                    requireContext()
                ).apply {

                    text =
                        buildString {

                            append(
                                usuario.email
                            )

                            append(
                                "\nCédula: "
                            )

                            append(
                                usuario.cedula
                            )

                            append(
                                "\nTeléfono: "
                            )

                            append(
                                usuario.telefono
                                    ?: "No registrado"
                            )

                            append(
                                "\nEstado: "
                            )

                            append(
                                if (usuario.activo)
                                    "Activo"
                                else
                                    "Inactivo"
                            )
                        }

                    textSize = 14f

                    setTextColor(
                        Color.parseColor(
                            "#6F7A74"
                        )
                    )

                    setPadding(
                        0,
                        8,
                        0,
                        0
                    )
                }

            card.addView(
                informacion
            )

            // ----------------------------------------------------
            // Título de asignaciones
            // ----------------------------------------------------

            val tituloAsignaciones =
                TextView(
                    requireContext()
                ).apply {

                    text =
                        "Asignaciones de galpón"

                    textSize = 14f

                    setTextColor(
                        Color.parseColor(
                            "#1F5C42"
                        )
                    )

                    setTypeface(
                        null,
                        android.graphics.Typeface.BOLD
                    )

                    setPadding(
                        0,
                        16,
                        0,
                        6
                    )
                }

            card.addView(
                tituloAsignaciones
            )

            // ----------------------------------------------------
            // Contenedor de asignaciones
            // ----------------------------------------------------

            val asignaciones =
                LinearLayout(
                    requireContext()
                ).apply {

                    orientation =
                        LinearLayout.VERTICAL
                }

            card.addView(
                asignaciones
            )

            cargarAsignaciones(
                usuario.id,
                asignaciones
            )

            // ----------------------------------------------------
            // Asignar galpón
            // ----------------------------------------------------

            val btnAsignar =
                TextView(
                    requireContext()
                ).apply {

                    text =
                        "＋ Asignar galpón"

                    textSize = 14f

                    setTextColor(
                        Color.parseColor(
                            "#2F8B5E"
                        )
                    )

                    setTypeface(
                        null,
                        android.graphics.Typeface.BOLD
                    )

                    setPadding(
                        0,
                        16,
                        0,
                        6
                    )

                    setOnClickListener {

                        mostrarDialogAsignarGalpon(
                            usuario.id
                        )
                    }
                }

            card.addView(
                btnAsignar
            )

            // ----------------------------------------------------
            // Separación entre tarjetas
            // ----------------------------------------------------

            val params =
                LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {

                    bottomMargin = 14
                }

            containerOperarios.addView(
                card,
                params
            )
        }
    }

    // ============================================================
    // CARGAR ASIGNACIONES DE UN OPERARIO
    // ============================================================

    private fun cargarAsignaciones(
        usuarioId: Int,
        contenedor: LinearLayout
    ) {

        viewLifecycleOwner.lifecycleScope.launch {

            try {

                val response =
                    RetrofitClient.api
                        .listarGalponesAsignados(
                            usuarioId
                        )

                if (!response.isSuccessful) {

                    contenedor.addView(
                        TextView(
                            requireContext()
                        ).apply {

                            text =
                                "No se pudieron consultar " +
                                        "las asignaciones."

                            textSize = 12f

                            setTextColor(
                                Color.parseColor(
                                    "#9A9A9A"
                                )
                            )
                        }
                    )

                    return@launch
                }

                val asignaciones =
                    response.body()
                        ?.data
                        .orEmpty()
                        .filter {
                            it.activa
                        }

                contenedor.removeAllViews()

                // ------------------------------------------------
                // Sin asignaciones
                // ------------------------------------------------

                if (asignaciones.isEmpty()) {

                    contenedor.addView(
                        TextView(
                            requireContext()
                        ).apply {

                            text =
                                "Sin galpones asignados."

                            textSize = 13f

                            setTextColor(
                                Color.parseColor(
                                    "#9A9A9A"
                                )
                            )
                        }
                    )

                } else {

                    // --------------------------------------------
                    // Mostrar cada asignación
                    // --------------------------------------------

                    asignaciones.forEach {

                        agregarAsignacion(
                            usuarioId,
                            it,
                            contenedor
                        )
                    }
                }

            } catch (e: Exception) {

                contenedor.addView(
                    TextView(
                        requireContext()
                    ).apply {

                        text =
                            "Error al consultar asignaciones."

                        textSize = 12f

                        setTextColor(
                            Color.parseColor(
                                "#9A9A9A"
                            )
                        )
                    }
                )
            }
        }
    }

    // ============================================================
    // AGREGAR ASIGNACIÓN A LA TARJETA
    // ============================================================

    private fun agregarAsignacion(
        usuarioId: Int,
        asignacion: UsuarioGalponResponse,
        contenedor: LinearLayout
    ) {

        val fila =
            LinearLayout(
                requireContext()
            ).apply {

                orientation =
                    LinearLayout.HORIZONTAL

                gravity =
                    android.view.Gravity.CENTER_VERTICAL
            }

        // --------------------------------------------------------
        // Texto del galpón
        // --------------------------------------------------------

        val texto =
            TextView(
                requireContext()
            ).apply {

                text =
                    "${asignacion.galpon.codigo} - " +
                            "${asignacion.galpon.nombre} " +
                            "(${asignacion.galpon.granja.nombre})"

                textSize = 13f

                setTextColor(
                    Color.parseColor(
                        "#4F5A55"
                    )
                )

                layoutParams =
                    LinearLayout.LayoutParams(
                        0,
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        1f
                    )
            }

        fila.addView(
            texto
        )

        // --------------------------------------------------------
        // Quitar asignación
        // --------------------------------------------------------

        val quitar =
            TextView(
                requireContext()
            ).apply {

                text =
                    "Quitar"

                textSize = 12f

                setTextColor(
                    Color.parseColor(
                        "#C94A4A"
                    )
                )

                setPadding(
                    10,
                    8,
                    0,
                    8
                )

                setOnClickListener {

                    desasignar(
                        usuarioId,
                        asignacion.galpon_id
                    )
                }
            }

        fila.addView(
            quitar
        )

        contenedor.addView(
            fila
        )
    }

    // ============================================================
    // DIALOG PARA ASIGNAR GALPÓN
    // ============================================================

    private fun mostrarDialogAsignarGalpon(
        usuarioId: Int
    ) {

        viewLifecycleOwner.lifecycleScope.launch {

            try {

                val response =
                    RetrofitClient.api.listarGalpones(
                        page = 1,
                        limit = 100
                    )

                if (!response.isSuccessful) {

                    mostrarError(
                        "No se pudieron cargar los galpones. " +
                                "Código: ${response.code()}"
                    )

                    return@launch
                }

                val galpones =
                    response.body()
                        ?.data
                        .orEmpty()
                        .filter {
                            it.activo
                        }

                if (galpones.isEmpty()) {

                    mostrarError(
                        "No hay galpones disponibles para asignar."
                    )

                    return@launch
                }

                val nombres =
                    galpones
                        .map {

                            "${it.codigo} - " +
                                    "${it.nombre} " +
                                    "(${it.granja.nombre})"
                        }
                        .toTypedArray()

                AlertDialog.Builder(
                    requireContext()
                )
                    .setTitle(
                        "Asignar galpón"
                    )
                    .setSingleChoiceItems(
                        nombres,
                        -1
                    ) { dialog, which ->

                        asignar(
                            usuarioId,
                            galpones[which]
                        )

                        dialog.dismiss()
                    }
                    .setNegativeButton(
                        "Cancelar",
                        null
                    )
                    .show()

            } catch (e: Exception) {

                mostrarError(
                    "Error al cargar galpones: " +
                            (e.message
                                ?: "sin detalle")
                )
            }
        }
    }

    // ============================================================
    // ASIGNAR GALPÓN
    // ============================================================

    private fun asignar(
        usuarioId: Int,
        galpon: GalponResponse
    ) {

        viewLifecycleOwner.lifecycleScope.launch {

            try {

                val response =
                    RetrofitClient.api.asignarGalpon(
                        usuarioId,
                        AsignarGalponRequest(
                            galpon_id = galpon.id
                        )
                    )

                if (response.isSuccessful) {

                    Toast.makeText(
                        requireContext(),
                        "Galpón asignado correctamente",
                        Toast.LENGTH_SHORT
                    ).show()

                    cargarOperarios()

                } else {

                    mostrarError(
                        "No se pudo asignar el galpón. " +
                                "Código: ${response.code()}"
                    )
                }

            } catch (e: Exception) {

                mostrarError(
                    "Error al asignar galpón: " +
                            (e.message
                                ?: "sin detalle")
                )
            }
        }
    }

    // ============================================================
    // DESASIGNAR GALPÓN
    // ============================================================

    private fun desasignar(
        usuarioId: Int,
        galponId: Int
    ) {

        AlertDialog.Builder(
            requireContext()
        )
            .setTitle(
                "Quitar asignación"
            )
            .setMessage(
                "¿Quieres quitar este galpón del operario?"
            )
            .setNegativeButton(
                "Cancelar",
                null
            )
            .setPositiveButton(
                "Quitar"
            ) { _, _ ->

                viewLifecycleOwner.lifecycleScope.launch {

                    try {

                        val response =
                            RetrofitClient.api
                                .desasignarGalpon(
                                    usuarioId,
                                    galponId
                                )

                        if (response.isSuccessful) {

                            Toast.makeText(
                                requireContext(),
                                "Asignación retirada",
                                Toast.LENGTH_SHORT
                            ).show()

                            cargarOperarios()

                        } else {

                            mostrarError(
                                "No se pudo quitar la asignación. " +
                                        "Código: ${response.code()}"
                            )
                        }

                    } catch (e: Exception) {

                        mostrarError(
                            "Error al quitar asignación: " +
                                    (e.message
                                        ?: "sin detalle")
                        )
                    }
                }
            }
            .show()
    }

    // ============================================================
    // DIALOG CREAR OPERARIO
    // ============================================================

    private fun mostrarDialogCrearOperario() {

        // --------------------------------------------------------
        // Inflar nuestro XML personalizado
        // --------------------------------------------------------

        val dialogView =
            layoutInflater.inflate(
                R.layout.dialog_crear_operario,
                null
            )

        // --------------------------------------------------------
        // Referencias a los campos
        // --------------------------------------------------------

        val etNombre =
            dialogView.findViewById<TextInputEditText>(
                R.id.etNombreOperario
            )

        val etCedula =
            dialogView.findViewById<TextInputEditText>(
                R.id.etCedulaOperario
            )

        val etEmail =
            dialogView.findViewById<TextInputEditText>(
                R.id.etEmailOperario
            )

        val etTelefono =
            dialogView.findViewById<TextInputEditText>(
                R.id.etTelefonoOperario
            )

        val etPassword =
            dialogView.findViewById<TextInputEditText>(
                R.id.etPasswordOperario
            )

        val etConfirmarPassword =
            dialogView.findViewById<TextInputEditText>(
                R.id.etConfirmarPasswordOperario
            )

        // --------------------------------------------------------
        // Botones que AHORA están dentro del XML
        // --------------------------------------------------------

        val btnCancelar =
            dialogView.findViewById<View>(
                R.id.btnCancelarOperario
            )

        val btnCrear =
            dialogView.findViewById<View>(
                R.id.btnCrearOperario
            )

        // --------------------------------------------------------
        // Crear AlertDialog SIN setTitle()
        // SIN setPositiveButton()
        // SIN setNegativeButton()
        // --------------------------------------------------------

        val dialog =
            AlertDialog.Builder(
                requireContext()
            )
                .setView(
                    dialogView
                )
                .create()

        // --------------------------------------------------------
        // Mostrar diálogo
        // --------------------------------------------------------

        dialog.show()

        // --------------------------------------------------------
        // Fondo transparente
        // Necesario para conservar las esquinas redondeadas
        // del XML.
        // --------------------------------------------------------

        dialog.window?.setBackgroundDrawable(
            ColorDrawable(
                Color.TRANSPARENT
            )
        )

        // --------------------------------------------------------
        // Tamaño del diálogo
        // --------------------------------------------------------

        dialog.window?.setLayout(
            (
                    resources.displayMetrics.widthPixels * 0.90
                    ).toInt(),
            (
                    resources.displayMetrics.heightPixels * 0.82
                    ).toInt()
        )

        // --------------------------------------------------------
        // CANCELAR
        // --------------------------------------------------------

        btnCancelar.setOnClickListener {

            dialog.dismiss()
        }

        // --------------------------------------------------------
        // CREAR
        // --------------------------------------------------------

        btnCrear.setOnClickListener {

            // ----------------------------------------------------
            // Obtener valores
            // ----------------------------------------------------

            val nombre =
                etNombre.text
                    ?.toString()
                    ?.trim()
                    .orEmpty()

            val cedula =
                etCedula.text
                    ?.toString()
                    ?.trim()
                    .orEmpty()

            val email =
                etEmail.text
                    ?.toString()
                    ?.trim()
                    .orEmpty()

            val telefono =
                etTelefono.text
                    ?.toString()
                    ?.trim()
                    .orEmpty()
                    .ifBlank {
                        null
                    }

            val password =
                etPassword.text
                    ?.toString()
                    .orEmpty()

            val confirmarPassword =
                etConfirmarPassword.text
                    ?.toString()
                    .orEmpty()

            // ----------------------------------------------------
            // LIMPIAR ERRORES ANTERIORES
            // ----------------------------------------------------

            etNombre.error = null
            etCedula.error = null
            etEmail.error = null
            etPassword.error = null
            etConfirmarPassword.error = null

            // ----------------------------------------------------
            // VALIDACIONES
            // ----------------------------------------------------

            if (nombre.isBlank()) {

                etNombre.error =
                    "Ingresa el nombre completo"

                etNombre.requestFocus()

                return@setOnClickListener
            }

            if (cedula.isBlank()) {

                etCedula.error =
                    "Ingresa la cédula"

                etCedula.requestFocus()

                return@setOnClickListener
            }

            if (email.isBlank()) {

                etEmail.error =
                    "Ingresa el correo electrónico"

                etEmail.requestFocus()

                return@setOnClickListener
            }

            if (
                !android.util.Patterns
                    .EMAIL_ADDRESS
                    .matcher(email)
                    .matches()
            ) {

                etEmail.error =
                    "Ingresa un correo válido"

                etEmail.requestFocus()

                return@setOnClickListener
            }

            if (password.isBlank()) {

                etPassword.error =
                    "Ingresa una contraseña"

                etPassword.requestFocus()

                return@setOnClickListener
            }

            if (password.length < 8) {

                etPassword.error =
                    "La contraseña debe tener mínimo 8 caracteres"

                etPassword.requestFocus()

                return@setOnClickListener
            }

            if (confirmarPassword.isBlank()) {

                etConfirmarPassword.error =
                    "Confirma la contraseña"

                etConfirmarPassword.requestFocus()

                return@setOnClickListener
            }

            if (password != confirmarPassword) {

                etConfirmarPassword.error =
                    "Las contraseñas no coinciden"

                etConfirmarPassword.requestFocus()

                return@setOnClickListener
            }

            // ----------------------------------------------------
            // Verificar rol
            // ----------------------------------------------------

            val rolId =
                rolOperarioId

            if (rolId == null) {

                mostrarError(
                    "No se pudo obtener el rol Operario " +
                            "desde el servidor."
                )

                return@setOnClickListener
            }

            // ----------------------------------------------------
            // Desactivar botón mientras se envía
            // ----------------------------------------------------

            btnCrear.isEnabled = false

            btnCancelar.isEnabled = false

            // ----------------------------------------------------
            // Crear operario
            // ----------------------------------------------------

            crearOperario(
                dialog = dialog,
                botonCrear = btnCrear,
                botonCancelar = btnCancelar,
                nombre = nombre,
                cedula = cedula,
                email = email,
                telefono = telefono,
                password = password,
                rolId = rolId
            )
        }
    }

    // ============================================================
    // CREAR OPERARIO EN API
    // ============================================================

    private fun crearOperario(
        dialog: AlertDialog,
        botonCrear: View,
        botonCancelar: View,
        nombre: String,
        cedula: String,
        email: String,
        telefono: String?,
        password: String,
        rolId: Int
    ) {

        viewLifecycleOwner.lifecycleScope.launch {

            try {

                val response =
                    RetrofitClient.api.crearUsuario(

                        CreateUsuarioRequest(
                            nombre_completo = nombre,
                            cedula = cedula,
                            email = email,
                            password = password,
                            telefono = telefono,
                            rol_id = rolId
                        )
                    )

                if (response.isSuccessful) {

                    // ------------------------------------------------
                    // Cerrar diálogo
                    // ------------------------------------------------

                    dialog.dismiss()

                    Toast.makeText(
                        requireContext(),
                        "Operario creado correctamente",
                        Toast.LENGTH_SHORT
                    ).show()

                    // ------------------------------------------------
                    // Actualizar lista
                    // ------------------------------------------------

                    cargarOperarios()

                } else {

                    botonCrear.isEnabled = true
                    botonCancelar.isEnabled = true

                    mostrarError(
                        "No se pudo crear el operario. " +
                                "Código: ${response.code()}"
                    )
                }

            } catch (e: Exception) {

                botonCrear.isEnabled = true
                botonCancelar.isEnabled = true

                mostrarError(
                    "Error al crear el operario: " +
                            (e.message
                                ?: "sin detalle")
                )
            }
        }
    }

    // ============================================================
    // MOSTRAR ERROR
    // ============================================================

    private fun mostrarError(
        mensaje: String
    ) {

        if (!isAdded) {
            return
        }

        Toast.makeText(
            requireContext(),
            mensaje,
            Toast.LENGTH_LONG
        ).show()
    }
}