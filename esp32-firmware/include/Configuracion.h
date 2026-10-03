#pragma once
// Configuracion.h — Parámetros versionados del nodo ESP32.
//
// Primero incluye `config.h` (gitignored: credenciales y datos propios de
// cada nodo) y después define todo lo que es igual para cualquier nodo:
// pines, umbrales, temporización, tareas FreeRTOS, tipos compartidos.
// Si cambias algo aquí, cambia para todo el equipo.

#include <Arduino.h>

#if !__has_include("config.h")
#error "Falta include/config.h: copia include/config.example.h como include/config.h y rellénalo"
#endif
#include "config.h"

// ═══════════════════════════════════════════════════════════
// ─── VALIDACIÓN DE config.h ───────────────────────────────
// ═══════════════════════════════════════════════════════════

// Compatibilidad con plantillas anteriores que usaban WIFI_PASSWORD.
#if !defined(WIFI_PASS) && defined(WIFI_PASSWORD)
#define WIFI_PASS WIFI_PASSWORD
#endif

#if !defined(WIFI_SSID) || !defined(WIFI_PASS)
#error "config.h debe definir WIFI_SSID y WIFI_PASS"
#endif

#if !defined(BACKEND_URL) || !defined(DEVICE_TOKEN)
#error "config.h debe definir BACKEND_URL y DEVICE_TOKEN (ingesta HTTP)"
#endif

#if !defined(CODIGO_SENSOR_TEMP) || !defined(CODIGO_SENSOR_HUM)
#error "config.h debe definir al menos CODIGO_SENSOR_TEMP y CODIGO_SENSOR_HUM"
#endif

// Sensores opcionales: un código vacío ("") significa que esa lectura no se
// envía a /ingest. Solo deben activarse los que existen en la tabla `sensores`.
#ifndef CODIGO_SENSOR_NH3
#define CODIGO_SENSOR_NH3 ""
#endif
#ifndef CODIGO_SENSOR_PESO
#define CODIGO_SENSOR_PESO ""
#endif
#ifndef CODIGO_SENSOR_AGUA
#define CODIGO_SENSOR_AGUA ""
#endif
#ifndef CODIGO_SENSOR_PRESENCIA
#define CODIGO_SENSOR_PRESENCIA ""
#endif

// MQTT es opcional: sin broker el nodo sigue enviando al backend por HTTP.
#ifndef MQTT_BROKER_HOST
#define MQTT_BROKER_HOST ""
#endif
#ifndef MQTT_BROKER_PORT
#define MQTT_BROKER_PORT 1883
#endif
#ifndef MQTT_DEVICE_ID
#define MQTT_DEVICE_ID "galpon1"
#endif
#ifndef MQTT_USUARIO
#define MQTT_USUARIO ""
#endif
#ifndef MQTT_CLAVE
#define MQTT_CLAVE ""
#endif

// Servidor NTP para fechar las lecturas (fecha_dispositivo en /ingest).
#ifndef NTP_SERVIDOR
#define NTP_SERVIDOR "pool.ntp.org"
#endif

// ═══════════════════════════════════════════════════════════
// ─── PINES ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

// ─── SENSORES ────────────────────────────────────────────
#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ135_PIN 34
#define TRIG_AGUA 13
#define ECHO_AGUA 35
#define KY032_PIN 33

// ─── RELAY ───────────────────────────────────────────────
#define K1_PIN 32 // Calefacción/Bombillos
#define K2_PIN 25 // Ventilador
#define K3_PIN 27 // Extractor
#define K4_PIN 14 // Bomba agua

// ─── L293D CANAL A (Persiana) ────────────────────────────
#define EN1_PIN 5
#define IN1_PIN 18
#define IN2_PIN 19

// ─── L293D CANAL B (Tornillo sinfín) ─────────────────────
#define EN2_PIN 21
#define IN3_PIN 22
#define IN4_PIN 23
#define PWM_ALIMENTADOR 128 // 50 %: torque moderado y consumo controlado

// ─── SERVO (Puerta) ──────────────────────────────────────
#define SERVO_PIN 2
#define SERVO_NEUTRO 93
#define SERVO_DURACION_GIRO 300
#define SERVO_TIEMPO_ABIERTA 2000
#define ANGULO_CERRADA 0
#define ANGULO_ABIERTA 90

// ─── HX711 (Celda de Carga) ──────────────────────────────
#define HX711_DT 15
#define HX711_SCK 16
#define HX711_FACTOR_ESCALA 0.453592 // Gramos/unidad (ejemplo: 20kg)
#define HX711_BITS 24
#define HX711_SATURACION_POS 8388607L  // 2^23 - 1
#define HX711_SATURACION_NEG -8388608L // -2^23
#define HX711_ADC_FONDO_ESCALA 16777216.0f
#define HX711_TIMEOUT_MS 1000
#define HX711_ESPERA_MUESTRA_MS 100 // El HX711 muestrea a 10 SPS
#define HX711_MUESTRAS_TARA 10
#define UMBRAL_ALIMENTO_BAJO 500.0 // Gramos — Alerta

// ─── ADC ESP32 ───────────────────────────────────────────
#define ADC_VREF 3.3f
#define ADC_MAX_CUENTAS 4095.0f

// ─── HC-SR04 ─────────────────────────────────────────────
#define TRIG_PULSO_US 10
#define ECHO_TIMEOUT_US 30000          // ~400 cm
#define VELOCIDAD_SONIDO_CM_US 0.0343f // 343 m/s
#define MIN_DISTANCIA_AGUA 0.5f        // cm
#define MAX_DISTANCIA_AGUA 400.0       // cm

// ─── KY-032 ──────────────────────────────────────────────
#define KY032_DEBOUNCE_MS 50
#define KY032_TRABADO_MS 120000 // 120 s en LOW => sensor trabado

// ═══════════════════════════════════════════════════════════
// ─── UMBRALES DE CONTROL ──────────────────────────────────
// ═══════════════════════════════════════════════════════════

#define TEMP_FRIO 27.0
#define TEMP_CALOR 32.0
#define HUM_EXTRACTORES 65.0
#define NH3_ALTO 1500
#define NH3_MODERADO 800
#define NIVEL_BOMBA_ON 6.0  // cm
#define NIVEL_BOMBA_OFF 3.0 // cm
#define MAX_FALLOS_SENSOR 3 // Reintentos antes de fail-safe

// Rango físico plausible del DHT22
#define TEMP_MIN_VALIDA -10.0f
#define TEMP_MAX_VALIDA 60.0f
#define HUM_MIN_VALIDA 0.0f
#define HUM_MAX_VALIDA 100.0f

#define UMBRAL_GRADIENTE_TERMICO 10.0f // °C
#define VENTANA_GRADIENTE_MS 5000

// ═══════════════════════════════════════════════════════════
// ─── TEMPORIZACIÓN (ms) ───────────────────────────────────
// ═══════════════════════════════════════════════════════════

#define INTERVALO_SENSORES 2000
#define INTERVALO_PERSIANA 300000 // 5 min
#define DURACION_PERSIANA 3000
#define PAUSA_PERSIANA 500
#define INTERVALO_ALIMENTO 300000 // 5 min
#define DURACION_ALIMENTO 300000  // 5 min

#define CICLOS_ARRANQUE_MIN 10
#define TIMEOUT_CALIBRACION_MS 1500

#define MOVING_AVG_SIZE 10

#define WDT_TIMEOUT_S 10

#define BAUD_RATE 115200
#define SERIAL_TIMEOUT_MS 50

// ═══════════════════════════════════════════════════════════
// ─── TAREAS FREERTOS ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════

#define CORE_CONTROL 0
#define CORE_RED 1

#define STACK_TAREA_CONTROL 16384
#define STACK_TAREA_RED 8192
#define STACK_TAREA_INGESTA 12288 // El handshake TLS (HTTPS) corre en esta pila

#define PRIORIDAD_TAREA_CONTROL 2
#define PRIORIDAD_TAREA_RED 1
#define PRIORIDAD_TAREA_INGESTA 1

#define PERIODO_TAREA_CONTROL_MS 10
#define PERIODO_TAREA_RED_MS 50
#define PERIODO_TAREA_INGESTA_MS 200

#define LONGITUD_COLA_COMANDOS 8
#define LONGITUD_COLA_EVENTOS 8
#define LONGITUD_BUZON 1 // Buzón de un solo elemento (xQueueOverwrite)

// ═══════════════════════════════════════════════════════════
// ─── MQTT ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

#define MQTT_KEEPALIVE_S 30
#define MQTT_BUFFER_SIZE 1024
#define MQTT_REINTENTO_MS 5000
#define MQTT_QOS_COMANDOS 1

#define INTERVALO_TELEMETRIA_RAPIDA 5000
#define INTERVALO_TELEMETRIA_LENTA 30000
#define INTERVALO_DIAGNOSTICO 60000

#define JSON_CAPACIDAD_TELEMETRIA 256
#define JSON_CAPACIDAD_DIAGNOSTICO 384
#define JSON_CAPACIDAD_ESTADO 768
#define JSON_CAPACIDAD_EVENTO 384
#define JSON_CAPACIDAD_COMANDO 128

// ═══════════════════════════════════════════════════════════
// ─── INGESTA HTTP (backend) ───────────────────────────────
// ═══════════════════════════════════════════════════════════

#define INTERVALO_ENVIO_MS 5000  // cada cuánto se envía un ciclo
#define TIMEOUT_INGESTA_MS 5000  // por intento
#define MAX_REINTENTOS_INGESTA 3 // agotados => se abandona el ciclo
#define BACKOFF_INGESTA_MS 1000  // espera fija entre intentos

#define JSON_CAPACIDAD_INGESTA 768
#define JSON_CAPACIDAD_RESPUESTA_INGESTA 768

// Si tareaControl deja de refrescar el snapshot, esto evita reenviar
// indefinidamente el mismo dato viejo como si fuera nuevo.
#define UMBRAL_SNAPSHOT_OBSOLETO_MS (INTERVALO_SENSORES * 2)

// ═══════════════════════════════════════════════════════════
// ─── MÁQUINAS DE ESTADO (enum class) ──────────────────────
// ═══════════════════════════════════════════════════════════

enum class EstadoSistema : uint8_t
{
  INIT,        // Inicialización (lectura pins, setup básico)
  CALIBRATION, // Calibración (tara HX711 + ajustes)
  MONITORING,  // Monitoreo activo (lectura sensores)
  ACTUATION,   // Actuación en curso (control actuadores)
  ERROR,       // Error crítico — Fail-Safe activado
  SHUTDOWN     // Apagado controlado
};

enum class EstadoPuerta : uint8_t
{
  CERRADA,
  ABRIENDO,
  ABIERTA,
  CERRANDO
};

enum class EstadoPersiana : uint8_t
{
  QUIETA,
  ABRIENDO,
  PAUSA,
  CERRANDO
};

enum class EstadoAlimentador : uint8_t
{
  APAGADO,
  ENCENDIDO
};

enum class EstadoSensorUltrasonico : uint8_t
{
  OK = 0,
  TIMEOUT = 1,
  OUT_OF_RANGE = 2,
  ERROR = 3
};

// ═══════════════════════════════════════════════════════════
// ─── ESTRUCTURAS DE LECTURA ───────────────────────────────
// ═══════════════════════════════════════════════════════════

struct LecturaDHT
{
  float temperatura;
  float humedad;
  bool valida;
  unsigned long timestamp;
};

struct LecturaMQ135
{
  int rawValue;
  float voltaje;
  bool valida;
  unsigned long timestamp;
};

struct LecturaUltrasonico
{
  float distancia; // cm
  EstadoSensorUltrasonico estado;
  unsigned long timestamp;
};

struct LecturaKY032
{
  bool presencia;
  unsigned long timestamp;
};

// ═══════════════════════════════════════════════════════════
// ─── MENSAJES ENTRE TAREAS (Mensajeria) ───────────────────
// ═══════════════════════════════════════════════════════════

// Foto de los sensores que tareaControl publica y tareaRed/tareaIngesta leen.
// Cada flag *Ok indica si el valor asociado es una lectura real y vigente.
struct SnapshotTelemetria
{
  float temperatura;
  float humedad;
  bool dhtOk;

  int gasRaw;
  float gasVoltaje;
  bool gasOk;

  float peso;
  bool pesoOk;

  bool obstaculo;

  float distanciaAgua;
  EstadoSensorUltrasonico estadoAgua;
  bool aguaOk;
  bool bombaActiva;

  uint32_t fallosAcumulados;
  EstadoSistema estadoSistema;
  unsigned long uptimeMs; // millis() en el momento de la captura
};

// Solo miembros de 1 byte: sin relleno, para que memcmp sea fiable.
struct EstadoActuadores
{
  bool calefactor;
  bool ventilador;
  bool extractor;
  bool bomba;
  bool manualCalefactor;
  bool manualVentilador;
  bool manualExtractor;
  bool manualBomba;
  bool alimentadorActivo;
  bool alimentadorBloqueado;
  EstadoPersiana persiana;
  EstadoPuerta puerta;
};

struct ComandoActuador
{
  uint8_t rele; // 1..4 (K1..K4)
  bool modoManual;
  bool estado;
};

struct EventoFalla
{
  char origen[32];
  char mensaje[96];
  char nivel[16];
  uint32_t fallosAcumulados;
};

// ═══════════════════════════════════════════════════════════
// ─── LOGS ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

#define LOG_DEBUG(msg) Serial.println(msg)
#define LOG_WARN(msg) \
  Serial.print("⚠ "); \
  Serial.println(msg)
#define LOG_ERROR(msg) \
  Serial.print("❌ "); \
  Serial.println(msg)
