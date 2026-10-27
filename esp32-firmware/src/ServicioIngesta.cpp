#include "ServicioIngesta.h"
#include <esp_system.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "config.h"
#include "ConfigDispositivo.h"
#include "BufferLecturas.h"
#include <time.h>

// config.h antiguos no definen estos valores: se usan los de abajo.
#ifndef BUFFER_LECTURAS_CAPACIDAD
#define BUFFER_LECTURAS_CAPACIDAD 48  // ~48 min de corte a 1 lectura por minuto
#endif
#ifndef INTERVALO_BUFFER_MS
#define INTERVALO_BUFFER_MS 60000     // una lectura guardada por minuto sin red
#endif
#ifndef TIMEOUT_ESPEJO_MS
#define TIMEOUT_ESPEJO_MS 2500        // el espejo es opcional: no debe frenar
#endif
#ifndef PAUSA_ESPEJO_CAIDO_MS
#define PAUSA_ESPEJO_CAIDO_MS 30000   // tras un fallo, deja de intentarlo un rato
#endif
#ifndef MAX_REENVIOS_POR_CICLO
#define MAX_REENVIOS_POR_CICLO 3
#endif

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

// Sin `calidad` el backend guarda "ok" (su valor por defecto), como hasta ahora.
static String lecturaJson(const char *codigo, const String &valor, const char *calidad = nullptr) {
  String json = "{\"codigo\":\"" + String(codigo) + "\",\"valor\":" + valor;
  if (calidad != nullptr) {
    json += ",\"calidad\":\"" + String(calidad) + "\"";
  }
  return json + "},";
}

// Relé K1-K4 identificado por canal dentro de este ESP32: el backend lo
// resuelve con el token del dispositivo, sin códigos compilados en config.h.
static String lecturaReleJson(uint8_t indice, bool encendido) {
  return "{\"tipo\":\"rele\",\"canal\":\"" + String(canalDeRele(indice)) +
         "\",\"valor\":" + String(encendido ? 1 : 0) + "},";
}

static const char *textoResultado(ResultadoRemoto resultado) {
  switch (resultado) {
    case ResultadoRemoto::APLICADA: return "aplicada";
    case ResultadoRemoto::RECHAZADA: return "rechazada";
    default: return "revertida";
  }
}

static const char *textoModo(ModoRele modo) {
  switch (modo) {
    case ModoRele::MANUAL_REMOTO: return "manual_remoto";
    case ModoRele::MANUAL_LOCAL: return "manual_local";
    default: return "automatico";
  }
}

// "resultados_ordenes" y "estados_reles" del cuerpo. estados_reles es lo que
// hay AHORA en cada relé: con él la web muestra el estado actual y el
// backend reconcilia las órdenes que el ESP32 ya no sostiene. Antes del
// primer ciclo de tareaGalpon no hay nada cierto que informar y se omite.
static String ordenesJson(const CicloIngesta &ciclo) {
  String json = ",\"resultados_ordenes\":[";
  for (uint8_t i = 0; i < ciclo.cantidadResultados; i++) {
    const ResultadoOrdenRemota &r = ciclo.resultados[i];
    if (i > 0) json += ",";
    json += "{\"orden_id\":" + String(r.id) +
            ",\"resultado\":\"" + textoResultado(r.resultado) + "\"" +
            ",\"estado_rele\":" + (r.estadoRele ? "true" : "false");
    if (r.motivo[0] != '\0') {
      json += ",\"motivo\":\"" + String(r.motivo) + "\"";
    }
    json += "}";
  }
  json += "]";
  if (!ciclo.reles.valido) return json;

  json += ",\"estados_reles\":[";
  for (uint8_t i = 0; i < 4; i++) {
    if (i > 0) json += ",";
    json += "{\"canal\":\"" + String(canalDeRele(i)) + "\"" +
            ",\"modo\":\"" + textoModo(ciclo.reles.modo[i]) + "\"" +
            ",\"encendido\":" + (ciclo.reles.encendido[i] ? "true" : "false");
    if (ciclo.reles.modo[i] == ModoRele::MANUAL_REMOTO) {
      json += ",\"orden_id\":" + String(ciclo.reles.orden[i]);
    }
    json += "}";
  }
  return json + "]";
}

static void leerOrdenes(JsonVariant campoOrdenes, RespuestaIngesta &respuesta) {
  if (!campoOrdenes.is<JsonArray>()) return;
  for (JsonVariant o : campoOrdenes.as<JsonArray>()) {
    if (respuesta.cantidadOrdenes >= MAX_ORDENES_POR_RESPUESTA) break;
    if (!o["id"].is<uint32_t>() || !o["accion"].is<const char *>()) {
      continue;  // forma inesperada: se ignora, el backend la repetirá o expirará
    }
    OrdenRecibida &destino = respuesta.ordenes[respuesta.cantidadOrdenes++];
    destino.id = o["id"].as<uint32_t>();
    // El relé se identifica por canal ("rele:k1".."rele:k4"). Una orden sin
    // canal (relé antiguo que aún no se registró por canal en la web) sigue
    // adelante con el canal vacío: ControlRemoto la rechaza con un motivo
    // claro en vez de dejarla expirar en silencio. "codigo" se ignora: es
    // solo para el firmware anterior.
    destino.canal[0] = '\0';
    if (o["canal"].is<const char *>()) {
      strlcpy(destino.canal, o["canal"].as<const char *>(), sizeof(destino.canal));
    }
    strlcpy(destino.accion, o["accion"].as<const char *>(), sizeof(destino.accion));
  }
}

// ─── Hora por internet ───────────────────────────────────
// El búfer necesita la hora real para fechar las lecturas que reenvía tarde.
// Sin ella (todavía no llegó NTP) no se guarda nada y todo sigue como antes.
static bool horaPedida = false;

void iniciarHoraRed() {
  if (horaPedida) return;
  horaPedida = true;
  configTime(0, 0, "pool.ntp.org", "time.google.com");
}

bool horaSincronizada() {
  return time(nullptr) > 1700000000;  // noviembre de 2023: antes es el reloj sin ajustar
}

static String fechaJson(int64_t epoch) {
  if (epoch <= 0) return String();
  time_t t = static_cast<time_t>(epoch);
  struct tm utc;
  gmtime_r(&t, &utc);
  char buf[32];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S.000Z", &utc);
  return ",\"fecha_dispositivo\":\"" + String(buf) + "\"";
}

// Lecturas del ciclo en JSON, sin los corchetes del arreglo. `enviadas` es
// cuántas incluye: el backend debe registrar exactamente ese número.
static String armarLecturas(const CicloIngesta &ciclo, int &enviadas) {
  String lecturas;
  enviadas = 0;
  if (ciclo.incluirDht) {
    lecturas += lecturaJson(CODIGO_SENSOR_TEMP, String(ciclo.temperatura, 1));
    lecturas += lecturaJson(CODIGO_SENSOR_HUM, String(ciclo.humedad, 1));
    enviadas += 2;
  }
  if (ciclo.incluirAgua) {
    lecturas += lecturaJson(CODIGO_SENSOR_AGUA, String(ciclo.distanciaAgua, 1));
    enviadas += 1;
  }
  if (ciclo.incluirGas) {
    lecturas += lecturaJson(CODIGO_SENSOR_GAS, String(ciclo.gasAdc));
    enviadas += 1;
  }
  if (ciclo.incluirPeso) {
    lecturas += lecturaJson(CODIGO_SENSOR_PESO, String(ciclo.pesoGramos, 1),
                            ciclo.pesoCalibrado ? nullptr : "sospechosa");
    enviadas += 1;
  }
  const EstadoActuadores &a = ciclo.actuadores;
  lecturas += lecturaJson(CODIGO_MOTOR_ALIMENTADOR, String(a.alimentador ? 1 : 0));
  lecturas += lecturaJson(CODIGO_MOTOR_PERSIANA, String(a.persiana ? 1 : 0));
  for (uint8_t i = 0; i < 4; i++) {
    lecturas += lecturaReleJson(i, a.reles[i]);
  }
  enviadas += 6;
  lecturas.remove(lecturas.length() - 1);  // coma final
  return lecturas;
}

// ─── Búfer de lecturas sin red y destino espejo ──────────
static BufferLecturas<BUFFER_LECTURAS_CAPACIDAD> bufferLecturas;
static unsigned long ultimoGuardadoMs = 0;
static bool hayGuardado = false;
static unsigned long espejoCaidoHastaMs = 0;
static bool espejoEnPausa = false;

// Cuerpo sin órdenes ni estado de relés: son datos que caducan y no deben
// reenviarse tarde, ni llegar a un destino que no manda en los relés.
static String cuerpoSoloLecturas(const String &idLote, int64_t epoch, const String &lecturas) {
  return "{\"id_lote\":\"" + idLote + "\"" + fechaJson(epoch) + ",\"lecturas\":[" + lecturas + "]}";
}

// Un POST sin reintentos. Devuelve el código HTTP (negativo = sin conexión).
static int postUnaVez(const String &url, const String &token, const String &cuerpo, int timeoutMs) {
  HTTPClient http;
  WiFiClient clientePlano;
  WiFiClientSecure clienteTls;
  if (url.startsWith("https://")) {
    clienteTls.setInsecure();  // mismo criterio que el destino principal
    http.begin(clienteTls, url);
  } else {
    http.begin(clientePlano, url);
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", token);
  http.setTimeout(timeoutMs);
  int codigo = http.POST(cuerpo);
  http.getString();
  http.end();
  return codigo;
}

static void guardarEnBuffer(const String &idLote, int64_t epoch, const String &lecturas) {
  if (epoch <= 0) return;  // sin hora real no se puede fechar el reenvío
  if (hayGuardado && millis() - ultimoGuardadoMs < INTERVALO_BUFFER_MS) return;
  bool guardada = false;
  const bool descarto = bufferLecturas.agregar(idLote.c_str(), epoch, lecturas.c_str(), &guardada);
  if (!guardada) {
    LOG_WARN("Buffer: lectura demasiado larga, no se guardo");
    return;
  }
  hayGuardado = true;
  ultimoGuardadoMs = millis();
  Serial.printf("[Buffer] Guardada (%u/%u)%s\n", static_cast<unsigned>(bufferLecturas.cantidad()),
                static_cast<unsigned>(bufferLecturas.capacidad()),
                descarto ? " - descarto la mas vieja" : "");
}

bool bufferListoParaGuardar() {
  if (!horaSincronizada()) return false;
  return !hayGuardado || millis() - ultimoGuardadoMs >= INTERVALO_BUFFER_MS;
}

void guardarCicloSinRed(const CicloIngesta &ciclo) {
  int enviadas = 0;
  const String lecturas = armarLecturas(ciclo, enviadas);
  const int64_t epoch = horaSincronizada() ? static_cast<int64_t>(time(nullptr)) : 0;
  guardarEnBuffer(generarIdLote(), epoch, lecturas);
}

size_t lecturasPendientes() {
  return bufferLecturas.cantidad();
}

// Reenvía las más viejas con su hora original. Una confirmación o un 4xx
// (lectura que el backend nunca aceptará) la quitan; un fallo de red o un
// 5xx/429 detienen el reenvío hasta el próximo ciclo.
static void reenviarPendientes() {
  const ConfigDispositivo &cfg = configDispositivo();
  for (int i = 0; i < MAX_REENVIOS_POR_CICLO && !bufferLecturas.vacio(); i++) {
    const EntradaBufferLecturas *e = bufferLecturas.masVieja();
    const String cuerpo = cuerpoSoloLecturas(String(e->idLote), e->epoch, String(e->lecturas));
    const int codigo = postUnaVez(cfg.backendUrl, cfg.token, cuerpo, TIMEOUT_INGESTA_MS);
    if (codigo >= 200 && codigo < 300) {
      bufferLecturas.quitarMasVieja();
    } else if (codigo >= 400 && codigo < 500 && codigo != 429) {
      LOG_ERROR("Buffer: el backend rechazo una lectura guardada (" + String(codigo) + "), se descarta");
      bufferLecturas.quitarMasVieja();
    } else {
      return;
    }
  }
  if (!bufferLecturas.vacio()) {
    Serial.printf("[Buffer] Quedan %u por reenviar\n", static_cast<unsigned>(bufferLecturas.cantidad()));
  }
}

// Mismas lecturas al destino espejo, un solo intento. Su respuesta no se
// usa: las órdenes de los relés vienen únicamente del destino principal.
static void enviarEspejo(const String &idLote, int64_t epoch, const String &lecturas) {
  const ConfigDispositivo &cfg = configDispositivo();
  if (cfg.backendUrl2.isEmpty() || cfg.token2.isEmpty()) return;
  if (espejoEnPausa && millis() < espejoCaidoHastaMs) return;

  const int codigo = postUnaVez(cfg.backendUrl2, cfg.token2,
                                cuerpoSoloLecturas(idLote, epoch, lecturas), TIMEOUT_ESPEJO_MS);
  if (codigo >= 200 && codigo < 300) {
    espejoEnPausa = false;
    return;
  }
  espejoEnPausa = true;
  espejoCaidoHastaMs = millis() + PAUSA_ESPEJO_CAIDO_MS;
  Serial.printf("[Espejo] Sin respuesta (codigo %d), se reintenta en %d s\n", codigo,
                PAUSA_ESPEJO_CAIDO_MS / 1000);
}

static bool enviarPrincipal(const CicloIngesta &ciclo, const String &idLote,
                            const String &lecturas, int LECTURAS_ENVIADAS, int64_t epoch,
                            RespuestaIngesta &salida, bool &agotado) {
  salida.contratoValido = false;
  salida.cantidadOrdenes = 0;
  agotado = false;

  String arranque = ciclo.arranqueId != nullptr && ciclo.arranqueId[0] != '\0'
                        ? ",\"arranque_id\":\"" + String(ciclo.arranqueId) + "\""
                        : String();
  String body = "{\"id_lote\":\"" + idLote + "\"" + fechaJson(epoch) + arranque + ",\"lecturas\":[" + lecturas + "]" +
                ordenesJson(ciclo) + "}";

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
      // 429 no es configuración: el backend pide frenar. Tampoco se reintenta
      // ya (insistir empeora el límite); el próximo ciclo lleva lo pendiente,
      // incluidas las confirmaciones de órdenes, que no se descartan.
      if (codigo == 429) {
        LOG_WARN("Ingesta: limite de peticiones del backend (429), se envia en el proximo ciclo");
        return false;
      }
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

    // Antes de revisar ignoradas: un código mal configurado no impide que
    // las órdenes y las confirmaciones de este envío se den por procesadas.
    salida.contratoValido = true;
    leerOrdenes(doc["ordenes"], salida);

    JsonArray ignoradas = campoIgnoradas.as<JsonArray>();
    int registradas = campoRegistradas.as<int>();
    if (ignoradas.size() > 0 || registradas != LECTURAS_ENVIADAS) {
      // Reintentar no arregla un codigo mal configurado -- se abandona
      // sin gastar los reintentos que quedan.
      LOG_ERROR("Ingesta: el backend no registro todas las lecturas (revisar "
                "CODIGO_SENSOR_* / CODIGO_MOTOR_* en config.h vs sensores registrados, "
                "y que los reles K1-K4 esten registrados por canal en la web)");
      return false;
    }

    Serial.printf("[Ingesta] OK (%d) intento %d/%d, id_lote=%s\n",
                  codigo, intento, MAX_REINTENTOS_INGESTA, idLote.c_str());
    return true;
  }

  LOG_ERROR("Ingesta: se agotaron los reintentos (id_lote=" + idLote + ")");
  agotado = true;
  return false;
}

bool enviarLecturaConReintentos(const CicloIngesta &ciclo, const String &idLote,
                                RespuestaIngesta &salida) {
  int enviadas = 0;
  const String lecturas = armarLecturas(ciclo, enviadas);
  const int64_t epoch = horaSincronizada() ? static_cast<int64_t>(time(nullptr)) : 0;

  bool agotado = false;
  const bool ok = enviarPrincipal(ciclo, idLote, lecturas, enviadas, epoch, salida, agotado);

  // Solo se guarda lo que se perdió por la red (reintentos agotados): un 4xx es
  // configuración y reenviarlo mañana tampoco lo arreglaría.
  if (agotado) guardarEnBuffer(idLote, epoch, lecturas);
  if (ok) reenviarPendientes();
  enviarEspejo(idLote, epoch, lecturas);
  return ok;
}
