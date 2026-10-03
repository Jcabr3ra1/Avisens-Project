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

#if !defined(WIFI_SSID) || !defined(WIFI_PASSWORD)
#error "Define WIFI_SSID y WIFI_PASSWORD en include/config.h (ver config.example.h) antes de compilar."
#endif
ConexionWiFi conexionWiFi(WIFI_SSID, WIFI_PASSWORD);

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
      LecturaKY032 lecturaKY032 = sensorKY032.leer();
      LecturaUltrasonico lecturaUltrasonico = sensorUltrasonico.leer();
      LecturaPeso lecturaPeso = sensorPeso.leer();

      float temperatura = lecturaDHT.valida ? lecturaDHT.temperatura : 0.0f;
      float humedad = lecturaDHT.valida ? lecturaDHT.humedad : 0.0f;
      int rawNH3 = lecturaMQ135.rawValue;

      // ─── Detectar gradiente térmico (ΔT > 10°C en 5s) ──────────────
      if (lecturaDHT.valida)
      {
        detectarGradienteTermico(temperatura, ahora);
      }

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

// Mantiene la conexión WiFi viva en Core 1 y envía cada INTERVALO_ENVIO_MS
void tareaWiFi(void *pvParameters)
{
  Serial.println("[WiFi Task] Iniciada en Core 1");

  vTaskDelay(pdMS_TO_TICKS(5000));

  for (;;)
  {
    conexionWiFi.actualizar();

    if (!WiFi.isConnected())
    {
      LOG_WARN("WiFi desconectado - Reintentando conexión");
    }
    else if (millis() - ultimaEnvioTelemetria >= INTERVALO_ENVIO_MS)
    {
      ultimaEnvioTelemetria = millis();

      LecturaDHT lectura = leerSnapshotDht();
      unsigned long antiguedadSnapshot = millis() - lectura.timestamp;

      if (!lectura.valida)
      {
        LOG_WARN("Ingesta: DHT sin lectura válida, se omite este ciclo");
      }
      else if (antiguedadSnapshot > UMBRAL_SNAPSHOT_OBSOLETO_MS)
      {
        LOG_WARN("Ingesta: snapshot DHT obsoleto (" + String(antiguedadSnapshot) +
                 "ms) -- tareaGalpon dejó de refrescarlo, se omite");
      }
      else
      {
        String idLote = generarIdLote();
        enviarLecturaConReintentos(lectura.temperatura, lectura.humedad, idLote);
      }
    }

    vTaskDelay(pdMS_TO_TICKS(1000));
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
      8192,
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
  Serial.println("");
}

void loop()
{
  vTaskDelay(pdMS_TO_TICKS(1000));
}
