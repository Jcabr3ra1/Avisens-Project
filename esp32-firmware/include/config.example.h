#pragma once
// config.example.h — Plantilla de configuración del nodo ESP32.
//
// Copia este archivo como `config.h` (en la misma carpeta) y rellena tus
// valores reales. `config.h` está en .gitignore: tus credenciales NO se suben
// a git. Es el mismo patrón que el `.env.example` del frontend.

// ── WiFi ────────────────────────────────────────────────────────────────────
#define WIFI_SSID     "TU_WIFI"
#define WIFI_PASSWORD "TU_PASSWORD"

// ── Identidad del dispositivo ───────────────────────────────────────────────
// Debe coincidir con la fila de este ESP32 en la tabla `dispositivos` del
// backend. `codigo_topic` es el prefijo único de este nodo (p. ej. "galpon1").
#define DEVICE_CODIGO_TOPIC "galpon1"

// ── Backend (se usará cuando definamos el transporte: MQTT o HTTP) ──────────
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

// ── Pines (AJUSTA a tu cableado real) ───────────────────────────────────────
#define PIN_DHT       4     // Sensor DHT22 (temperatura + humedad)
#define PIN_RELE      26    // Pin IN del relé que comanda el ventilador
#define PIN_GAS       34    // MQ-135 gas/CO2 (analógico: SOLO pines ADC 32-39)
#define PIN_LUZ       35    // LDR luz (analógico)

// ── Umbrales de control local (el ESP32 decide solo, sin backend) ───────────
// Histéresis: enciende por encima de uno, apaga por debajo de otro. Así el
// ventilador no titila prendiéndose/apagándose alrededor de un único valor.
#define TEMP_ENCIENDE_VENTILADOR 30.0  // °C: por encima → ventilador ENCENDIDO
#define TEMP_APAGA_VENTILADOR    28.0  // °C: por debajo → ventilador apagado

// ── Tiempos ─────────────────────────────────────────────────────────────────
#define INTERVALO_ENVIO_MS 5000  // cada cuánto (ms) reporta la lectura al backend
