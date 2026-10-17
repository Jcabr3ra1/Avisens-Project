#pragma once
// config.example.h — Plantilla de configuración del nodo ESP32.
//
// Copia este archivo como `config.h` (en la misma carpeta) y rellena tus
// valores reales. `config.h` está en .gitignore: tus credenciales NO se suben
// a git. Es el mismo patrón que el `.env.example` del frontend.

// ── WiFi ────────────────────────────────────────────────────────────────────
#define WIFI_SSID     "TU_WIFI"
#define WIFI_PASSWORD "TU_PASSWORD"

// ── Transporte del backend ──────────────────────────────────────────────────
// La fase actual es LOCAL: apunta a la IPv4 privada del computador que ejecuta
// Docker. No uses localhost aquí: para el ESP32, localhost es el propio ESP32.
#define BACKEND_MODO_LOCAL       1
#define BACKEND_MODO_PRODUCCION  2
#define BACKEND_MODO             BACKEND_MODO_LOCAL
#define BACKEND_URL              "http://192.168.1.100:3000/ingest"

// Producción requiere selección explícita del modo y conserva TLS validado:
//   #define BACKEND_MODO BACKEND_MODO_PRODUCCION
//   #define BACKEND_URL "https://avisens-project-production.up.railway.app/ingest"
// No cambies a producción hasta completar y revisar la prueba local.
// El token identifica al controlador y al galpón que le asignó el administrador.
#define DEVICE_TOKEN  "PON_AQUI_EL_TOKEN_DEL_DISPOSITIVO"

// Las conexiones DHT22 se asignan en Monitoreo (controlador + tipo + GPIO).
// El firmware consulta /ingest/configuracion cada 30 s con el mismo token.
// No se configuran seriales de sensores ni un token por sensor.

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
