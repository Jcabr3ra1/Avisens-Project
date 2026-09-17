package com.project.avisensandroid.ui.fragments


import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import kotlin.math.roundToInt
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.google.android.material.textfield.TextInputEditText
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.model.ActualizarEstadoUsuarioRequest
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
            identity.addView(TextView(requireContext()).apply {
                text = usuario.nombre_completo
                textSize = 17f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.parseColor("#183C2E"))
                maxLines = 2
            })
            identity.addView(TextView(requireContext()).apply {
                text = "Operario"
                textSize = 11f
                setTextColor(Color.parseColor("#2F8B5E"))
                setPadding(0, dp(3), 0, 0)
            })
            header.addView(identity, LinearLayout.LayoutParams(0, -2, 1f))

            val status = TextView(requireContext()).apply {
                text = if (usuario.activo) "Activo" else "Inactivo"
                textSize = 11f
                typeface = Typeface.DEFAULT_BOLD
                gravity = android.view.Gravity.CENTER
                setTextColor(Color.parseColor(if (usuario.activo) "#28744D" else "#A34A4A"))
                setPadding(dp(10), dp(6), dp(10), dp(6))
                background = GradientDrawable().apply {
                    setColor(Color.parseColor(if (usuario.activo) "#E8F5ED" else "#FBECEC"))
                    cornerRadius = dp(20).toFloat()
                }
            }
            header.addView(status, LinearLayout.LayoutParams(-2, dp(30)))
            card.addView(header)

            val info = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(60), dp(12), 0, 0)
            }
            info.addView(infoRow("✉", usuario.email))
            info.addView(infoRow("ID", "Cédula: ${usuario.cedula}"))
            info.addView(infoRow("☎", usuario.telefono ?: "Teléfono no registrado"))
            card.addView(info)

            card.addView(View(requireContext()).apply {
                setBackgroundColor(Color.parseColor("#E7EEE9"))
            }, LinearLayout.LayoutParams(-1, dp(1)).apply {
                topMargin = dp(16)
                bottomMargin = dp(12)
            })

            val assignmentTitle = TextView(requireContext()).apply {
                text = "Granjas asignadas"
                textSize = 14f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.parseColor("#1F5C42"))
            }
            card.addView(assignmentTitle)

            val assignments = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(0, dp(7), 0, 0)
            }
            card.addView(assignments)
            cargarAsignaciones(usuario.id, assignments, false)

            val editButton = com.google.android.material.button.MaterialButton(requireContext()).apply {
                text = "✎  Editar"
                setAllCaps(false)
                textSize = 12f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.WHITE)
                minHeight = 0
                minimumHeight = 0
                minWidth = 0
                minimumWidth = 0
                setPadding(dp(10), 0, dp(10), 0)
                backgroundTintList = android.content.res.ColorStateList.valueOf(
                    Color.parseColor("#2F8B5E")
                )
                cornerRadius = dp(10)
                rippleColor = android.content.res.ColorStateList.valueOf(
                    Color.parseColor("#245F42")
                )
                setOnClickListener { mostrarDialogEditarOperario(usuario) }
            }
            card.addView(editButton, LinearLayout.LayoutParams(-1, dp(40)).apply {
                topMargin = dp(12)
            })

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
        contenedor: LinearLayout,
        mostrarQuitar: Boolean = true,
        onCambio: (() -> Unit)? = null,
        onQuitarPendiente: ((List<Int>) -> Unit)? = null
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
                            contenedor,
                            mostrarQuitar,
                            onCambio,
                            onQuitarPendiente
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
        contenedor: LinearLayout,
        mostrarQuitar: Boolean = true,
        onCambio: (() -> Unit)? = null,
        onQuitarPendiente: ((List<Int>) -> Unit)? = null
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
                        galponIds,
                        onSuccess = onCambio,
                        onSolicitudPendiente = { ids ->
                            onQuitarPendiente?.invoke(ids)
                            if (onQuitarPendiente != null) {
                                contenedor.removeView(fila)
                            }
                        }
                    )
                }
            }

        if (mostrarQuitar) {
            fila.addView(
                quitar,
                LinearLayout.LayoutParams(
                    dp(96),
                    dp(36)
                )
            )
        }

        contenedor.addView(fila)
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
        galponIds: List<Int>,
        onSuccess: (() -> Unit)? = null,
        onSolicitudPendiente: ((List<Int>) -> Unit)? = null
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

                // En el formulario de Editar Operario la eliminación
                // es solo visual y queda pendiente hasta pulsar Guardar.
                if (onSolicitudPendiente != null) {
                    onSolicitudPendiente.invoke(galponIds)
                    Toast.makeText(
                        requireContext(),
                        "Granja marcada para quitar. Pulsa Guardar para aplicar los cambios.",
                        Toast.LENGTH_SHORT
                    ).show()
                    return@setPositiveButton
                }

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

                        onSuccess?.invoke()
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
    // DIALOG EDITAR OPERARIO
    // ============================================================

    private fun mostrarDialogEditarOperario(usuario: UsuarioGestionResponse) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_editar_operario, null)
        val tvNombre = dialogView.findViewById<TextView>(R.id.tvNombreEditarOperario)
        val tvDatos = dialogView.findViewById<TextView>(R.id.tvDatosEditarOperario)
        val switchActivo = dialogView.findViewById<com.google.android.material.switchmaterial.SwitchMaterial>(R.id.switchUsuarioActivo)
        val container = dialogView.findViewById<LinearLayout>(R.id.containerGranjasEditar)
        val spinnerGranjas = dialogView.findViewById<Spinner>(R.id.spinnerGranjasEditar)
        val btnCancelar = dialogView.findViewById<View>(R.id.btnCancelarEditarOperario)
        val btnGuardar = dialogView.findViewById<View>(R.id.btnGuardarEditarOperario)

        tvNombre.text = usuario.nombre_completo
        tvDatos.text = "${usuario.email}  •  Cédula: ${usuario.cedula}"
        switchActivo.isChecked = usuario.activo

        val dialog = AlertDialog.Builder(requireContext())
            .setView(dialogView)
            .create()

        dialog.show()
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.window?.setLayout(
            (resources.displayMetrics.widthPixels * 0.92).toInt(),
            (resources.displayMetrics.heightPixels * 0.82).toInt()
        )

        val galponesPendientesDeQuitar = mutableSetOf<Int>()

        fun cargarGranjasDelDialog() {
            container.removeAllViews()
            cargarAsignaciones(
                usuario.id,
                container,
                true,
                onCambio = null,
                onQuitarPendiente = { ids ->
                    galponesPendientesDeQuitar.addAll(ids)
                }
            )
            cargarGranjasDisponiblesEnSpinner(usuario.id, spinnerGranjas)
        }

        // Al seleccionar una granja, se asigna automáticamente.
        spinnerGranjas.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(
                parent: android.widget.AdapterView<*>?,
                view: View?,
                position: Int,
                id: Long
            ) {
                val granjasDisponibles = spinnerGranjas.tag as? List<GranjaResponse> ?: return
                if (position <= 0 || position - 1 !in granjasDisponibles.indices) return

                val granjaSeleccionada = granjasDisponibles[position - 1]

                spinnerGranjas.isEnabled = false
                asignarGranjaEnDialog(usuario.id, granjaSeleccionada) {
                    cargarGranjasDelDialog()
                    cargarOperarios()
                }
            }

            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
        }

        cargarGranjasDelDialog()

        btnCancelar.setOnClickListener {
            // Como las eliminaciones están pendientes, Cancelar simplemente
            // cierra el diálogo y no toca el backend.
            dialog.dismiss()
        }

        btnGuardar.setOnClickListener {
            val nuevoEstado = switchActivo.isChecked

            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    // ----------------------------------------------------
                    // 1. Aplicar primero las granjas marcadas para quitar.
                    // ----------------------------------------------------
                    var fallosAlQuitar = 0

                    galponesPendientesDeQuitar.toList().forEach { galponId ->
                        val response = RetrofitClient.api.desasignarGalpon(
                            usuario.id,
                            galponId
                        )

                        if (response.isSuccessful) {
                            galponesPendientesDeQuitar.remove(galponId)
                        } else {
                            fallosAlQuitar++
                        }
                    }

                    if (fallosAlQuitar > 0) {
                        cargarGranjasDelDialog()
                        mostrarError(
                            "No se pudieron quitar $fallosAlQuitar galpón(es). Revisa las asignaciones e inténtalo nuevamente."
                        )
                        return@launch
                    }

                    // ----------------------------------------------------
                    // 2. Guardar el cambio de estado, si hubo uno.
                    // ----------------------------------------------------
                    if (nuevoEstado != usuario.activo) {
                        val response = RetrofitClient.api.actualizarEstadoUsuario(
                            usuario.id,
                            ActualizarEstadoUsuarioRequest(activo = nuevoEstado)
                        )

                        if (!response.isSuccessful) {
                            switchActivo.isChecked = usuario.activo
                            mostrarError(
                                "No se pudo actualizar el estado. Código: ${response.code()}"
                            )
                            return@launch
                        }

                        Toast.makeText(
                            requireContext(),
                            if (nuevoEstado) "Usuario activado" else "Usuario desactivado",
                            Toast.LENGTH_SHORT
                        ).show()
                    }

                    cargarOperarios()
                    dialog.dismiss()

                } catch (e: Exception) {
                    mostrarError(
                        "Error al guardar los cambios: ${e.message ?: "sin detalle"}"
                    )
                }
            }
        }
    }

    private fun cargarGranjasDisponiblesEnSpinner(
        usuarioId: Int,
        spinner: Spinner
    ) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val asignacionesResponse =
                    RetrofitClient.api.listarGalponesAsignados(
                        usuarioId,
                        page = 1,
                        limit = 100
                    )

                val granjasResponse =
                    RetrofitClient.api.listarGranjas(
                        page = 1,
                        limit = 100
                    )

                if (!asignacionesResponse.isSuccessful || !granjasResponse.isSuccessful) {
                    spinner.isEnabled = false
                    spinner.adapter = crearAdapterGranjas(listOf("No se pudieron cargar las granjas"))
                    spinner.tag = emptyList<GranjaResponse>()
                    return@launch
                }

                val idsGranjasAsignadas =
                    asignacionesResponse.body()
                        ?.data
                        .orEmpty()
                        .filter { it.activa }
                        .map { it.galpon.granja.id }
                        .toSet()

                val granjasDisponibles =
                    granjasResponse.body()
                        ?.data
                        .orEmpty()
                        .filter { it.activa && it.id !in idsGranjasAsignadas }

                spinner.tag = granjasDisponibles

                val nombres = buildList {
                    add("Selecciona una granja")
                    addAll(granjasDisponibles.map { it.nombre })
                }

                spinner.adapter = crearAdapterGranjas(nombres)
                spinner.isEnabled = granjasDisponibles.isNotEmpty()

            } catch (e: Exception) {
                spinner.isEnabled = false
                spinner.adapter = crearAdapterGranjas(listOf("No se pudieron cargar las granjas"))
                spinner.tag = emptyList<GranjaResponse>()
            }
        }
    }

    private fun crearAdapterGranjas(opciones: List<String>): ArrayAdapter<String> {
        return object : ArrayAdapter<String>(
            requireContext(),
            android.R.layout.simple_spinner_item,
            opciones
        ) {

            private val colorTextoSeleccionado =
                0xFF171D1A.toInt()

            private val colorTextoDropdown =
                0xFF171D1A.toInt()

            private val colorFondoDropdown =
                0xFFFFFFFF.toInt()

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
                    view.setTextColor(colorTextoSeleccionado)
                    view.textSize = 13f
                    view.setPadding(8, 0, 8, 0)
                    view.gravity = Gravity.CENTER_VERTICAL
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
                    view.setTextColor(colorTextoDropdown)
                    view.setBackgroundColor(colorFondoDropdown)
                    view.textSize = 13f
                    view.setPadding(16, 14, 16, 14)
                    view.gravity = Gravity.CENTER_VERTICAL
                }

                return view
            }
        }
    }

    private fun asignarGranjaEnDialog(
        usuarioId: Int,
        granja: GranjaResponse,
        alTerminar: () -> Unit
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
                        "No se pudieron cargar los galpones de la granja. Código: ${responseGalpones.code()}"
                    )
                    return@launch
                }

                val galponesDeGranja =
                    responseGalpones.body()
                        ?.data
                        .orEmpty()
                        .filter { it.activo && it.granja.id == granja.id }

                if (galponesDeGranja.isEmpty()) {
                    mostrarError(
                        "\"${granja.nombre}\" todavía no tiene galpones activos. Crea un galpón ahí antes de asignarla."
                    )
                    return@launch
                }

                var fallos = 0

                galponesDeGranja.forEach { galpon ->
                    val response = RetrofitClient.api.asignarGalpon(
                        usuarioId,
                        AsignarGalponRequest(galpon_id = galpon.id)
                    )
                    if (!response.isSuccessful) fallos++
                }

                if (fallos == 0) {
                    Toast.makeText(
                        requireContext(),
                        "${granja.nombre} asignada correctamente.",
                        Toast.LENGTH_SHORT
                    ).show()
                    alTerminar()
                } else {
                    mostrarError(
                        "Se asignó la granja, pero $fallos galpón(es) fallaron."
                    )
                    alTerminar()
                }
            } catch (e: Exception) {
                mostrarError(
                    "Error al asignar la granja: ${e.message ?: "sin detalle"}"
                )
            }
        }
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