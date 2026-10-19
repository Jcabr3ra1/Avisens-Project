#include "ServicioIngesta.h"
#include <esp_system.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "config.h"
#include "ConfigDispositivo.h"

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

static String lecturaJson(const char *codigo, const String &valor) {
  return "{\"codigo\":\"" + String(codigo) + "\",\"valor\":" + valor + "},";
}

bool enviarLecturaConReintentos(const CicloIngesta &ciclo, const String &idLote) {
  String lecturas;
  int LECTURAS_ENVIADAS = 0;
  if (ciclo.incluirDht) {
    lecturas += lecturaJson(CODIGO_SENSOR_TEMP, String(ciclo.temperatura, 1));
    lecturas += lecturaJson(CODIGO_SENSOR_HUM, String(ciclo.humedad, 1));
    LECTURAS_ENVIADAS += 2;
  }
  if (ciclo.incluirAgua) {
    lecturas += lecturaJson(CODIGO_SENSOR_AGUA, String(ciclo.distanciaAgua, 1));
    LECTURAS_ENVIADAS += 1;
  }
  const EstadoActuadores &a = ciclo.actuadores;
  const char *CODIGOS_RELES[4] = {CODIGO_RELE_K1, CODIGO_RELE_K2, CODIGO_RELE_K3, CODIGO_RELE_K4};
  lecturas += lecturaJson(CODIGO_MOTOR_ALIMENTADOR, String(a.alimentador ? 1 : 0));
  lecturas += lecturaJson(CODIGO_MOTOR_PERSIANA, String(a.persiana ? 1 : 0));
  for (int i = 0; i < 4; i++) {
    lecturas += lecturaJson(CODIGOS_RELES[i], String(a.reles[i] ? 1 : 0));
  }
  LECTURAS_ENVIADAS += 6;
  lecturas.remove(lecturas.length() - 1);  // coma final

  String body = "{\"id_lote\":\"" + idLote + "\",\"lecturas\":[" + lecturas + "]}";

  // URL y token salen de la configuración del portal (o de config.h): así
  // se apunta al backend desplegado sin recompilar.
  const ConfigDispositivo &cfg = configDispositivo();
  const bool conTls = cfg.backendUrl.startsWith("https://");

  for (int intento = 1; intento <= MAX_REINTENTOS_INGESTA; intento++) {
    HTTPClient http;
    WiFiClient clientePlano;
    WiFiClientSecure clienteTls;
    if (conTls) {
      // Cifra el tráfico pero no valida el certificado del servidor: evita
      // cargar y renovar la CA en el firmware, a cambio de no detectar un
      // servidor suplantado en la red. Aceptable para el prototipo.
      clienteTls.setInsecure();
      http.begin(clienteTls, cfg.backendUrl);
    } else {
      http.begin(clientePlano, cfg.backendUrl);
    }
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Token", cfg.token);
    http.setTimeout(TIMEOUT_INGESTA_MS);

    int codigo = http.POST(body);
    String respuesta = http.getString();
    http.end();

    if (codigo < 200 || codigo >= 300) {
      // 4xx (401/403 token invalido, 404 ruta o dispositivo inexistente,
      // etc.): es un problema de configuracion/autenticacion, no de red
      // -- reintentar de inmediato no lo arregla. Se abandona el ciclo
      // sin gastar los reintentos restantes. Los codigos negativos
      // (timeout/sin conexion de HTTPClient) y los 5xx siguen
      // reintentando igual que antes.
      if (codigo >= 400 && codigo < 500) {
        LOG_ERROR("Ingesta: error " + String(codigo) +
                  " del backend (no se reintenta -- revisar el token y la URL del backend en el portal)");
        return false;
      }

      Serial.printf("[Ingesta] Fallo intento %d/%d (codigo %d)\n",
                    intento, MAX_REINTENTOS_INGESTA, codigo);
      if (intento < MAX_REINTENTOS_INGESTA) {
        vTaskDelay(pdMS_TO_TICKS(BACKOFF_INGESTA_MS));
      }
      continue;
    }

    JsonDocument doc;
    if (deserializeJson(doc, respuesta) != DeserializationError::Ok) {
      Serial.println("[Ingesta] 2xx pero el cuerpo no es JSON valido");
      if (intento < MAX_REINTENTOS_INGESTA) {
        vTaskDelay(pdMS_TO_TICKS(BACKOFF_INGESTA_MS));
      }
      continue;
    }

    // Un 2xx con JSON valido pero sin el contrato esperado (otro servicio,
    // un proxy, una respuesta generica) no cuenta como exito solo por ser
    // JSON parseable -- se exige la forma real de la respuesta de /ingest.
    JsonVariant campoIgnoradas = doc["ignoradas"];
    JsonVariant campoRegistradas = doc["registradas"];
    JsonVariant campoIdLote = doc["id_lote"];

    bool contratoValido =
        campoIgnoradas.is<JsonArray>() &&
        campoRegistradas.is<int>() &&
        campoIdLote.is<const char *>() &&
        idLote.equals(campoIdLote.as<const char *>());

    if (!contratoValido) {
      Serial.println("[Ingesta] 2xx pero el cuerpo no cumple el contrato esperado de /ingest");
      if (intento < MAX_REINTENTOS_INGESTA) {
        vTaskDelay(pdMS_TO_TICKS(BACKOFF_INGESTA_MS));
      }
      continue;
    }

    JsonArray ignoradas = campoIgnoradas.as<JsonArray>();
    int registradas = campoRegistradas.as<int>();
    if (ignoradas.size() > 0 || registradas != LECTURAS_ENVIADAS) {
      // Reintentar no arregla un codigo mal configurado -- se abandona
      // sin gastar los reintentos que quedan.
      LOG_ERROR("Ingesta: el backend no registro todas las lecturas (revisar "
                "CODIGO_SENSOR_* / CODIGO_MOTOR_* en config.h vs sensores registrados)");
      return false;
    }

    Serial.printf("[Ingesta] OK (%d) intento %d/%d, id_lote=%s\n",
                  codigo, intento, MAX_REINTENTOS_INGESTA, idLote.c_str());
    return true;
  }

  LOG_ERROR("Ingesta: se agotaron los reintentos, ciclo abandonado (id_lote=" + idLote + ")");
  return false;
}
