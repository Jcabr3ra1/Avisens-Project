package com.project.avisensandroid.ui.fragments


import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.graphics.Typeface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import kotlin.math.roundToInt
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
import com.project.avisensandroid.model.GranjaResponse
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

        if (operarios.isEmpty()) {
            val emptyCard = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
                setPadding(dp(24), dp(28), dp(24), dp(28))
                background = GradientDrawable().apply {
                    setColor(Color.WHITE)
                    cornerRadius = dp(18).toFloat()
                    setStroke(dp(1), Color.parseColor("#DDE8E2"))
                }
            }

            val icon = TextView(requireContext()).apply {
                text = "👥"
                textSize = 30f
                gravity = android.view.Gravity.CENTER
            }
            emptyCard.addView(icon, LinearLayout.LayoutParams(-1, dp(44)))

            val title = TextView(requireContext()).apply {
                text = "Aún no tienes operarios"
                textSize = 16f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.parseColor("#1F5C42"))
                gravity = android.view.Gravity.CENTER
            }
            emptyCard.addView(title, LinearLayout.LayoutParams(-1, -2))

            val message = TextView(requireContext()).apply {
                text = "Crea un operario para comenzar a asignarle granjas."
                textSize = 13f
                setTextColor(Color.parseColor("#78847E"))
                gravity = android.view.Gravity.CENTER
                setPadding(0, dp(5), 0, 0)
            }
            emptyCard.addView(message, LinearLayout.LayoutParams(-1, -2))

            containerOperarios.addView(emptyCard)
            return
        }

        operarios.forEach { usuario ->
            val card = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(18), dp(18), dp(18), dp(16))
                background = resources.getDrawable(R.drawable.bg_card_operario, null)
            }

            // Encabezado: avatar + identidad + estado
            val header = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
            }

            val avatar = TextView(requireContext()).apply {
                text = iniciales(usuario.nombre_completo)
                textSize = 15f
                typeface = Typeface.DEFAULT_BOLD
                gravity = android.view.Gravity.CENTER
                setTextColor(Color.WHITE)
                background = GradientDrawable().apply {
                    setColor(Color.parseColor("#2F8B5E"))
                    shape = GradientDrawable.OVAL
                }
            }
            header.addView(avatar, LinearLayout.LayoutParams(dp(48), dp(48)))

            val identity = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(12), 0, dp(8), 0)
            }
            val name = TextView(requireContext()).apply {
                text = usuario.nombre_completo
                textSize = 17f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.parseColor("#183C2E"))
                maxLines = 2
            }
            identity.addView(name, LinearLayout.LayoutParams(-1, -2))

            val role = TextView(requireContext()).apply {
                text = "Operario"
                textSize = 11f
                setTextColor(Color.parseColor("#2F8B5E"))
                setPadding(0, dp(3), 0, 0)
            }
            identity.addView(role)
            header.addView(identity, LinearLayout.LayoutParams(0, -2, 1f))

            val status = TextView(requireContext()).apply {
                text = if (usuario.activo) "Activo" else "Inactivo"
                textSize = 11f
                typeface = Typeface.DEFAULT_BOLD
                gravity = android.view.Gravity.CENTER
                setTextColor(
                    Color.parseColor(if (usuario.activo) "#28744D" else "#A34A4A")
                )
                setPadding(dp(10), dp(6), dp(10), dp(6))
                background = GradientDrawable().apply {
                    setColor(Color.parseColor(if (usuario.activo) "#E8F5ED" else "#FBECEC"))
                    cornerRadius = dp(20).toFloat()
                }
            }
            header.addView(status, LinearLayout.LayoutParams(-2, dp(30)))
            card.addView(header)

            // Datos principales
            val info = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(60), dp(12), 0, 0)
            }
            info.addView(infoRow("✉", usuario.email))
            info.addView(infoRow("ID", "Cédula: ${usuario.cedula}"))
            info.addView(infoRow("☎", "${usuario.telefono ?: "Teléfono no registrado"}"))
            card.addView(info)

            // Separador
            card.addView(View(requireContext()).apply {
                setBackgroundColor(Color.parseColor("#E7EEE9"))
            }, LinearLayout.LayoutParams(-1, dp(1)).apply {
                topMargin = dp(16)
                bottomMargin = dp(12)
            })

            val assignmentHeader = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
            }
            val assignmentTitle = TextView(requireContext()).apply {
                text = "Granjas asignadas"
                textSize = 14f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.parseColor("#1F5C42"))
            }
            assignmentHeader.addView(assignmentTitle, LinearLayout.LayoutParams(0, -2, 1f))
            val assignButton = com.google.android.material.button.MaterialButton(
                requireContext()
            ).apply {
                text = "＋ Asignar"
                setAllCaps(false)
                textSize = 11f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.parseColor("#2F8B5E"))
                setPadding(dp(8), 0, dp(8), 0)
                minWidth = 0
                minimumWidth = 0
                minHeight = 0
                minimumHeight = 0
                background = GradientDrawable().apply {
                    setColor(Color.TRANSPARENT)
                    cornerRadius = dp(10).toFloat()
                    setStroke(dp(1), Color.parseColor("#2F8B5E"))
                }
                setOnClickListener { mostrarDialogAsignarGranja(usuario.id) }
            }
            assignmentHeader.addView(assignButton, LinearLayout.LayoutParams(dp(96), dp(36)))
            card.addView(assignmentHeader)

            val assignments = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(0, dp(8), 0, 0)
            }
            card.addView(assignments)
            cargarAsignaciones(usuario.id, assignments)

            val params = LinearLayout.LayoutParams(-1, -2).apply {
                bottomMargin = dp(14)
            }
            containerOperarios.addView(card, params)
        }
    }

    private fun infoRow(icon: String, value: String): TextView =
        TextView(requireContext()).apply {
            text = "$icon   $value"
            textSize = 12.5f
            setTextColor(Color.parseColor("#68756E"))
            setPadding(0, dp(3), 0, dp(3))
            maxLines = 2
        }

    private fun iniciales(nombre: String): String {
        val partes = nombre.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
        return when {
            partes.size >= 2 -> "${partes[0].first()}${partes[1].first()}".uppercase()
            partes.size == 1 -> partes[0].take(2).uppercase()
            else -> "OP"
        }
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).roundToInt()

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
                                "Sin granjas asignadas."

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
                    // Agrupar los galpones asignados por granja,
                    // para que el propietario vea/gestione la
                    // asignación a nivel de granja (no de galpón).
                    // --------------------------------------------

                    val asignacionesPorGranja =
                        asignaciones.groupBy {
                            it.galpon.granja.id
                        }

                    asignacionesPorGranja.values.forEach { grupo ->

                        agregarAsignacionGranja(
                            usuarioId,
                            grupo,
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
    // AGREGAR ASIGNACIÓN DE GRANJA A LA TARJETA
    // ============================================================

    private fun agregarAsignacionGranja(
        usuarioId: Int,
        asignacionesDeGranja: List<UsuarioGalponResponse>,
        contenedor: LinearLayout
    ) {

        val granja =
            asignacionesDeGranja.first().galpon.granja

        val galponIds =
            asignacionesDeGranja.map { it.galpon_id }

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
        // Texto de la granja
        // --------------------------------------------------------

        val texto =
            TextView(
                requireContext()
            ).apply {

                text =
                    "${granja.nombre} " +
                            "(${galponIds.size} galpón${if (galponIds.size == 1) "" else "es"})"

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
            com.google.android.material.button.MaterialButton(
                requireContext()
            ).apply {

                text =
                    "Quitar"

                setAllCaps(false)
                textSize = 11f
                typeface = Typeface.DEFAULT_BOLD

                setTextColor(
                    Color.parseColor(
                        "#C94A4A"
                    )
                )

                setPadding(
                    dp(8),
                    0,
                    dp(8),
                    0
                )

                minWidth = 0
                minimumWidth = 0
                minHeight = 0
                minimumHeight = 0

                background = GradientDrawable().apply {
                    setColor(Color.TRANSPARENT)
                    cornerRadius = dp(10).toFloat()
                    setStroke(
                        dp(1),
                        Color.parseColor(
                            "#C94A4A"
                        )
                    )
                }

                setOnClickListener {

                    desasignarGranja(
                        usuarioId,
                        granja.nombre,
                        galponIds
                    )
                }
            }

        fila.addView(
            quitar,
            LinearLayout.LayoutParams(
                dp(96),
                dp(36)
            )
        )

        contenedor.addView(
            fila
        )
    }

    // ============================================================
    // DIALOG PARA ASIGNAR GRANJA
    // ============================================================

    private fun mostrarDialogAsignarGranja(
        usuarioId: Int
    ) {

        viewLifecycleOwner.lifecycleScope.launch {

            try {

                val response =
                    RetrofitClient.api.listarGranjas(
                        page = 1,
                        limit = 100
                    )

                if (!response.isSuccessful) {

                    mostrarError(
                        "No se pudieron cargar las granjas. " +
                                "Código: ${response.code()}"
                    )

                    return@launch
                }

                val granjas =
                    response.body()
                        ?.data
                        .orEmpty()
                        .filter {
                            it.activa
                        }

                if (granjas.isEmpty()) {

                    mostrarError(
                        "No hay granjas disponibles para asignar."
                    )

                    return@launch
                }

                val nombres =
                    granjas
                        .map { it.nombre }
                        .toTypedArray()

                AlertDialog.Builder(
                    requireContext()
                )
                    .setTitle(
                        "Asignar granja"
                    )
                    .setSingleChoiceItems(
                        nombres,
                        -1
                    ) { dialog, which ->

                        asignarGranja(
                            usuarioId,
                            granjas[which]
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
                    "Error al cargar granjas: " +
                            (e.message
                                ?: "sin detalle")
                )
            }
        }
    }

    // ============================================================
    // ASIGNAR GRANJA (asigna todos sus galpones activos)
    // ============================================================

    private fun asignarGranja(
        usuarioId: Int,
        granja: GranjaResponse
    ) {

        viewLifecycleOwner.lifecycleScope.launch {

            try {

                val responseGalpones =
                    RetrofitClient.api.listarGalpones(
                        page = 1,
                        limit = 100
                    )

                if (!responseGalpones.isSuccessful) {

                    mostrarError(
                        "No se pudieron cargar los galpones de la granja. " +
                                "Código: ${responseGalpones.code()}"
                    )

                    return@launch
                }

                val galponesDeGranja =
                    responseGalpones.body()
                        ?.data
                        .orEmpty()
                        .filter {
                            it.activo && it.granja.id == granja.id
                        }

                if (galponesDeGranja.isEmpty()) {

                    mostrarError(
                        "\"${granja.nombre}\" todavía no tiene galpones activos. " +
                                "Crea un galpón ahí antes de asignarla."
                    )

                    return@launch
                }

                var fallos = 0

                galponesDeGranja.forEach { galpon ->

                    val response =
                        RetrofitClient.api.asignarGalpon(
                            usuarioId,
                            AsignarGalponRequest(
                                galpon_id = galpon.id
                            )
                        )

                    if (!response.isSuccessful) {
                        fallos++
                    }
                }

                if (fallos == 0) {

                    Toast.makeText(
                        requireContext(),
                        "Granja asignada correctamente " +
                                "(${galponesDeGranja.size} galpón${if (galponesDeGranja.size == 1) "" else "es"})",
                        Toast.LENGTH_SHORT
                    ).show()

                } else {

                    mostrarError(
                        "Se asignó la granja, pero $fallos galpón(es) fallaron."
                    )
                }

                cargarOperarios()

            } catch (e: Exception) {

                mostrarError(
                    "Error al asignar la granja: " +
                            (e.message
                                ?: "sin detalle")
                )
            }
        }
    }

    // ============================================================
    // DESASIGNAR GRANJA (quita todos sus galpones asignados)
    // ============================================================

    private fun desasignarGranja(
        usuarioId: Int,
        nombreGranja: String,
        galponIds: List<Int>
    ) {

        AlertDialog.Builder(
            requireContext()
        )
            .setTitle(
                "Quitar asignación"
            )
            .setMessage(
                "¿Quieres quitar \"$nombreGranja\" del operario? " +
                        "Se le quitarán sus ${galponIds.size} galpón${if (galponIds.size == 1) "" else "es"} asignados."
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

                        var fallos = 0

                        galponIds.forEach { galponId ->

                            val response =
                                RetrofitClient.api
                                    .desasignarGalpon(
                                        usuarioId,
                                        galponId
                                    )

                            if (!response.isSuccessful) {
                                fallos++
                            }
                        }

                        if (fallos == 0) {

                            Toast.makeText(
                                requireContext(),
                                "Granja retirada",
                                Toast.LENGTH_SHORT
                            ).show()

                        } else {

                            mostrarError(
                                "Se retiró la granja, pero $fallos galpón(es) fallaron."
                            )
                        }

                        cargarOperarios()

                    } catch (e: Exception) {

                        mostrarError(
                            "Error al quitar la asignación: " +
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