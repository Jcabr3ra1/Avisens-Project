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

// ── Backend ─────────────────────────────────────────────────────────────────
// Opción HTTP (la que usa ServicioIngesta): URL COMPLETA del endpoint de
// ingesta, con la IP LAN del equipo que corre el backend. Nunca `localhost`:
// desde el ESP32, localhost es el propio ESP32.
// DEVICE_TOKEN: el que devuelve el backend al registrar el dispositivo
// (POST /v1/dispositivos) o al regenerarlo (POST /v1/dispositivos/:id/token).
#define BACKEND_URL   "http://192.168.1.100:3000/ingest"
#define DEVICE_TOKEN  "PON_AQUI_EL_TOKEN_DEL_DISPOSITIVO"
// Destino espejo (opcional): recibe las mismas lecturas, pero solo el destino
// principal de arriba manda órdenes a los relés. Se puede cambiar luego desde
// el portal. Sin estas líneas, o con la URL vacía, no hay espejo.
// #define BACKEND_URL_2   "https://tu-backend.up.railway.app/ingest"
// #define DEVICE_TOKEN_2  "TOKEN_DEL_DISPOSITIVO_EN_ESE_BACKEND"
// Opción MQTT: broker Mosquitto.
#define MQTT_HOST     "192.168.1.100"
#define MQTT_PORT     1883

// ── Códigos de los sensores ─────────────────────────────────────────────────
// Deben coincidir EXACTAMENTE con el campo `codigo` de la tabla `sensores` del
// backend (ese es el puente físico↔BD; el backend resuelve codigo → sensor_id).
#define CODIGO_SENSOR_TEMP "TEMP-G1-01"
#define CODIGO_SENSOR_HUM  "HUM-G1-01"
// HC-SR04: distancia del sensor a la superficie del agua (cm). Más
// distancia = menos agua.
#define CODIGO_SENSOR_AGUA "AGUA-G1-01"
// MQ-135: ADC crudo filtrado (0-4095), no una concentración en ppm: sin
// calibrar contra un gas de referencia no hay conversión honesta a ppm.
#define CODIGO_SENSOR_GAS  "GAS-G1-01"
// HX711: peso en gramos de la tolva. Solo se envía después de TARA.
#define CODIGO_SENSOR_PESO "PESO-G1-01"
// Estado de los motores del L293D: se reportan como sensores con unidad
// "estado" (1 = encendido, 0 = apagado).
#define CODIGO_MOTOR_ALIMENTADOR "MOT-ALIM-G1-01"
#define CODIGO_MOTOR_PERSIANA    "MOT-PERS-G1-01"
// Relés K1-K4, también como sensores de "estado" (1 = encendido).
#define CODIGO_RELE_K1 "REL-K1-G1-01" // Bombillos (calefacción)
#define CODIGO_RELE_K2 "REL-K2-G1-01" // Ventiladores
#define CODIGO_RELE_K3 "REL-K3-G1-01" // Extractores
#define CODIGO_RELE_K4 "REL-K4-G1-01" // Bomba de agua

// ─── Portal web y actualización por WiFi (OTA) ───────────
// En http://<IP del ESP32>/ : estado, /config (WiFi, URL del backend y
// token, guardados en el ESP32) y /actualizar (subir firmware .bin).
// Usuario "admin" con esta clave. Lo de arriba (WiFi, BACKEND_URL,
// DEVICE_TOKEN) queda como configuración de fábrica.
#define PORTAL_PASSWORD "CAMBIA_ESTA_CLAVE"
// Red propia "Avisens-XXXX" que el ESP32 crea si no logra conectarse
// al WiFi; el portal queda en http://192.168.4.1. Mínimo 8 caracteres.
#define PORTAL_AP_PASSWORD "CAMBIA_ESTA_CLAVE"
#define PORTAL_AP_TRAS_MS 60000 // sin WiFi este tiempo -> red propia

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
#define ANGULO_CERRADA 0
#define ANGULO_ABIERTA 90

// ─── HX711 (Celda de Carga) ──────────────────────────────
#define HX711_DT 15                  // DATA pin (GPIO15)
#define HX711_SCK 16
#define HX711_FACTOR_ESCALA 0.453592 // Gramos/unidad (ejemplo: 20kg)
// 1 solo después de ajustar HX711_FACTOR_ESCALA con un peso conocido.
// Con 0 el peso se envía con calidad "sospechosa" y la web lo muestra como
// sin calibrar: el factor de ejemplo no da gramos reales.
#define HX711_CALIBRADO 0
#define UMBRAL_ALIMENTO_BAJO 500.0   // Gramos — Alerta

// ─── UMBRALES DE CONTROL ────────────────────────────────
#define TEMP_FRIO 27.0
#define TEMP_CALOR 32.0
#define HUM_EXTRACTORES 65.0
#define NH3_ALTO 1500
#define NH3_MODERADO 800
#define NIVEL_BOMBA_ON 5.0       // cm: más distancia = menos agua -> llenar
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

// Sin red las lecturas se guardan en memoria y se reenvían con su hora al
// volver. Una por INTERVALO_BUFFER_MS; con 48 entradas cubre ~48 minutos.
#define BUFFER_LECTURAS_CAPACIDAD 48
#define INTERVALO_BUFFER_MS 60000

// Si tareaGalpon() deja de refrescar el snapshot (colgado, o Core 0 con
// problemas), esto evita reenviar indefinidamente el mismo dato viejo
// como si fuera nuevo. El doble de INTERVALO_SENSORES es un margen
// generoso, no acoplado a INTERVALO_ENVIO_MS de ningún dispositivo.
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
