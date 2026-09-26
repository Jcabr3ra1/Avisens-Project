#include "ServicioIngesta.h"
#include <esp_system.h>
#include <HTTPClient.h>
#include "config.h"

String generarIdLote() {
  uint8_t bytes[16];
  for (int i = 0; i < 16; i++) {
    bytes[i] = static_cast<uint8_t>(esp_random() & 0xFF);
  }
  // Version 4 (bits 4-7 del byte 6) y variant RFC4122 (bits 6-7 del byte 8):
  // sin esto no es un UUID v4 válido, y el backend lo rechaza (@IsUUID()).
  bytes[6] = (bytes[6] & 0x0F) | 0x40;
  bytes[8] = (bytes[8] & 0x3F) | 0x80;

  char buf[37];
  snprintf(buf, sizeof(buf),
    "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
    bytes[0], bytes[1], bytes[2], bytes[3],
    bytes[4], bytes[5],
    bytes[6], bytes[7],
    bytes[8], bytes[9],
    bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]);
  return String(buf);
}

bool enviarLecturaConReintentos(float temperatura, float humedad, const String &idLote) {
  String body = "{\"id_lote\":\"" + idLote + "\",\"lecturas\":[";
  body += "{\"codigo\":\"" + String(CODIGO_SENSOR_TEMP) + "\",\"valor\":" + String(temperatura, 1) + "},";
  body += "{\"codigo\":\"" + String(CODIGO_SENSOR_HUM) + "\",\"valor\":" + String(humedad, 1) + "}";
  body += "]}";

  for (int intento = 1; intento <= MAX_REINTENTOS_INGESTA; intento++) {
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Token", DEVICE_TOKEN);
    http.setTimeout(TIMEOUT_INGESTA_MS);

    int codigo = http.POST(body);
    if (codigo >= 200 && codigo < 300) {
      Serial.printf("[Ingesta] OK (%d) intento %d/%d, id_lote=%s\n",
                    codigo, intento, MAX_REINTENTOS_INGESTA, idLote.c_str());
      http.end();
      return true;
    }

    Serial.printf("[Ingesta] Fallo intento %d/%d (codigo %d)\n",
                  intento, MAX_REINTENTOS_INGESTA, codigo);
    http.end();

    if (intento < MAX_REINTENTOS_INGESTA) {
      vTaskDelay(pdMS_TO_TICKS(BACKOFF_INGESTA_MS));
    }
  }

  LOG_ERROR("Ingesta: se agotaron los reintentos, ciclo abandonado (id_lote=" + idLote + ")");
  return false;
}
