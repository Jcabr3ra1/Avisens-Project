#pragma once
// config.example.h — Plantilla de configuración PROPIA de cada nodo ESP32.
//
// Copia este archivo como `config.h` (en la misma carpeta) y rellena tus
// valores reales. `config.h` está en .gitignore: tus credenciales NO se suben
// a git. Es el mismo patrón que el `.env.example` del frontend.
//
// Aquí solo va lo que cambia de un nodo a otro (credenciales, identidad,
// códigos de sensores). Pines, umbrales, tiempos y tipos compartidos están
// en `Configuracion.h`, que sí se versiona.

// ── WiFi ────────────────────────────────────────────────────────────────────
#define WIFI_SSID "TU_WIFI"
#define WIFI_PASS "TU_PASSWORD"

// ── Backend: ingesta HTTP (POST /ingest) ────────────────────────────────────
// URL BASE del backend, SIN "/ingest" y sin "/" final (el firmware lo añade).
// Producción: "https://avisens-project-production.up.railway.app"
// Backend en tu PC: "http://IP_DE_TU_PC:3000" (nunca "localhost").
#define BACKEND_URL "https://avisens-project-production.up.railway.app"
// Token del dispositivo: se obtiene con POST /dispositivos/:id/token
// (solo se muestra una vez). Va en la cabecera X-Device-Token.
#define DEVICE_TOKEN "PON_AQUI_EL_TOKEN_DEL_DISPOSITIVO"

// ── Códigos de los sensores ─────────────────────────────────────────────────
// Deben coincidir EXACTAMENTE con el campo `codigo` de la tabla `sensores`,
// estar en estado `activo` y pertenecer al MISMO dispositivo del token.
// Si no coinciden, el backend responde 201 pero ignora la lectura.
#define CODIGO_SENSOR_TEMP "TEMP-G1-01"  // tipo: temperatura (°C)
#define CODIGO_SENSOR_HUM "HUM-G1-01"    // tipo: humedad (%)
// Opcionales: deja "" para no enviar esa lectura.
#define CODIGO_SENSOR_NH3 "NH3-G1-01"         // MQ135, valor ADC crudo 0-4095
#define CODIGO_SENSOR_PESO "PESO-G1-01"       // HX711, gramos en tolva
#define CODIGO_SENSOR_AGUA "AGUA-G1-01"       // HC-SR04, distancia al agua (cm)
#define CODIGO_SENSOR_PRESENCIA "PRES-G1-01"  // KY-032, 1 = presencia, 0 = libre

// ── MQTT (opcional) ─────────────────────────────────────────────────────────
// Telemetría en tiempo real y comandos remotos de actuadores. Déjalo en ""
// si no tienes un broker: el envío al backend por HTTP funciona sin él.
#define MQTT_BROKER_HOST ""
#define MQTT_BROKER_PORT 1883
#define MQTT_DEVICE_ID "galpon1"  // prefijo de los topics: avisens/<id>/...
#define MQTT_USUARIO ""
#define MQTT_CLAVE ""
