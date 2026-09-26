#pragma once
// config.example.h — Plantilla de configuración del nodo ESP32.
//
// Copia este archivo como `config.h` (en la misma carpeta) y rellena tus
// valores reales. `config.h` está en .gitignore: tus credenciales NO se suben
// a git. Es el mismo patrón que el `.env.example` del frontend.

#include <Arduino.h>

// ── WiFi ────────────────────────────────────────────────────────────────────
#define WIFI_SSID     "TU_WIFI"
#define WIFI_PASSWORD "TU_PASSWORD"

// ── Identidad del dispositivo ───────────────────────────────────────────────
// Debe coincidir con la fila de este ESP32 en la tabla `dispositivos` del
// backend. `codigo_topic` es el prefijo único de este nodo (p. ej. "galpon1").
#define DEVICE_CODIGO_TOPIC "galpon1"

// ── Backend (pendiente: el envío real contra /ingest queda como paso aparte,
// no lo hace todavía main.cpp) ───────────────────────────────────────────────
// Opción HTTP: URL del endpoint de ingesta + token del dispositivo.
#define BACKEND_URL   "http://192.168.1.100:3000/ingest"
#define DEVICE_TOKEN  "PON_AQUI_EL_TOKEN_DEL_DISPOSITIVO"
// Opción MQTT: broker Mosquitto.
#define MQTT_HOST     "192.168.1.100"
#define MQTT_PORT     1883

// ── Códigos de los sensores ─────────────────────────────────────────────────
// Deben coincidir EXACTAMENTE con el campo `codigo` de la tabla `sensores` del
// backend (ese es el puente físico↔BD; el backend resuelve codigo → sensor_id).
#define CODIGO_SENSOR_TEMP "TEMP-G1-01"
#define CODIGO_SENSOR_HUM  "HUM-G1-01"

// ─── SENSORES (pines) ────────────────────────────────────
#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ135_PIN 34
#define TRIG_AGUA 13
#define ECHO_AGUA 35
#define KY032_PIN 33
// SensorPeso: ver HX711 más abajo

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

// ─── SERVO (Puerta) ──────────────────────────────────────
#define SERVO_PIN 2
#define SERVO_NEUTRO 93
#define SERVO_DURACION_GIRO 300
#define SERVO_TIEMPO_ABIERTA 2000

// ─── HX711 (Celda de Carga) ──────────────────────────────
#define HX711_DT 15                  // DATA pin (GPIO15)
#define HX711_SCK 16
#define HX711_FACTOR_ESCALA 0.453592 // Gramos/unidad (ejemplo: 20kg)
#define UMBRAL_ALIMENTO_BAJO 500.0   // Gramos — Alerta

// ─── UMBRALES DE CONTROL ────────────────────────────────
#define TEMP_FRIO 27.0
#define TEMP_CALOR 32.0
#define HUM_EXTRACTORES 65.0
#define NH3_ALTO 1500
#define NH3_MODERADO 800
#define NIVEL_BOMBA_ON 6.0       // cm
#define NIVEL_BOMBA_OFF 3.0      // cm
#define MAX_FALLOS_SENSOR 3      // Reintentos antes de fail-safe
#define MAX_DISTANCIA_AGUA 400.0 // cm (rango HC-SR04)

// ─── TEMPORIZACIÓN (ms) ──────────────────────────────────
#define INTERVALO_SENSORES 2000
#define INTERVALO_PERSIANA 300000 // 5 min
#define DURACION_PERSIANA 3000
#define PAUSA_PERSIANA 500
#define INTERVALO_ALIMENTO 300000 // 5 min
#define DURACION_ALIMENTO 300000  // 5 min

// ─── FILTRO MEDIA MÓVIL ─────────────────────────────────
#define MOVING_AVG_SIZE 10

// ─── WATCHDOG TIMER ─────────────────────────────────────
#define WDT_TIMEOUT_S 10 // segundos

// ─── SERIAL ─────────────────────────────────────────────
#define BAUD_RATE 115200

// ─── INGESTA HTTP (backend real) ─────────────────────────
#define INTERVALO_ENVIO_MS 5000      // cada cuánto se envía un ciclo
#define TIMEOUT_INGESTA_MS 5000      // por intento
#define MAX_REINTENTOS_INGESTA 3     // agotados => se abandona el ciclo
#define BACKOFF_INGESTA_MS 1000      // espera fija entre intentos

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
// ─── ESTRUCTURA DE DATOS PARA LECTURAS ────────────────────
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
// ─── CONSTANTES Y MACROS ÚTILES ───────────────────────────
// ═══════════════════════════════════════════════════════════

#define LOG_DEBUG(msg) Serial.println(msg)
#define LOG_WARN(msg) \
  Serial.print("⚠ "); \
  Serial.println(msg)
#define LOG_ERROR(msg) \
  Serial.print("❌ "); \
  Serial.println(msg)
