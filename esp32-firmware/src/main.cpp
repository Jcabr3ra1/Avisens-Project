// main.cpp — Firmware del nodo ESP32 de Avisens.
//
// Qué hace:
//   1. Se conecta al WiFi.
//   2. Lee el sensor DHT22 (temperatura + humedad).
//   3. Controla el ventilador LOCALMENTE por umbral (el ESP32 decide solo; el
//      backend NO controla — ver README).
//   4. Reporta la lectura al backend cada INTERVALO_ENVIO_MS (hoy es un stub:
//      el transporte MQTT/HTTP está pendiente de decidir).
//
// Framework Arduino sobre PlatformIO (C++ en VS Code, sin el Arduino IDE).

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include "config.h"

// Tipo de sensor DHT (DHT22 = AM2302). Cámbialo a DHT11 si usas ese modelo.
#define DHT_TIPO DHT22

// Muchos módulos de relé son "activos en BAJO": LOW = encendido. Si el tuyo va
// al revés, intercambia estos dos valores.
#define RELE_ENCENDIDO LOW
#define RELE_APAGADO   HIGH

DHT dht(PIN_DHT, DHT_TIPO);

// Estado actual del ventilador — se usa para la histéresis y para reportarlo.
bool ventiladorEncendido = false;

// Momento (millis) del último reporte al backend.
unsigned long ultimoEnvio = 0;

// ── WiFi ────────────────────────────────────────────────────────────────────
void conectarWiFi() {
  Serial.printf("[WiFi] Conectando a %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] Conectado. IP: %s\n",
                WiFi.localIP().toString().c_str());
}

// ── Control local de actuadores ─────────────────────────────────────────────
// El ESP32 decide SOLO: enciende el ventilador si la temperatura sube del
// umbral superior y lo apaga cuando baja del inferior (histéresis). Funciona
// aunque no haya red: la seguridad del galpón no depende de internet.
void controlarActuadores(float temperatura) {
  if (!ventiladorEncendido && temperatura >= TEMP_ENCIENDE_VENTILADOR) {
    ventiladorEncendido = true;
    digitalWrite(PIN_RELE, RELE_ENCENDIDO);
    Serial.println("[Actuador] Ventilador ENCENDIDO");
  } else if (ventiladorEncendido && temperatura <= TEMP_APAGA_VENTILADOR) {
    ventiladorEncendido = false;
    digitalWrite(PIN_RELE, RELE_APAGADO);
    Serial.println("[Actuador] Ventilador apagado");
  }
}

// ── Envío al backend (PENDIENTE de decidir transporte) ──────────────────────
// Hoy solo imprime por el monitor serie lo que ENVIARÍA. Cuando definamos el
// transporte (MQTT o HTTP), la implementación va aquí. Ver README →
// "Enviar los datos al backend".
//
// Importante: el backend identifica el sensor por su CÓDIGO, no por un id
// numérico. La identidad viaja como: DEVICE_CODIGO_TOPIC (este dispositivo) +
// el código del sensor (p. ej. "TEMP-G1-01"). NUNCA quemar ids de BD aquí.
void enviarLectura(float temperatura, float humedad) {
  Serial.printf("[Envío] %s → temp=%.1f C  hum=%.1f %%  ventilador=%s\n",
                DEVICE_CODIGO_TOPIC, temperatura, humedad,
                ventiladorEncendido ? "on" : "off");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Sin WiFi, se omite el envio");
    return;
  }

  // Lote con las dos lecturas del DHT (temperatura y humedad) en un solo POST.
  // El backend identifica cada sensor por su CÓDIGO, no por un id numérico.
  String body = "{\"lecturas\":[";
  body += "{\"codigo\":\"" + String(CODIGO_SENSOR_TEMP) +
          "\",\"valor\":" + String(temperatura, 1) + "},";
  body += "{\"codigo\":\"" + String(CODIGO_SENSOR_HUM) +
          "\",\"valor\":" + String(humedad, 1) + "}";
  body += "]}";

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);  // autentica al dispositivo

  int codigo = http.POST(body);
  if (codigo > 0) {
    Serial.printf("[HTTP] %d %s\n", codigo, http.getString().c_str());
  } else {
    Serial.printf("[HTTP] Error: %s\n", http.errorToString(codigo).c_str());
  }
  http.end();
}

// ── Setup / loop ────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Nodo ESP32 Avisens ===");

  pinMode(PIN_RELE, OUTPUT);
  digitalWrite(PIN_RELE, RELE_APAGADO);  // arranca apagado por seguridad

  // Pull-up interna en la línea de datos del DHT: hace de reemplazo cuando falta
  // la resistencia externa de 10 kOhm (típico en el sensor "pelado" de 4 patas).
  // Sin un nivel alto en reposo, el DHT no responde y la lectura sale NaN.
  pinMode(PIN_DHT, INPUT_PULLUP);

  dht.begin();
  conectarWiFi();
}

void loop() {
  // Reconecta si se cayó el WiFi (el control local sigue funcionando igual).
  if (WiFi.status() != WL_CONNECTED) {
    conectarWiFi();
  }

  float temperatura = dht.readTemperature();
  float humedad = dht.readHumidity();

  // El DHT a veces devuelve NaN (lectura fallida): la ignoramos y reintentamos.
  if (isnan(temperatura) || isnan(humedad)) {
    Serial.println("[DHT] Lectura invalida, reintentando...");
    delay(2000);
    return;
  }

  // 1) Control local INMEDIATO (no depende de la red).
  controlarActuadores(temperatura);

  // 2) Reporte al backend cada INTERVALO_ENVIO_MS.
  if (millis() - ultimoEnvio >= INTERVALO_ENVIO_MS) {
    ultimoEnvio = millis();
    enviarLectura(temperatura, humedad);
  }

  delay(2000);  // el DHT22 no se puede leer más rápido que ~cada 2 s
}
