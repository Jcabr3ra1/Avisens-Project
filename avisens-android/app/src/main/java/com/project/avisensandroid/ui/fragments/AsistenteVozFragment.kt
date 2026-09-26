package com.project.avisensandroid.ui.fragments

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.project.avisensandroid.R
import com.project.avisensandroid.controller.RetrofitClient
import com.project.avisensandroid.databinding.FragmentAsistenteVozBinding
import com.project.avisensandroid.model.InterpretarComandoVozRequest
import com.project.avisensandroid.model.RespuestaComandoVoz
import kotlinx.coroutines.launch
import java.util.Locale

class AsistenteVozFragment : BaseBottomNavFragment() {

    private var _binding: FragmentAsistenteVozBinding? = null
    private val binding get() = _binding!!

    private var reconocedor: SpeechRecognizer? = null
    private var galponId: Int? = null
    private var textoAVoz: TextToSpeech? = null
    private var vozDisponible = false

    private val permisoMicrofono = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { concedido ->
        if (concedido) {
            iniciarReconocimiento()
        } else {
            binding.txtEstadoVoz.text =
                "Necesito permiso de micrófono para escucharte."
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentAsistenteVozBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        configurarBottomNav(R.id.nav_inicio)
        inicializarTextoAVoz()
        cargarGalpon()

        binding.btnHablarConLia.setOnClickListener {
            solicitarMicrofonoOEscuchar()
        }
    }

    private fun cargarGalpon() {
        val token = obtenerToken()

        if (token.isNullOrBlank()) {
            binding.txtEstadoVoz.text = "Tu sesión no es válida. Inicia sesión nuevamente."
            return
        }

        lifecycleScope.launch {
            try {
                binding.txtEstadoVoz.text = "Cargando tu galpón..."

                val respuesta = RetrofitClient.api.listarGalpones(
                    token = "Bearer $token",
                )

                val galpon = respuesta.body()?.data?.firstOrNull()

                if (respuesta.isSuccessful && galpon != null) {
                    galponId = galpon.id
                    binding.txtEstadoVoz.text =
                        "Listo para escucharte. Galpón: ${galpon.nombre}"
                } else {
                    binding.txtEstadoVoz.text =
                        "No encontré un galpón disponible para tu cuenta."
                }
            } catch (error: Exception) {
                binding.txtEstadoVoz.text =
                    "No pude cargar el galpón. Revisa tu conexión."
            }
        }
    }

    private fun solicitarMicrofonoOEscuchar() {
        if (galponId == null) {
            binding.txtEstadoVoz.text =
                "Aún estoy cargando el galpón. Intenta en un momento."
            return
        }

        val permisoConcedido = ContextCompat.checkSelfPermission(
            requireContext(),
            Manifest.permission.RECORD_AUDIO,
        ) == PackageManager.PERMISSION_GRANTED

        if (permisoConcedido) {
            iniciarReconocimiento()
        } else {
            permisoMicrofono.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun iniciarReconocimiento() {
        if (!SpeechRecognizer.isRecognitionAvailable(requireContext())) {
            binding.txtEstadoVoz.text =
                "El reconocimiento de voz no está disponible en este dispositivo."
            return
        }

        reconocedor?.destroy()
        reconocedor = SpeechRecognizer.createSpeechRecognizer(requireContext())

        reconocedor?.setRecognitionListener(object : RecognitionListener {

            override fun onReadyForSpeech(params: Bundle?) {
                binding.txtEstadoVoz.text = "Escuchando..."
                binding.txtTranscripcion.text = "Habla ahora."
            }

            override fun onBeginningOfSpeech() {
                binding.txtEstadoVoz.text = "Te escucho..."
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val texto = obtenerTexto(partialResults)
                if (!texto.isNullOrBlank()) {
                    binding.txtTranscripcion.text = texto
                }
            }

            override fun onResults(results: Bundle?) {
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

            override fun onRmsChanged(rmsdB: Float) = Unit
            override fun onBufferReceived(buffer: ByteArray?) = Unit
            override fun onEndOfSpeech() = Unit
            override fun onEvent(eventType: Int, params: Bundle?) = Unit
        })

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
            )
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }

        reconocedor?.startListening(intent)
    }

    private fun enviarComando(texto: String) {
        val token = obtenerToken()
        val id = galponId

        if (token.isNullOrBlank() || id == null) {
            binding.txtEstadoVoz.text =
                "No pude preparar la consulta. Inicia sesión nuevamente."
            return
        }

        lifecycleScope.launch {
            try {
                binding.txtEstadoVoz.text = "Consultando a Lía..."
                binding.btnHablarConLia.isEnabled = false

                val respuesta = RetrofitClient.api.interpretarComandoVoz(
                    token = "Bearer $token",
                    request = InterpretarComandoVozRequest(
                        galpon_id = id,
                        comando_texto = texto,
                    ),
                )

                if (respuesta.isSuccessful) {
                    val mensaje = construirRespuesta(respuesta.body())

                    binding.txtRespuestaLia.text = mensaje
                    hablar(mensaje)
                    binding.txtEstadoVoz.text = "Respuesta lista."
                } else {
                    binding.txtEstadoVoz.text =
                        "No pude consultar el asistente. Código: ${respuesta.code()}"
                }
            } catch (error: Exception) {
                binding.txtEstadoVoz.text =
                    "No pude conectar con el asistente. Revisa tu conexión."
            } finally {
                binding.btnHablarConLia.isEnabled = true
            }
        }
    }
    private fun construirRespuesta(
        respuesta: RespuestaComandoVoz?,
    ): String {
        val mensajeBase = respuesta?.mensaje
            ?: "No recibí una respuesta para esa consulta."

        val lecturas = respuesta?.lecturas.orEmpty()

        if (lecturas.isEmpty()) {
            return mensajeBase
        }

        val detalles = lecturas.joinToString(". ") { lectura ->
            val tipo = lectura.sensor?.tipo ?: "Medición"
            val valor = lectura.valor ?: "sin dato"
            val unidad = lectura.sensor?.unidad_medida?.let { " $it" } ?: ""

            "$tipo: $valor$unidad"
        }

        return "$mensajeBase $detalles."
    }
    private fun inicializarTextoAVoz() {
        textoAVoz = TextToSpeech(requireContext()) { estado ->
            vozDisponible = estado == TextToSpeech.SUCCESS

            if (vozDisponible) {
                textoAVoz?.setLanguage(Locale("es", "CO"))
            }
        }
    }

    private fun hablar(texto: String) {
        if (vozDisponible) {
            textoAVoz?.speak(
                texto,
                TextToSpeech.QUEUE_FLUSH,
                null,
                "respuesta_lia",
            )
        }
    }
    private fun obtenerTexto(resultado: Bundle?): String? {
        return resultado
            ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            ?.firstOrNull()
    }

    private fun obtenerToken(): String? {
        return requireContext()
            .getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
            .getString("token", null)
    }

    override fun onDestroyView() {
        reconocedor?.destroy()
        reconocedor = null
        textoAVoz?.stop()
        textoAVoz?.shutdown()
        textoAVoz = null
        _binding = null
        super.onDestroyView()
    }
}