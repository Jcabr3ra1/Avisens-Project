#include <Arduino.h>
#include <esp_task_wdt.h>
#include <freertos/task.h>
#include <freertos/queue.h>

#include "config.h"
#include "MovingAverage.h"
#include "SensorDHT.h"
#include "SensorMQ135.h"
#include "SensorKY032.h"
#include "SensorUltrasonico.h"
#include "SensorPeso.h"
#include "Actuador.h"
#include "GestorActuadores.h"
#include "ControlServo.h"
#include "Alimentador.h"
#include "Persiana.h"
#include "ConexionWiFi.h"
#include "ServicioIngesta.h"
#include "ConfigDispositivo.h"
#include "PortalWeb.h"
#include "ControlRemoto.h"

//  INSTANCIAS GLOBALES

EstadoSistema estadoSistema = EstadoSistema::INIT;

// Sensores
SensorDHT sensorDHT;
SensorMQ135 sensorMQ135;
SensorKY032 sensorKY032;
SensorUltrasonico sensorUltrasonico;
SensorPeso sensorPeso;

// Actuadores
GestorActuadores gestorActuadores;
ControlServo controlServo;
Alimentador alimentador;
Persiana persiana;
// Órdenes de la web sobre K1-K4; ver ControlRemoto.h.
ControlRemoto controlRemoto(gestorActuadores);

#if !defined(WIFI_SSID) || !defined(WIFI_PASSWORD)
#error "Define WIFI_SSID y WIFI_PASSWORD en include/config.h (ver config.example.h) antes de compilar."
#endif
// La red sale de configDispositivo() en setup(): la del portal o config.h.
ConexionWiFi conexionWiFi;

// ─── Variables de sincronización ─────────────────────────
unsigned long ultimaLecturaSensores = 0;
unsigned long ultimaActuacion = 0;
unsigned long ultimaEnvioTelemetria = 0;

// ─── Variables FSM (Documento SSD) ──────────────────────
uint32_t ciclosArranque = 0;
bool calibracionCompletada = false;
uint32_t fallosAcumulados = 0;
bool comandoRearme = false;

uint32_t ciclosTarea = 0;
uint32_t erroresGlobales = 0;

// Historial de temperatura para detectar gradientes ─
struct HistorialTemperatura
{
  float temperatura;
  unsigned long timestamp;
} ultimaTemperatura = {0.0f, 0};

// Filtro de picos para temperatura
MovingAverage<float, 10> filtroTemperatura;

static portMUX_TYPE muxLecturaDht = portMUX_INITIALIZER_UNLOCKED;
static LecturaDHT snapshotDht = {0.0f, 0.0f, false, 0};

void publicarLecturaDht(const LecturaDHT &lectura)
{
  portENTER_CRITICAL(&muxLecturaDht);
  snapshotDht = lectura;
  portEXIT_CRITICAL(&muxLecturaDht);
}

LecturaDHT leerSnapshotDht()
{
  portENTER_CRITICAL(&muxLecturaDht);
  LecturaDHT copia = snapshotDht;
  portEXIT_CRITICAL(&muxLecturaDht);
  return copia;
}

// Actuadores "encendidos desde el último envío": la persiana se mueve solo
// ~6 s cada 5 min y el envío es cada INTERVALO_ENVIO_MS, así que mandar solo
// el estado del instante del envío podría no mostrar nunca un movimiento.
static portMUX_TYPE muxActuadores = portMUX_INITIALIZER_UNLOCKED;
static EstadoActuadores actuadoresDesdeEnvio = {};

void registrarEstadoActuadores(const EstadoActuadores &ahora)
{
  portENTER_CRITICAL(&muxActuadores);
  actuadoresDesdeEnvio.alimentador |= ahora.alimentador;
  actuadoresDesdeEnvio.persiana |= ahora.persiana;
  for (int i = 0; i < 4; i++)
    actuadoresDesdeEnvio.reles[i] |= ahora.reles[i];
  portEXIT_CRITICAL(&muxActuadores);
}

EstadoActuadores tomarEstadoActuadores()
{
  portENTER_CRITICAL(&muxActuadores);
  EstadoActuadores copia = actuadoresDesdeEnvio;
  actuadoresDesdeEnvio = {};
  portEXIT_CRITICAL(&muxActuadores);
  return copia;
}

// Última distancia del HC-SR04 para la tarea de red (Core 1).
static portMUX_TYPE muxAgua = portMUX_INITIALIZER_UNLOCKED;
static LecturaUltrasonico snapshotAgua = {-1.0f, EstadoSensorUltrasonico::ERROR, 0};
static bool snapshotAguaEnError = true;

void publicarLecturaAgua(const LecturaUltrasonico &lectura, bool enError)
{
  portENTER_CRITICAL(&muxAgua);
  snapshotAgua = lectura;
  snapshotAguaEnError = enError;
  portEXIT_CRITICAL(&muxAgua);
}

// true y la distancia si hay una lectura válida y reciente para enviar.
bool leerSnapshotAgua(float &distancia)
{
  portENTER_CRITICAL(&muxAgua);
  LecturaUltrasonico copia = snapshotAgua;
  bool enError = snapshotAguaEnError;
  portEXIT_CRITICAL(&muxAgua);

  distancia = copia.distancia;
  return !enError &&
         copia.estado == EstadoSensorUltrasonico::OK &&
         millis() - copia.timestamp <= UMBRAL_SNAPSHOT_OBSOLETO_MS;
}

// Último ADC del MQ-135 para la tarea de red (Core 1).
static portMUX_TYPE muxGas = portMUX_INITIALIZER_UNLOCKED;
static LecturaMQ135 snapshotGas = {0, 0.0f, false, 0};

void publicarLecturaGas(const LecturaMQ135 &lectura)
{
  portENTER_CRITICAL(&muxGas);
  snapshotGas = lectura;
  portEXIT_CRITICAL(&muxGas);
}

// true y el ADC si hay una lectura válida y reciente para enviar.
bool leerSnapshotGas(int &adc)
{
  portENTER_CRITICAL(&muxGas);
  LecturaMQ135 copia = snapshotGas;
  portEXIT_CRITICAL(&muxGas);

  adc = copia.rawValue;
  return copia.valida &&
         millis() - copia.timestamp <= UMBRAL_SNAPSHOT_OBSOLETO_MS;
}

// Último peso del HX711 para la tarea de red (Core 1). SensorPeso marca la
// lectura inválida mientras no se haya hecho TARA, así que sin tara no se
// envía nada en vez de mandar un peso sin cero de referencia.
static portMUX_TYPE muxPeso = portMUX_INITIALIZER_UNLOCKED;
static LecturaPeso snapshotPeso = {0.0f, 0.0f, false, 0};

void publicarLecturaPeso(const LecturaPeso &lectura)
{
  portENTER_CRITICAL(&muxPeso);
  snapshotPeso = lectura;
  portEXIT_CRITICAL(&muxPeso);
}

// true y los gramos si hay una lectura válida y reciente para enviar.
bool leerSnapshotPeso(float &gramos)
{
  portENTER_CRITICAL(&muxPeso);
  LecturaPeso copia = snapshotPeso;
  portEXIT_CRITICAL(&muxPeso);

  gramos = copia.peso;
  return copia.valida &&
         millis() - copia.timestamp <= UMBRAL_SNAPSHOT_OBSOLETO_MS;
}

// FUNCIÓN: Registrar falla crítica (local)
void registrarFallaCritica(
    const String &origen,
    const String &mensaje,
    const String &nivel = "critico")
{
  LOG_ERROR(origen + ": " + mensaje + " (" + nivel + ")");
}

bool detectarGradienteTermico(float temperatura, unsigned long ahora)
{
  const float UMBRAL_GRADIENT = 10.0f;       // °C
  const unsigned long VENTANA_TIEMPO = 5000; // 5 segundos en ms

  if (ultimaTemperatura.timestamp == 0)
  {
    // Primera lectura
    ultimaTemperatura.temperatura = temperatura;
    ultimaTemperatura.timestamp = ahora;
    return false;
  }

  unsigned long deltaT_ms = ahora - ultimaTemperatura.timestamp;
  float deltaTemp = std::abs(temperatura - ultimaTemperatura.temperatura);

  if (deltaT_ms <= VENTANA_TIEMPO && deltaTemp > UMBRAL_GRADIENT)
  {
    LOG_WARN("⚠ Gradiente térmico abrupto: ΔT=" + String(deltaTemp) +
             "°C en " + String(deltaT_ms) + "ms");
    return true;
  }

  ultimaTemperatura.temperatura = temperatura;
  ultimaTemperatura.timestamp = ahora;
  return false;
}

void tareaGalpon(void *pvParameters)
{
  esp_task_wdt_add(NULL);
  Serial.println("[FreeRTOS] Watchdog Timer registrado en Core 0.");

  static EstadoSistema ultimoEstadoImpreso = EstadoSistema::INIT;

  for (;;)
  {
    unsigned long ahora = millis();
    esp_task_wdt_reset();
    ciclosTarea++;

    // ─── Procesamiento de comandos Serial (Variable R) ──────────────
    if (Serial.available())
    {
      String cmd = Serial.readStringUntil('\n');
      cmd.trim();
      cmd.toUpperCase();

      if (cmd == "REARME" || cmd == "RESET")
      {
        LOG_WARN("Comando de rearme recibido por Serial");
        comandoRearme = true;
        estadoSistema = EstadoSistema::INIT;
        ciclosArranque = 0;
      }
      else if (cmd == "TARA")
      {
        LOG_DEBUG("Comando de tara (HX711) recibido");
        sensorPeso.tara();
        sensorPeso.setFactor(HX711_FACTOR_ESCALA);
        calibracionCompletada = true;
      }
      else if (cmd == "BORRAR_CONFIG")
      {
        // Rescate por USB si se guardó una red o URL que no funciona.
        LOG_WARN("Configuración del portal borrada: se reinicia con config.h");
        borrarConfigDispositivo();
        delay(500);
        ESP.restart();
      }
      else if (cmd == "RELES")
      {
        for (uint8_t r = 1; r <= 4; r++)
        {
          Serial.printf("K%u (%s): %s%s\n", r,
                        GestorActuadores::nombreDesdeRele(r).c_str(),
                        gestorActuadores.getEstado(r) ? "ON" : "off",
                        gestorActuadores.esManual(r) ? " [MANUAL]" : "");
        }
      }
      else
      {
        // Prueba de actuadores sin depender de los sensores:
        // "<rele> ON|OFF|AUTO", con rele = K1..K4 o su nombre (VENTILADOR...).
        int espacio = cmd.indexOf(' ');
        uint8_t rele = espacio > 0 ? GestorActuadores::releDesdeNombre(cmd.substring(0, espacio)) : 0;
        String accion = espacio > 0 ? cmd.substring(espacio + 1) : "";
        accion.trim();

        if (rele != 0 && accion == "ON")
          gestorActuadores.establecerManual(rele, true);
        else if (rele != 0 && accion == "OFF")
          gestorActuadores.establecerManual(rele, false);
        else if (rele != 0 && accion == "AUTO")
          gestorActuadores.establecerAutomatico(rele);
        else if (cmd.length() > 0)
          LOG_WARN("Comando no reconocido: " + cmd);
      }
    }

    // ─── Máquina de Estado Global (Sincronizada con SSD) ──────────────
    switch (estadoSistema)
    {
    case EstadoSistema::INIT:
      ciclosArranque++;

      // Variable C: Transición cuando ciclosArranque >= 10
      if (ciclosArranque >= 10)
      {
        estadoSistema = EstadoSistema::CALIBRATION;
        Serial.println("\n[FSM Global] INIT → CALIBRATION (Variable C>=10)");
      }
      break;

    case EstadoSistema::CALIBRATION:
      // Variable T: Esperar calibración HX711
      // Transición automática después de cierto tiempo o si se completa manualmente
      if (calibracionCompletada || ciclosTarea > 150)
      {
        if (!calibracionCompletada)
        {
          LOG_WARN("Calibración omitida — Usando factor por defecto.");
          sensorPeso.setFactor(HX711_FACTOR_ESCALA);
        }
        estadoSistema = EstadoSistema::MONITORING;
        Serial.println("[FSM Global] CALIBRATION → MONITORING (Variable T=true)");
      }
      break;

    case EstadoSistema::MONITORING:
      // Sistema operativo normalmente
      break;

    case EstadoSistema::ACTUATION:
      // Transición a MONITORING cuando actuación completada
      estadoSistema = EstadoSistema::MONITORING;
      break;

    case EstadoSistema::ERROR:
      // Solo ejecuta una vez por transición
      if (ultimoEstadoImpreso != EstadoSistema::ERROR)
      {
        Serial.println("\n❌ [FAIL-SAFE] Activado: K1-K3 OFF, K4 ON (Emergencia)");

        // ─── Registrar la falla ANTES de pausar ───────────────────
        registrarFallaCritica(
            "SensorsDHT_Ultrasonico",
            "Fallos persistentes en sensores críticos - Sistema en fail-safe",
            "critico");

        gestorActuadores.failSafe();
        controlServo.cerrarEmergencia();
        alimentador.detener();
        persiana.detener();
        ultimoEstadoImpreso = EstadoSistema::ERROR;
      }

      // ─── Intento de recuperación automática ──────────────────────
      if (!sensorDHT.enError() && !sensorUltrasonico.enError())
      {
        LOG_DEBUG("✓ Sensores recuperados - Transición a MONITORING");
        estadoSistema = EstadoSistema::MONITORING;
        fallosAcumulados = 0;
      }
      break;

    case EstadoSistema::SHUTDOWN:
      gestorActuadores.failSafe();
      alimentador.setHabilitado(false);
      persiana.setHabilitado(false);
      vTaskDelay(pdMS_TO_TICKS(1000));
      break;

    default:
      estadoSistema = EstadoSistema::MONITORING;
    }

    if (estadoSistema != EstadoSistema::ERROR)
    {
      ultimoEstadoImpreso = estadoSistema;
    }

    // ─── Lectura Periódica de Sensores ───────────────────────────────
    if (ahora - ultimaLecturaSensores >= INTERVALO_SENSORES)
    {
      ultimaLecturaSensores = ahora;

      LecturaDHT lecturaDHT = sensorDHT.leer();
      publicarLecturaDht(lecturaDHT);
      LecturaMQ135 lecturaMQ135 = sensorMQ135.leer();
      publicarLecturaGas(lecturaMQ135);
      LecturaKY032 lecturaKY032 = sensorKY032.leer();
      LecturaUltrasonico lecturaUltrasonico = sensorUltrasonico.leer();
      publicarLecturaAgua(lecturaUltrasonico, sensorUltrasonico.enError());
      LecturaPeso lecturaPeso = sensorPeso.leer();
      publicarLecturaPeso(lecturaPeso);

      float temperatura = lecturaDHT.valida ? lecturaDHT.temperatura : 0.0f;
      float humedad = lecturaDHT.valida ? lecturaDHT.humedad : 0.0f;
      int rawNH3 = lecturaMQ135.rawValue;

      // ─── Detectar gradiente térmico (ΔT > 10°C en 5s) ──────────────
      if (lecturaDHT.valida)
      {
        detectarGradienteTermico(temperatura, ahora);
      }

      // ─── Órdenes remotas (web) sobre K1-K4 ───────────────────────
      // Antes de la lógica automática: un relé que vuelve a AUTO por una
      // protección recibe su decisión automática en este mismo ciclo.
      ContextoProtecciones contexto = {
          estadoSistema == EstadoSistema::MONITORING,
          sensorDHT.enError(),
          lecturaDHT.valida,
          temperatura,
          rawNH3,
          sensorUltrasonico.enError(),
          lecturaUltrasonico.estado == EstadoSensorUltrasonico::OK,
          // Ante un fallo puntual, SensorUltrasonico devuelve la última medida
          // buena con su timestamp original: si es anterior al inicio de este
          // ciclo, está sostenida y no sirve para autorizar una orden.
          lecturaUltrasonico.estado == EstadoSensorUltrasonico::OK &&
              lecturaUltrasonico.timestamp >= ahora,
          lecturaUltrasonico.distancia};
      controlRemoto.vigilar(contexto);
      controlRemoto.procesarOrdenes(contexto);

      // ─── Actualizar Actuadores y FSMs Locales ────────────────────
      if (estadoSistema == EstadoSistema::MONITORING)
      {
        gestorActuadores.actualizarClima(
            temperatura,
            humedad,
            rawNH3,
            lecturaDHT.valida,
            sensorDHT.enError());

        gestorActuadores.actualizarAgua(
            lecturaUltrasonico.distancia,
            lecturaUltrasonico.estado,
            sensorUltrasonico.enError());

        controlServo.actualizar(lecturaKY032.presencia);
        alimentador.actualizar();
        persiana.actualizar();
      }

      // Con la decisión automática ya tomada: lo que se informa de los relés
      // (y de las órdenes de este ciclo) es la salida que de verdad quedó.
      controlRemoto.cerrarCiclo();

      // Fuera de MONITORING (ERROR/SHUTDOWN) los motores están detenidos y
      // así se reporta; los relés van con el estado real que dejó el fail-safe.
      EstadoPersiana ep = persiana.getEstado();
      EstadoActuadores ahoraActuadores = {};
      ahoraActuadores.alimentador = alimentador.getEstado() == EstadoAlimentador::ENCENDIDO;
      ahoraActuadores.persiana = ep == EstadoPersiana::ABRIENDO || ep == EstadoPersiana::CERRANDO;
      for (uint8_t r = 1; r <= 4; r++)
        ahoraActuadores.reles[r - 1] = gestorActuadores.getEstado(r);
      registrarEstadoActuadores(ahoraActuadores);

      // ─── Evaluación de Fallos Críticos (Variable F) ────────────────
      bool errorCritico = sensorDHT.enError() || sensorUltrasonico.enError();

      if (errorCritico)
      {
        fallosAcumulados++;

        // Variable F: Si fallos >= 3, transición a ERROR
        if (fallosAcumulados >= 3 && estadoSistema != EstadoSistema::ERROR)
        {
          estadoSistema = EstadoSistema::ERROR;
          LOG_ERROR("Fallos acumulados >= 3 — Transición a ERROR (Variable F)");
        }
      }
      else
      {
        // Los sensores están sanos en este ciclo: el contador deja de
        // arrastrar episodios ya resueltos. Antes solo se reiniciaba al
        // salir de ERROR, así que fallos breves y separados en el tiempo
        // (sin llegar nunca a ERROR) se sumaban entre sí indefinidamente.
        // El umbral (3) y la propia FSM no cambian.
        fallosAcumulados = 0;

        if (estadoSistema == EstadoSistema::ERROR)
        {
          // Auto-recuperación cuando los sensores vuelven a responder
          estadoSistema = EstadoSistema::MONITORING;
          Serial.println("\n✓ [FSM Global] Sensores restablecidos: ERROR → MONITORING");
        }
      }

      // ─── Alerta de Tolva ──────────────────────────────────────────
      if (lecturaPeso.valida && lecturaPeso.peso < UMBRAL_ALIMENTO_BAJO)
      {
        LOG_WARN("Alimento bajo en tolva (< 500g)");
      }

      // ─── Debug: Mostrar estado actual ─────────────────────────────
      if (ciclosTarea % 30 == 0)
      {
        Serial.printf("[Ciclo %lu] T=%.1f°C H=%.0f%% NH3=%d ESTADO=%d\n",
                      ciclosTarea, temperatura, humedad, rawNH3,
                      static_cast<int>(estadoSistema));
      }
    }

    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

// Lecturas de sensores y actuadores de este ciclo. Sirve tanto para enviar
// como para guardar en el búfer cuando no hay WiFi: las órdenes y el estado
// de los relés se agregan solo al enviar (ver tareaWiFi).
static CicloIngesta armarCicloLecturas()
{
  LecturaDHT lectura = leerSnapshotDht();
  unsigned long antiguedadSnapshot = millis() - lectura.timestamp;
  bool incluirDht = true;

  if (!lectura.valida)
  {
    LOG_WARN("Ingesta: DHT sin lectura válida, se omite del envío");
    incluirDht = false;
  }
  else if (antiguedadSnapshot > UMBRAL_SNAPSHOT_OBSOLETO_MS)
  {
    LOG_WARN("Ingesta: snapshot DHT obsoleto (" + String(antiguedadSnapshot) +
             "ms) -- tareaGalpon dejó de refrescarlo, se omite del envío");
    incluirDht = false;
  }

  CicloIngesta ciclo;
  ciclo.resultados = nullptr;
  ciclo.cantidadResultados = 0;
  ciclo.reles.valido = false;
  ciclo.arranqueId = nullptr;
  ciclo.incluirDht = incluirDht;
  ciclo.temperatura = lectura.temperatura;
  ciclo.humedad = lectura.humedad;
  ciclo.incluirAgua = leerSnapshotAgua(ciclo.distanciaAgua);
  ciclo.incluirGas = leerSnapshotGas(ciclo.gasAdc);
  ciclo.incluirPeso = leerSnapshotPeso(ciclo.pesoGramos);
  ciclo.pesoCalibrado = HX711_CALIBRADO;
  ciclo.actuadores = tomarEstadoActuadores();
  return ciclo;
}

// Mantiene la conexión WiFi viva en Core 1 y envía cada INTERVALO_ENVIO_MS
void tareaWiFi(void *pvParameters)
{
  Serial.println("[WiFi Task] Iniciada en Core 1");

  // El portal escucha también en la red propia, así que arranca aunque
  // todavía no haya conexión al WiFi.
  iniciarPortalWeb(conexionWiFi);
  vTaskDelay(pdMS_TO_TICKS(5000));

  unsigned long ultimoAvisoSinWifi = 0;

  for (;;)
  {
    conexionWiFi.actualizar();
    atenderPortalWeb();

    if (!WiFi.isConnected())
    {
      // La vuelta es cada 10 ms (para el portal): avisar cada 5 s basta.
      if (millis() - ultimoAvisoSinWifi >= 5000)
      {
        ultimoAvisoSinWifi = millis();
        LOG_WARN("WiFi desconectado - Reintentando conexión");
      }
      // Sin red las lecturas no se pierden: se guardan (una por minuto) y se
      // reenvían con su hora cuando vuelva la conexión.
      if (millis() - ultimaEnvioTelemetria >= INTERVALO_ENVIO_MS)
      {
        ultimaEnvioTelemetria = millis();
        if (bufferListoParaGuardar())
          guardarCicloSinRed(armarCicloLecturas());
      }
    }
    else if (millis() - ultimaEnvioTelemetria >= INTERVALO_ENVIO_MS)
    {
      ultimaEnvioTelemetria = millis();
      iniciarHoraRed();

      CicloIngesta ciclo = armarCicloLecturas();

      // Confirmaciones de órdenes: se acumulan hasta que el backend responde
      // con el contrato válido; si el envío falla, viajan en el siguiente.
      // Primero los resultados y después el estado de relés (ver ControlRemoto.h).
      static ResultadoOrdenRemota resultadosSinConfirmar[MAX_ORDENES_POR_RESPUESTA];
      static uint8_t cantidadSinConfirmar = 0;
      cantidadSinConfirmar += controlRemoto.tomarResultados(
          &resultadosSinConfirmar[cantidadSinConfirmar],
          MAX_ORDENES_POR_RESPUESTA - cantidadSinConfirmar);
      ciclo.resultados = resultadosSinConfirmar;
      ciclo.cantidadResultados = cantidadSinConfirmar;
      ciclo.reles = controlRemoto.leerEstadoReles();

      // Identificador de esta sesión de arranque: un UUID v4 nuevo en cada
      // encendido, que no se guarda en flash. Se genera aquí, con el WiFi ya
      // conectado, porque esp_random() solo da entropía de hardware con la
      // radio activa. Si el ESP32 se reinicia, el backend ve un valor nuevo y
      // trata como inciertas las órdenes que la sesión anterior no confirmó.
      static String arranqueId;
      if (arranqueId.length() == 0)
        arranqueId = generarIdLote();
      ciclo.arranqueId = arranqueId.c_str();

      static RespuestaIngesta respuesta;
      reportarEnvioPortal(enviarLecturaConReintentos(ciclo, generarIdLote(), respuesta));
      if (respuesta.contratoValido)
      {
        cantidadSinConfirmar = 0;
        controlRemoto.registrarContactoBackend();
        for (uint8_t i = 0; i < respuesta.cantidadOrdenes; i++)
          controlRemoto.recibirOrden(respuesta.ordenes[i]);
      }
    }

    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

void setup()
{
  Serial.begin(BAUD_RATE);
  delay(500);

  Serial.println("\n================================");
  Serial.println("GALPÓN INTELIGENTE — v7.0");
  Serial.println("Arquitectura Modular + FreeRTOS");
  Serial.println("================================");

  // Watchdog Timer
  esp_task_wdt_init(WDT_TIMEOUT_S, true);
  Serial.printf("[WDT] Configurado a %d segundos.\n", WDT_TIMEOUT_S);

  //  Inicialización de Módulos
  Serial.println("\n[SETUP] Inicializando actuadores...");
  gestorActuadores.begin();
  controlRemoto.begin();
  controlServo.begin();
  alimentador.begin();
  persiana.begin();

  Serial.println("[SETUP] Inicializando sensores...");
  sensorDHT.begin();
  sensorMQ135.begin();
  sensorKY032.begin();
  sensorUltrasonico.begin();
  sensorPeso.begin();

  Serial.println("[SETUP] Iniciando enlace WiFi asíncrono...");
  cargarConfigDispositivo();
  conexionWiFi.configurar(configDispositivo().ssid, configDispositivo().password);
  conexionWiFi.comenzar();

  // ─── Tareas FreeRTOS en Cores Independientes ──────────────
  Serial.println("[SETUP] Desplegando tarea de control en Core 0...");
  xTaskCreatePinnedToCore(
      tareaGalpon,
      "tareaGalpon",
      16384,
      NULL,
      2,
      NULL,
      0);

  Serial.println("[SETUP] Desplegando tarea WiFi en Core 1...");
  xTaskCreatePinnedToCore(
      tareaWiFi,
      "tareaWiFi",
      12288, // el handshake TLS (backend https) no cabe en 8 KB
      NULL,
      1,
      NULL,
      1);

  Serial.println("\n[SETUP] Calibración a cargo de tareaGalpon (Core 0).");
  Serial.println("Envía 'TARA' por el monitor Serial para calibrar.");
  Serial.println("Comandos disponibles:");
  Serial.println("  TARA  - Calibrar celda de carga");
  Serial.println("  REARME - Reiniciar sistema desde INIT");
  Serial.println("  K1..K4 ON|OFF|AUTO - Probar un rele a mano (tambien VENTILADOR, BOMBA...)");
  Serial.println("  RELES  - Ver estado de los 4 reles");
  Serial.println("  BORRAR_CONFIG - Olvidar la config del portal y volver a config.h");
  Serial.println("Portal web: http://<IP del ESP32>/ (o http://192.168.4.1 en su red propia)");
  Serial.println("");
}

void loop()
{
  vTaskDelay(pdMS_TO_TICKS(1000));
}
