
package com.project.avisensandroid.ui.fragments

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.graphics.RadialGradient
import android.graphics.Shader
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.FragmentAsistenteVozBinding
import com.project.avisensandroid.model.GalponResponse
import com.project.avisensandroid.model.InterpretarComandoVozRequest
import com.project.avisensandroid.model.RespuestaComandoVoz
import com.project.avisensandroid.ui.MainActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import java.util.Locale
import kotlin.math.abs
import kotlin.math.sin
import kotlin.math.sqrt

class AsistenteVozFragment : BaseBottomNavFragment() {

    private var _binding: FragmentAsistenteVozBinding? = null
    private val binding get() = _binding!!

    private var reconocedor: SpeechRecognizer? = null
    private var galponId: Int? = null
    private var galpones: List<GalponResponse> = emptyList()

    private var textoAVoz: TextToSpeech? = null
    private var vozDisponible = false
    private var escuchando = false
    private var hablando = false

    private var onda: OndaVozDrawable? = null
    private var halo: HaloNeonDrawable? = null

    // Actualiza la onda y el halo con el mismo nivel de audio.
    private val interpolarOnda = object : Runnable {
        override fun run() {
            val vista = _binding?.imgWaveLia ?: return
            val grafico = onda ?: return

            val animarOnda = grafico.avanzar()
            val animarHalo = halo?.avanzar() ?: false

            if (animarOnda || animarHalo) {
                vista.postOnAnimation(this)
            }
        }
    }

    private val permisoMicrofono = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { concedido ->
        if (concedido) {
            iniciarReconocimiento()
        } else {
            _binding?.txtEstadoVoz?.text =
                "Necesito permiso de micrófono para escucharte."
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAsistenteVozBinding.inflate(
            inflater,
            container,
            false
        )
        return binding.root
    }

    override fun onViewCreated(
        view: View,
        savedInstanceState: Bundle?
    ) {
        super.onViewCreated(view, savedInstanceState)

        configurarBottomNav(R.id.nav_inicio)

        inicializarTextoAVoz()
        cargarGalpon()

        binding.btnHablarConLia.setOnClickListener {
            solicitarMicrofonoOEscuchar()
        }

        // Regresar a Inicio.
        binding.btnVolverInicioLia.setOnClickListener {
            (requireActivity() as MainActivity)
                .mostrarFragment(InicioFragment())
        }

        // Onda con puntas finas y efecto neón.
        onda = OndaVozDrawable()
        binding.imgWaveLia.setImageDrawable(onda)

        // Halo verde difuminado alrededor del micrófono.
        halo = HaloNeonDrawable()
        binding.haloMicrofonoLia.background = halo

        reiniciarOnda()
    }

    // =====================================================
    // GALPÓN
    // =====================================================

    private fun cargarGalpon() {
        val token = obtenerToken()

        if (token.isNullOrBlank()) {
            binding.txtEstadoVoz.text =
                "Tu sesión no es válida. Inicia sesión nuevamente."
            return
        }

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                binding.txtEstadoVoz.text = "Cargando tu galpón..."

                val activity = requireActivity() as MainActivity
                val respuesta = activity.obtenerGalpones()

                galpones = respuesta.body()
                    ?.data
                    .orEmpty()
                    .filter { it.activo }

                val galponSeleccionadoId =
                    activity.obtenerGalponSeleccionadoId()

                val galpon = galpones.firstOrNull {
                    it.id == galponSeleccionadoId
                } ?: galpones.firstOrNull()

                if (respuesta.isSuccessful && galpon != null) {
                    galponId = galpon.id

                    if (
                        galponSeleccionadoId == null ||
                        galponSeleccionadoId != galpon.id
                    ) {
                        activity.seleccionarGalpon(galpon.id)
                    }

                    configurarSelectorGalpon(
                        galpones,
                        galpon.id
                    )

                    binding.txtEstadoVoz.text =
                        "Listo para escucharte. Galpón: ${galpon.nombre}"
                } else {
                    binding.txtEstadoVoz.text =
                        "No encontré un galpón disponible para tu cuenta."
                }

            } catch (error: CancellationException) {
                throw error

            } catch (error: Exception) {
                _binding?.txtEstadoVoz?.text =
                    "No pude cargar el galpón. Revisa tu conexión."
            }
        }
    }

    private fun configurarSelectorGalpon(
        galponesDisponibles: List<GalponResponse>,
        galponSeleccionadoId: Int
    ) {
        val opciones = galponesDisponibles.map {
            it.nombre
        }

        val adaptador = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_item,
            opciones
        ).apply {
            setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
            )
        }

        binding.spinnerGalponLia.adapter = adaptador

        val posicionInicial =
            galponesDisponibles.indexOfFirst {
                it.id == galponSeleccionadoId
            }

        if (posicionInicial >= 0) {
            binding.spinnerGalponLia.setSelection(
                posicionInicial,
                false
            )
        }

        binding.spinnerGalponLia.onItemSelectedListener =
            object : AdapterView.OnItemSelectedListener {

                override fun onItemSelected(
                    parent: AdapterView<*>?,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    val galponSeleccionado =
                        galponesDisponibles[position]

                    galponId = galponSeleccionado.id

                    (requireActivity() as MainActivity)
                        .seleccionarGalpon(galponSeleccionado.id)

                    binding.txtEstadoVoz.text =
                        "Listo para escucharte. Galpón: ${galponSeleccionado.nombre}"
                }

                override fun onNothingSelected(
                    parent: AdapterView<*>?
                ) = Unit
            }
    }

    // =====================================================
    // RECONOCIMIENTO DE VOZ
    // =====================================================

    private fun solicitarMicrofonoOEscuchar() {
        if (galponId == null) {
            binding.txtEstadoVoz.text =
                "Aún estoy cargando el galpón. Intenta en un momento."
            return
        }

        val permisoConcedido =
            ContextCompat.checkSelfPermission(
                requireContext(),
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED

        if (permisoConcedido) {
            iniciarReconocimiento()
        } else {
            permisoMicrofono.launch(
                Manifest.permission.RECORD_AUDIO
            )
        }
    }

    private fun iniciarReconocimiento() {
        if (!SpeechRecognizer.isRecognitionAvailable(requireContext())) {
            binding.txtEstadoVoz.text =
                "El reconocimiento de voz no está disponible en este dispositivo."
            return
        }

        reconocedor?.destroy()

        reconocedor =
            SpeechRecognizer.createSpeechRecognizer(requireContext())

        reconocedor?.setRecognitionListener(
            object : RecognitionListener {

                override fun onReadyForSpeech(
                    params: Bundle?
                ) {
                    escuchando = true
                    reiniciarOnda()

                    binding.txtEstadoVoz.text = "Escuchando..."
                    binding.txtTranscripcion.text = "Habla ahora."
                }

                override fun onBeginningOfSpeech() {
                    binding.txtEstadoVoz.text = "Te escucho..."
                }

                override fun onPartialResults(
                    partialResults: Bundle?
                ) {
                    val texto = obtenerTexto(partialResults)

                    if (!texto.isNullOrBlank()) {
                        binding.txtTranscripcion.text = texto
                    }
                }

                override fun onResults(
                    results: Bundle?
                ) {
                    escuchando = false

                    if (!hablando) {
                        reiniciarOnda()
                    }

                    val texto = obtenerTexto(results)

                    if (texto.isNullOrBlank()) {
                        binding.txtEstadoVoz.text =
                            "No pude entenderte. Intenta otra vez."
                    } else {
                        binding.txtTranscripcion.text = texto
                        enviarComando(texto)
                    }
                }

                override fun onError(error: Int) {
                    escuchando = false

                    if (!hablando) {
                        reiniciarOnda()
                    }

                    binding.txtEstadoVoz.text = when (error) {
                        SpeechRecognizer.ERROR_AUDIO ->
                            "Error de audio. Revisa que otra app no use el micrófono."

                        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ->
                            "La app no tiene permiso para usar el micrófono."

                        SpeechRecognizer.ERROR_NETWORK ->
                            "No hay conexión para reconocer la voz."

                        SpeechRecognizer.ERROR_NETWORK_TIMEOUT ->
                            "La conexión tardó demasiado. Intenta de nuevo."

                        SpeechRecognizer.ERROR_NO_MATCH ->
                            "No entendí ninguna palabra. Habla más cerca del micrófono."

                        SpeechRecognizer.ERROR_RECOGNIZER_BUSY ->
                            "El reconocimiento está ocupado. Intenta en unos segundos."

                        SpeechRecognizer.ERROR_SERVER ->
                            "El servicio de reconocimiento presentó un error."

                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT ->
                            "No detecté voz. Pulsa el botón y habla enseguida."

                        else -> "Error de reconocimiento: $error"
                    }
                }

                override fun onRmsChanged(rmsdB: Float) {
                    // Nivel de intensidad informado por SpeechRecognizer.
                    if (escuchando) {
                        val nivel =
                            ((rmsdB + 1f) / 11f).coerceIn(0f, 1f)

                        actualizarOnda(nivel)
                    }
                }

                override fun onBufferReceived(
                    buffer: ByteArray?
                ) = Unit

                override fun onEndOfSpeech() {
                    escuchando = false

                    if (!hablando) {
                        reiniciarOnda()
                    }
                }

                override fun onEvent(
                    eventType: Int,
                    params: Bundle?
                ) = Unit
            }
        )

        val intent = Intent(
            RecognizerIntent.ACTION_RECOGNIZE_SPEECH
        ).apply {
            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            )

            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE,
                "es"
            )

            putExtra(
                RecognizerIntent.EXTRA_PARTIAL_RESULTS,
                true
            )
        }

        reconocedor?.startListening(intent)
    }

    // =====================================================
    // COMUNICACIÓN CON EL BACKEND
    // =====================================================

    private fun enviarComando(texto: String) {
        val id = galponId

        if (id == null) {
            binding.txtEstadoVoz.text =
                "No pude preparar la consulta. Selecciona un galpón."
            return
        }

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                binding.txtEstadoVoz.text = "Consultando a Lía..."
                binding.btnHablarConLia.isEnabled = false

                val respuesta =
                    RetrofitClient.api.interpretarComandoVoz(
                        request = InterpretarComandoVozRequest(
                            galpon_id = id,
                            comando_texto = texto
                        )
                    )

                if (respuesta.isSuccessful) {
                    val mensaje =
                        construirRespuesta(respuesta.body())

                    // Texto corto y limpio para pantalla.
                    val respuestaVisual =
                        convertirUnidadesParaPantalla(mensaje)

                    // Texto natural para TextToSpeech.
                    val respuestaNatural =
                        convertirUnidadesParaVoz(mensaje)

                    binding.txtRespuestaLia.text =
                        respuestaVisual

                    hablar(respuestaNatural)

                    binding.txtEstadoVoz.text =
                        "Respuesta lista."

                } else {
                    binding.txtEstadoVoz.text =
                        "No pude consultar el asistente. Código: ${respuesta.code()}"
                }

            } catch (error: CancellationException) {
                throw error

            } catch (error: Exception) {
                _binding?.txtEstadoVoz?.text =
                    "No pude conectar con el asistente. Revisa tu conexión."

            } finally {
                _binding?.btnHablarConLia?.isEnabled = true
            }
        }
    }

    private fun construirRespuesta(
        respuesta: RespuestaComandoVoz?
    ): String {
        val mensajeBase = respuesta?.mensaje
            ?: "No recibí una respuesta para esa consulta."

        val lecturas = respuesta?.lecturas.orEmpty()

        if (respuesta?.requiere_clarificacion == true) {
            return mensajeBase
        }

        if (lecturas.isEmpty()) {
            return "No encontré lecturas recientes de sensores para este galpón. " +
                    "Verifica que tenga sensores activos enviando mediciones."
        }

        val detalles = lecturas.joinToString(". ") { lectura ->
            val tipo = lectura.sensor?.tipo ?: "Medición"
            val valor = lectura.valor ?: "sin dato"

            val unidad = lectura.sensor?.unidad_medida
                ?.let { " $it" } ?: ""

            "$tipo: $valor$unidad"
        }

        return "$mensajeBase $detalles."
    }

    // =====================================================
    // FORMATO DE LAS UNIDADES
    // =====================================================

    /**
     * Formato para mostrar en pantalla:
     *
     * 21.9 grados centígrados -> 21,9 °C
     * 21.9C                 -> 21,9 °C
     * 65 por ciento         -> 65 %
     *
     * No modifica los datos que devuelve el backend.
     */
    private fun convertirUnidadesParaPantalla(
        mensaje: String
    ): String {
        var texto = mensaje

        // Unidades escritas con palabras.
        texto = texto.replace(
            Regex("""(?i)\bgrados?\s+cent[ií]grados\b"""),
            "°C"
        )

        texto = texto.replace(
            Regex("""(?i)\bgrados?\s+celsius\b"""),
            "°C"
        )

        texto = texto.replace(
            Regex("""(?i)\bgrados?\s+fahrenheit\b"""),
            "°F"
        )

        texto = texto.replace(
            Regex("""(?i)\bpor\s+ciento\b"""),
            "%"
        )

        // Formatos numéricos existentes: 21.9C, 21.9°C, etc.
        texto = texto.replace(
            Regex("""(?i)(?<=\d)\s*[°º]?\s*C\b"""),
            " °C"
        )

        texto = texto.replace(
            Regex("""(?i)(?<=\d)\s*[°º]\s*F\b"""),
            " °F"
        )

        texto = texto.replace(
            Regex("""(?<=\d)\s*%"""),
            " %"
        )

        // Si una unidad completa ya fue convertida a símbolo,
        // agrega el espacio correspondiente antes del símbolo.
        texto = texto.replace(
            Regex("""(?<=\d)\s*°C\b"""),
            " °C"
        )

        texto = texto.replace(
            Regex("""(?<=\d)\s*°F\b"""),
            " °F"
        )

        // Separador decimal usado en español.
        texto = texto.replace(
            Regex("""(?<=\d)\.(?=\d)"""),
            ","
        )

        return texto.replace(
            Regex("""\s{2,}"""),
            " "
        ).trim()
    }

    /**
     * Formato para pronunciar:
     *
     * 21.9 °C -> 21,9 grados centígrados
     * 65 %    -> 65 por ciento
     */
    private fun convertirUnidadesParaVoz(
        mensaje: String
    ): String {
        var texto = mensaje

        texto = texto.replace(
            Regex("""(?i)(?<=\d)\s*[°º]?\s*C\b"""),
            " grados centígrados"
        )

        texto = texto.replace(
            Regex("""(?i)(?<=\d)\s*[°º]\s*F\b"""),
            " grados Fahrenheit"
        )

        texto = texto.replace(
            Regex("""(?<=\d)\s*%"""),
            " por ciento"
        )

        texto = texto.replace(
            Regex("""(?i)\bgrados?\s+celsius\b"""),
            "grados centígrados"
        )

        texto = texto.replace(
            Regex("""(?i)\bcentigrados\b"""),
            "centígrados"
        )

        texto = texto.replace(
            Regex("""(?<=\d)\.(?=\d)"""),
            ","
        )

        return texto.replace(
            Regex("""\s{2,}"""),
            " "
        ).trim()
    }

    // =====================================================
    // TEXT TO SPEECH
    // =====================================================

    private fun inicializarTextoAVoz() {
        textoAVoz = TextToSpeech(requireContext()) { estado ->

            vozDisponible =
                estado == TextToSpeech.SUCCESS

            if (vozDisponible) {
                textoAVoz?.setLanguage(
                    Locale("es", "CO")
                )

                textoAVoz?.setOnUtteranceProgressListener(
                    object : UtteranceProgressListener() {

                        override fun onStart(
                            utteranceId: String?
                        ) {
                            if (utteranceId != "respuesta_lia") {
                                return
                            }

                            activity?.runOnUiThread {
                                if (_binding != null) {
                                    hablando = true
                                    reiniciarOnda()
                                }
                            }
                        }

                        override fun onAudioAvailable(
                            utteranceId: String?,
                            audio: ByteArray?
                        ) {
                            if (
                                utteranceId != "respuesta_lia" ||
                                audio == null
                            ) {
                                return
                            }

                            // Audio PCM proporcionado por el motor TTS.
                            val nivel =
                                amplitudAudioPcm16(audio)

                            activity?.runOnUiThread {
                                if (
                                    _binding != null &&
                                    hablando
                                ) {
                                    actualizarOnda(nivel)
                                }
                            }
                        }

                        override fun onDone(
                            utteranceId: String?
                        ) {
                            finalizarVoz(utteranceId)
                        }

                        @Deprecated(
                            "API legacy de TextToSpeech"
                        )
                        override fun onError(
                            utteranceId: String?
                        ) {
                            finalizarVoz(utteranceId)
                        }

                        override fun onError(
                            utteranceId: String?,
                            errorCode: Int
                        ) {
                            finalizarVoz(utteranceId)
                        }
                    }
                )
            }
        }
    }

    private fun finalizarVoz(
        utteranceId: String?
    ) {
        if (utteranceId != "respuesta_lia") {
            return
        }

        activity?.runOnUiThread {
            hablando = false

            if (_binding != null && !escuchando) {
                reiniciarOnda()
            }
        }
    }

    private fun hablar(texto: String) {
        if (vozDisponible) {
            textoAVoz?.speak(
                texto,
                TextToSpeech.QUEUE_FLUSH,
                null,
                "respuesta_lia"
            )
        }
    }

    // =====================================================
    // CONTROL DE LA ONDA Y HALO
    // =====================================================

    private fun actualizarOnda(
        nivelCrudo: Float
    ) {
        val vista = _binding?.imgWaveLia ?: return
        val grafico = onda ?: return

        val nivel = nivelCrudo.coerceIn(0f, 1f)

        grafico.objetivo = nivel
        halo?.objetivo = nivel

        vista.removeCallbacks(interpolarOnda)
        vista.postOnAnimation(interpolarOnda)
    }

    private fun reiniciarOnda() {
        val vista = _binding?.imgWaveLia ?: return

        onda?.objetivo = 0f
        halo?.objetivo = 0f

        vista.removeCallbacks(interpolarOnda)
        vista.postOnAnimation(interpolarOnda)
    }

    // =====================================================
    // ONDA NEÓN CON PUNTAS FINAS
    // =====================================================

    private class OndaVozDrawable : Drawable() {

        var objetivo = 0f
        private var nivel = 0f

        private val pintura = Paint(
            Paint.ANTI_ALIAS_FLAG
        ).apply {
            style = Paint.Style.FILL
        }

        private val forma = Path()

        private val tonos = intArrayOf(
            Color.rgb(45, 237, 191),
            Color.rgb(84, 222, 248),
            Color.rgb(223, 123, 242)
        )

        fun avanzar(): Boolean {
            val factor = if (objetivo > nivel) {
                0.24f
            } else {
                0.12f
            }

            nivel += (objetivo - nivel) * factor

            if (abs(objetivo - nivel) < 0.004f) {
                nivel = objetivo
            }

            invalidateSelf()

            return abs(objetivo - nivel) >= 0.004f
        }

        override fun draw(canvas: Canvas) {
            val ancho = bounds.width().toFloat()
            val alto = bounds.height().toFloat()

            if (ancho <= 0f || alto <= 0f) {
                return
            }

            val inicioX = bounds.left.toFloat()
            val centroY = bounds.top + alto / 2f
            val alturaMaxima = alto * 0.34f

            for (capa in 0..2) {
                val amplitud =
                    nivel *
                            alturaMaxima *
                            (1f - capa * 0.16f)

                val desfase = when (capa) {
                    0 -> 0f
                    1 -> 0.33f
                    else -> 0.62f
                }

                val signo = if (capa == 1) {
                    -1f
                } else {
                    1f
                }

                val grosor = (
                        alto * if (capa == 0) {
                            0.029f
                        } else {
                            0.024f
                        }
                        ).coerceIn(1.8f, 3.5f)

                pintura.color = tonos[capa]

                // Capas superpuestas para el efecto neón.
                for (pasada in 0..3) {
                    val multiplicador = when (pasada) {
                        0 -> 6.2f
                        1 -> 3.6f
                        2 -> 1.9f
                        else -> 1f
                    }

                    pintura.alpha = when (pasada) {
                        0 -> 22 + (nivel * 22f).toInt()
                        1 -> 48 + (nivel * 24f).toInt()
                        2 -> 100 + (nivel * 22f).toInt()
                        else -> if (capa == 0) 245 else 220
                    }

                    construirCinta(
                        inicioX = inicioX,
                        centroY = centroY,
                        ancho = ancho,
                        amplitud = amplitud,
                        desfase = desfase,
                        signo = signo,
                        grosor = grosor * multiplicador
                    )

                    canvas.drawPath(
                        forma,
                        pintura
                    )
                }
            }
        }

        /**
         * Forma cerrada cuyo grosor disminuye hasta
         * llegar a cero en los extremos.
         */
        private fun construirCinta(
            inicioX: Float,
            centroY: Float,
            ancho: Float,
            amplitud: Float,
            desfase: Float,
            signo: Float,
            grosor: Float
        ) {
            forma.reset()

            val pasos = 100

            // Borde superior.
            for (i in 0..pasos) {
                val x = i.toFloat() / pasos

                val envolvente = sin(
                    Math.PI.toFloat() * x
                ).coerceAtLeast(0f)

                val caida = envolvente * envolvente

                val oscilacion = sin(
                    (x * 2.6f + desfase) *
                            2f * Math.PI.toFloat()
                )

                val y =
                    centroY +
                            signo * amplitud * caida * oscilacion

                val medioGrosor =
                    grosor * 0.5f * envolvente

                val px = inicioX + x * ancho

                if (i == 0) {
                    forma.moveTo(px, y)
                } else {
                    forma.lineTo(
                        px,
                        y - medioGrosor
                    )
                }
            }

            // Borde inferior.
            for (i in pasos downTo 0) {
                val x = i.toFloat() / pasos

                val envolvente = sin(
                    Math.PI.toFloat() * x
                ).coerceAtLeast(0f)

                val caida = envolvente * envolvente

                val oscilacion = sin(
                    (x * 2.6f + desfase) *
                            2f * Math.PI.toFloat()
                )

                val y =
                    centroY +
                            signo * amplitud * caida * oscilacion

                val medioGrosor =
                    grosor * 0.5f * envolvente

                forma.lineTo(
                    inicioX + x * ancho,
                    y + medioGrosor
                )
            }

            forma.close()
        }

        override fun setAlpha(alpha: Int) {
            pintura.alpha = alpha
            invalidateSelf()
        }

        override fun setColorFilter(
            colorFilter: ColorFilter?
        ) {
            pintura.colorFilter = colorFilter
            invalidateSelf()
        }

        @Suppress("DEPRECATION")
        override fun getOpacity(): Int {
            return PixelFormat.TRANSLUCENT
        }
    }

    // =====================================================
    // HALO VERDE DIFUMINADO DEL MICRÓFONO
    // =====================================================

    private class HaloNeonDrawable : Drawable() {

        var objetivo: Float = 0f
        private var nivel = 0f

        private val pintura = Paint(
            Paint.ANTI_ALIAS_FLAG
        )

        fun avanzar(): Boolean {
            val factor = if (objetivo > nivel) {
                0.18f
            } else {
                0.10f
            }

            nivel += (objetivo - nivel) * factor

            if (abs(objetivo - nivel) < 0.004f) {
                nivel = objetivo
            }

            invalidateSelf()

            return abs(objetivo - nivel) >= 0.004f
        }

        override fun draw(canvas: Canvas) {
            val ancho = bounds.width().toFloat()
            val alto = bounds.height().toFloat()

            if (ancho <= 0f || alto <= 0f) {
                return
            }

            val cx = bounds.left + ancho / 2f
            val cy = bounds.top + alto / 2f

            val radio = minOf(
                ancho,
                alto
            ) / 2f

            val pulso = nivel.coerceIn(0f, 1f)

            val intensidad =
                0.30f + pulso * 0.70f

            val radioLuz =
                radio * (0.86f + 0.12f * pulso)

            pintura.style = Paint.Style.FILL
            pintura.alpha = 255

            pintura.shader = RadialGradient(
                cx,
                cy,
                radioLuz,
                intArrayOf(
                    Color.TRANSPARENT,
                    Color.TRANSPARENT,

                    Color.argb(
                        (75f * intensidad).toInt(),
                        10, 220, 119
                    ),

                    Color.argb(
                        (135f * intensidad).toInt(),
                        24, 255, 137
                    ),

                    Color.argb(
                        (70f * intensidad).toInt(),
                        14, 184, 104
                    ),

                    Color.argb(
                        (18f * intensidad).toInt(),
                        16, 148, 90
                    ),

                    Color.TRANSPARENT
                ),
                floatArrayOf(
                    0f,
                    0.41f,
                    0.52f,
                    0.62f,
                    0.73f,
                    0.88f,
                    1f
                ),
                Shader.TileMode.CLAMP
            )

            canvas.drawCircle(
                cx,
                cy,
                radioLuz,
                pintura
            )

            pintura.shader = null
        }

        override fun setAlpha(alpha: Int) {
            pintura.alpha = alpha
            invalidateSelf()
        }

        override fun setColorFilter(
            colorFilter: ColorFilter?
        ) {
            pintura.colorFilter = colorFilter
            invalidateSelf()
        }

        @Suppress("DEPRECATION")
        override fun getOpacity(): Int {
            return PixelFormat.TRANSLUCENT
        }
    }

    // =====================================================
    // UTILIDADES DEL AUDIO
    // =====================================================

    private fun amplitudAudioPcm16(
        audio: ByteArray
    ): Float {
        if (audio.size < 2) {
            return 0f
        }

        var sumaCuadrados = 0.0
        var muestras = 0
        var indice = 0

        while (indice + 1 < audio.size) {
            val bajo =
                audio[indice].toInt() and 0xff

            val alto =
                audio[indice + 1].toInt()

            val muestra =
                ((alto shl 8) or bajo)
                    .toShort()
                    .toInt() / 32768.0

            sumaCuadrados += muestra * muestra
            muestras++
            indice += 2
        }

        val rms = sqrt(
            sumaCuadrados / muestras
        )

        return (rms * 7.5)
            .toFloat()
            .coerceIn(0f, 1f)
    }

    private fun obtenerTexto(
        resultado: Bundle?
    ): String? {
        return resultado
            ?.getStringArrayList(
                SpeechRecognizer.RESULTS_RECOGNITION
            )
            ?.firstOrNull()
    }

    private fun obtenerToken(): String? {
        return requireContext()
            .getSharedPreferences(
                "app_prefs",
                Context.MODE_PRIVATE
            )
            .getString(
                "token",
                null
            )
    }

    // =====================================================
    // LIBERAR RECURSOS
    // =====================================================

    override fun onDestroyView() {
        escuchando = false
        hablando = false

        _binding?.imgWaveLia
            ?.removeCallbacks(interpolarOnda)

        onda = null
        halo = null

        reconocedor?.destroy()
        reconocedor = null

        textoAVoz?.stop()
        textoAVoz?.shutdown()
        textoAVoz = null

        _binding = null

        super.onDestroyView()
    }
}
