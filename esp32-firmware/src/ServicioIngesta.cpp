#include "ServicioIngesta.h"

#include <esp_system.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <HTTPClient.h>
#include <sys/time.h>
#include <time.h>

#include "Nodo.h"
#include "Mensajeria.h"

// Cualquier epoch anterior a 2024 significa que el SNTP aún no sincronizó
static constexpr time_t EPOCH_MINIMA_VALIDA = 1704067200;

ServicioIngesta::ServicioIngesta()
    : ultimoEnvio_(0),
      ntpIniciado_(false)
{
  // BACKEND_URL es la base del backend; se tolera que alguien la haya
  // escrito ya con "/ingest" o con "/" final para no acabar en /ingest/ingest.
  url_ = BACKEND_URL;
  while (url_.endsWith("/"))
  {
    url_.remove(url_.length() - 1);
  }
  if (!url_.endsWith("/ingest"))
  {
    url_ += "/ingest";
  }
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

  if (!ntpIniciado_)
  {
    // configTime necesita la pila de red levantada: se arranca con el primer WiFi
    configTime(0, 0, NTP_SERVIDOR);
    ntpIniciado_ = true;
  }

  SnapshotTelemetria snapshot;
  if (!Mensajeria::leerTelemetria(snapshot))
  {
    return;
  }

  // Un snapshot demasiado antiguo no puede publicarse como lectura vigente
  if ((ahora - snapshot.uptimeMs) > UMBRAL_SNAPSHOT_OBSOLETO_MS)
  {
    LOG_WARN("ServicioIngesta: snapshot obsoleto, se omite el envío");
    return;
  }

  String idLote = generarUUID();
  String payload;
  size_t enviadas = construirPayload(snapshot, idLote, payload);
  if (enviadas == 0)
  {
    LOG_WARN("ServicioIngesta: ningún sensor con lectura válida, se omite el envío");
    return;
  }

  // Todos los reintentos mandan el mismo cuerpo (mismo id_lote): el backend
  // reconoce el reintento como el mismo lote y no duplica mediciones.
  for (uint8_t intento = 1; intento <= MAX_REINTENTOS_INGESTA; intento++)
  {
    ResultadoEnvio resultado = enviarHttp(payload, idLote, enviadas);
    if (resultado == ResultadoEnvio::OK)
    {
      Serial.printf("[Ingesta] OK %u lecturas, intento %u/%u, id_lote=%s\n",
                    static_cast<unsigned>(enviadas), intento, MAX_REINTENTOS_INGESTA,
                    idLote.c_str());
      return;
    }
    if (resultado == ResultadoEnvio::ABANDONAR)
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

ServicioIngesta::ResultadoEnvio ServicioIngesta::enviarHttp(const String &payload,
                                                            const String &idLote,
                                                            size_t enviadas)
{
  HTTPClient http;
  if (!http.begin(url_))
  {
    LOG_ERROR("ServicioIngesta: URL inválida: " + url_);
    return ResultadoEnvio::ABANDONAR;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.setTimeout(TIMEOUT_INGESTA_MS);

  int codigo = http.POST(payload);
  String respuesta = (codigo > 0) ? http.getString() : String();
  http.end();

  if (codigo <= 0)
  {
    LOG_WARN("ServicioIngesta: sin respuesta de " + url_ + " (" + HTTPClient::errorToString(codigo) + ")");
    return ResultadoEnvio::REINTENTAR;
  }

  if (codigo == 401)
  {
    LOG_ERROR("ServicioIngesta: 401, DEVICE_TOKEN inválido o dispositivo/galpón inactivo");
    return ResultadoEnvio::ABANDONAR;
  }

  if (codigo >= 400 && codigo < 500 && codigo != 408 && codigo != 429)
  {
    LOG_ERROR("ServicioIngesta: /ingest rechazó el lote (" + String(codigo) + "): " + respuesta);
    return ResultadoEnvio::ABANDONAR;
  }

  if (codigo < 200 || codigo >= 300)
  {
    LOG_WARN("ServicioIngesta: /ingest respondió " + String(codigo));
    return ResultadoEnvio::REINTENTAR;
  }

  // Un 2xx con JSON válido pero sin el contrato esperado (otro servicio, un
  // proxy, una respuesta genérica) no cuenta como éxito solo por ser JSON.
  StaticJsonDocument<JSON_CAPACIDAD_RESPUESTA_INGESTA> doc;
  if (deserializeJson(doc, respuesta) != DeserializationError::Ok)
  {
    LOG_WARN("ServicioIngesta: 2xx pero el cuerpo no es JSON válido");
    return ResultadoEnvio::REINTENTAR;
  }

  JsonVariant campoIgnoradas = doc["ignoradas"];
  JsonVariant campoRegistradas = doc["registradas"];
  JsonVariant campoIdLote = doc["id_lote"];

  bool contratoValido =
      campoIgnoradas.is<JsonArray>() &&
      campoRegistradas.is<int>() &&
      campoIdLote.is<const char *>() &&
      idLote.equals(campoIdLote.as<const char *>());

  if (!contratoValido)
  {
    LOG_WARN("ServicioIngesta: 2xx pero el cuerpo no cumple el contrato de /ingest");
    return ResultadoEnvio::REINTENTAR;
  }

  JsonArray ignoradas = campoIgnoradas.as<JsonArray>();
  int registradas = campoRegistradas.as<int>();
  if (ignoradas.size() > 0 || registradas != static_cast<int>(enviadas))
  {
    // Reintentar no arregla un código mal configurado: el lote ya quedó
    // registrado (parcialmente) y un reintento devolvería lo mismo.
    String codigos;
    for (JsonVariant codigoIgnorado : ignoradas)
    {
      codigos += String(codigoIgnorado.as<const char *>()) + " ";
    }
    LOG_ERROR("ServicioIngesta: registradas " + String(registradas) + "/" + String(enviadas) +
              ". Códigos ignorados (no existen, inactivos o de otro dispositivo): " + codigos);
    return ResultadoEnvio::ABANDONAR;
  }

  return ResultadoEnvio::OK;
}

void ServicioIngesta::agregarLectura(JsonArray &lecturas, const char *codigo, float valor)
{
  // Código vacío => ese sensor no está dado de alta en el backend
  if (codigo == nullptr || codigo[0] == '\0')
  {
    return;
  }

  JsonObject lectura = lecturas.createNestedObject();
  lectura["codigo"] = codigo;
  lectura["valor"] = valor;
}

size_t ServicioIngesta::construirPayload(const SnapshotTelemetria &snapshot,
                                         const String &idLote,
                                         String &payload) const
{
  StaticJsonDocument<JSON_CAPACIDAD_INGESTA> doc;
  doc["id_lote"] = idLote;

  char fecha[32];
  if (fechaCaptura(snapshot.uptimeMs, fecha, sizeof(fecha)))
  {
    doc["fecha_dispositivo"] = fecha;
  }

  doc["ip_local"] = WiFi.localIP().toString();

  // Un sensor en error no se envía: mandar el último valor arrastrado lo
  // registraría en el backend como una medición nueva.
  JsonArray lecturas = doc.createNestedArray("lecturas");

  if (snapshot.dhtOk)
  {
    agregarLectura(lecturas, CODIGO_SENSOR_TEMP, snapshot.temperatura);
    agregarLectura(lecturas, CODIGO_SENSOR_HUM, snapshot.humedad);
  }

  if (snapshot.gasOk)
  {
    agregarLectura(lecturas, CODIGO_SENSOR_NH3, static_cast<float>(snapshot.gasRaw));
  }

  if (snapshot.pesoOk)
  {
    agregarLectura(lecturas, CODIGO_SENSOR_PESO, snapshot.peso);
  }

  if (snapshot.aguaOk)
  {
    agregarLectura(lecturas, CODIGO_SENSOR_AGUA, snapshot.distanciaAgua);
  }

  agregarLectura(lecturas, CODIGO_SENSOR_PRESENCIA, snapshot.obstaculo ? 1.0f : 0.0f);

  if (doc.overflowed())
  {
    LOG_ERROR("ServicioIngesta: JSON_CAPACIDAD_INGESTA insuficiente");
    return 0;
  }

  size_t cantidad = lecturas.size();
  if (cantidad > 0)
  {
    serializeJson(doc, payload);
  }
  return cantidad;
}

bool ServicioIngesta::fechaCaptura(unsigned long capturaMs, char *buffer, size_t tamano)
{
  struct timeval ahora;
  gettimeofday(&ahora, nullptr);
  if (ahora.tv_sec < EPOCH_MINIMA_VALIDA)
  {
    return false; // Sin NTP el backend usa su propia hora de recepción
  }

  // Se fecha el momento de captura, no el de envío
  int64_t ahoraMs = static_cast<int64_t>(ahora.tv_sec) * 1000 + ahora.tv_usec / 1000;
  int64_t capturaEpochMs = ahoraMs - static_cast<int64_t>(millis() - capturaMs);

  time_t segundos = static_cast<time_t>(capturaEpochMs / 1000);
  int milisegundos = static_cast<int>(capturaEpochMs % 1000);

  struct tm utc;
  gmtime_r(&segundos, &utc);
  size_t escritos = strftime(buffer, tamano, "%Y-%m-%dT%H:%M:%S", &utc);
  if (escritos == 0)
  {
    return false;
  }
  snprintf(buffer + escritos, tamano - escritos, ".%03dZ", milisegundos);
  return true;
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
