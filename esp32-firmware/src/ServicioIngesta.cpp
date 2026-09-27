#include "ServicioIngesta.h"

#include <esp_system.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "Nodo.h"
#include "Mensajeria.h"

ServicioIngesta::ServicioIngesta()
    : ultimoEnvio_(0)
{
}

void ServicioIngesta::actualizar()
{
  unsigned long ahora = millis();
  if (ahora - ultimoEnvio_ < INTERVALO_ENVIO_MS)
  {
    return;
  }
  ultimoEnvio_ = ahora;

  if (!conexionWiFi.estaConectado())
  {
    return;
  }

  SnapshotTelemetria snapshot;
  if (!Mensajeria::leerTelemetria(snapshot))
  {
    return;
  }

  // Un snapshot demasiado antiguo no puede publicarse como lectura vigente,
  // igual que una lectura DHT inválida nunca se degrada a 0.0 en TareaControl.
  if ((ahora - snapshot.uptimeMs) > UMBRAL_SNAPSHOT_OBSOLETO_MS || !snapshot.dhtOk)
  {
    LOG_WARN("ServicioIngesta: snapshot obsoleto o DHT en error, se omite el envío");
    return;
  }

  String idLote = generarUUID();
  String payload = construirPayload(snapshot, idLote);

  for (uint8_t intento = 1; intento <= MAX_REINTENTOS_INGESTA; intento++)
  {
    if (enviarHttp(payload))
    {
      return;
    }

    if (intento < MAX_REINTENTOS_INGESTA)
    {
      vTaskDelay(pdMS_TO_TICKS(BACKOFF_INGESTA_MS));
    }
  }

  LOG_ERROR("ServicioIngesta: agotados los reintentos de /ingest, id_lote=" + idLote);
}

bool ServicioIngesta::enviarHttp(const String &payload)
{
  HTTPClient http;
  String url = String(BACKEND_URL) + "/ingest";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.setTimeout(TIMEOUT_INGESTA_MS);

  int codigo = http.POST(payload);
  http.end();

  if (codigo >= 200 && codigo < 300)
  {
    return true;
  }

  LOG_WARN("ServicioIngesta: /ingest respondió " + String(codigo));
  return false;
}

String ServicioIngesta::construirPayload(const SnapshotTelemetria &snapshot, const String &idLote) const
{
  StaticJsonDocument<JSON_CAPACIDAD_INGESTA> doc;
  doc["id_lote"] = idLote;

  JsonArray lecturas = doc.createNestedArray("lecturas");

  JsonObject temperatura = lecturas.createNestedObject();
  temperatura["codigo"] = CODIGO_SENSOR_TEMP;
  temperatura["valor"] = snapshot.temperatura;

  JsonObject humedad = lecturas.createNestedObject();
  humedad["codigo"] = CODIGO_SENSOR_HUM;
  humedad["valor"] = snapshot.humedad;

  String payload;
  serializeJson(doc, payload);
  return payload;
}

String ServicioIngesta::generarUUID()
{
  uint8_t bytes[16];
  for (int i = 0; i < 16; i++)
  {
    bytes[i] = static_cast<uint8_t>(esp_random() & 0xFF);
  }

  bytes[6] = (bytes[6] & 0x0F) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3F) | 0x80; // variante RFC 4122

  char buffer[37];
  snprintf(buffer, sizeof(buffer),
           "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
           bytes[0], bytes[1], bytes[2], bytes[3],
           bytes[4], bytes[5],
           bytes[6], bytes[7],
           bytes[8], bytes[9],
           bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]);

  return String(buffer);
}
