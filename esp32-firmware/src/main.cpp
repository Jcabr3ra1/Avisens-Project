// main.cpp — Firmware del nodo ESP32 de Avisens.
//
// Qué hace:
//   1. Se conecta al WiFi.
//   2. Lee el sensor DHT22 (temperatura + humedad).
//   3. Controla el ventilador LOCALMENTE por umbral (el ESP32 decide solo; el
//      backend NO controla — ver README).
//   4. Envía temperatura y humedad al backend por HTTP cada INTERVALO_ENVIO_MS.
//
// Framework Arduino sobre PlatformIO (C++ en VS Code, sin el Arduino IDE).

#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>
#include <cstdio>
#include <cstring>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <Preferences.h>
#include <esp_random.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <new>
#include "config.h"
#include "isrg_root_x1.h"

// Las configuraciones anteriores que aún no declaran modo quedan en local,
// para impedir que un firmware recién recompilado contacte producción por
// accidente. El destino local además se valida como IPv4 privada.
#ifndef BACKEND_MODO_LOCAL
#define BACKEND_MODO_LOCAL 1
#endif
#ifndef BACKEND_MODO_PRODUCCION
#define BACKEND_MODO_PRODUCCION 2
#endif
#ifndef BACKEND_MODO
#define BACKEND_MODO BACKEND_MODO_LOCAL
#endif

#if BACKEND_MODO != BACKEND_MODO_LOCAL && BACKEND_MODO != BACKEND_MODO_PRODUCCION
#error "BACKEND_MODO debe ser BACKEND_MODO_LOCAL o BACKEND_MODO_PRODUCCION"
#endif

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
constexpr unsigned long WIFI_REINTENTO_MS = 15000;
constexpr uint32_t HTTP_TIMEOUT_MS = 5000;

// Todos los lectores DHT pertenecen a loop(); la tarea de red intercambia
// copias por colas, sin modificar sensores mientras se están leyendo.
constexpr uint8_t MAX_DHT = 16;
constexpr unsigned long CONFIG_INTERVALO_MS = 30000;
constexpr size_t MAX_TOKEN_LEN = 128;
constexpr size_t MAX_URL_LEN = 128;
struct MuestraDht {
  uint8_t gpio;
  float temperatura;
  float humedad;
};
struct LecturaPendiente {
  uint8_t cantidad;
  MuestraDht muestras[MAX_DHT];
};
struct ConfiguracionDht {
  uint8_t cantidad;
  uint8_t pines[MAX_DHT];
};
struct TokenDispositivo {
  char valor[MAX_TOKEN_LEN];
};
// Un ciclo listo para enviar. El id viaja como id_lote: si un reintento llega
// dos veces, el backend devuelve el resultado anterior sin duplicar mediciones.
struct LoteGuardado {
  char id[37];
  char fecha[21];  // UTC ISO-8601; vacía si el reloj aún no estaba sincronizado
  unsigned long capturadoMs;
  LecturaPendiente lectura;
};
enum class ResultadoEnvio { Enviado, Reintentar, Descartar };
struct LectorDht {
  uint8_t gpio;
  DHT* sensor;
};
LectorDht lectores[MAX_DHT] = {{PIN_DHT, &dht}};
uint8_t cantidadLectores = 1;
QueueHandle_t colaEnvios = nullptr;
QueueHandle_t colaConfiguracion = nullptr;
QueueHandle_t colaToken = nullptr;
Preferences preferencias;
char tokenActivo[MAX_TOKEN_LEN] = DEVICE_TOKEN;
char urlBackendActiva[MAX_URL_LEN] = BACKEND_URL;
char bufferSerial[256] = {};
size_t longitudBufferSerial = 0;
bool mdnsIniciado = false;
unsigned long ultimoIntentoDescubrimiento = 0;
constexpr unsigned long DESCUBRIMIENTO_REINTENTO_MS = 60000;
constexpr int32_t SONDA_TIMEOUT_MS = 150;

// Sin conexión se guarda un ciclo por minuto durante 3 horas; al volver la red
// se reenvían en orden, uno por segundo para no chocar con el límite de peticiones.
constexpr size_t CAPACIDAD_BUFER = 180;
constexpr unsigned long BUFER_INTERVALO_MS = 60000;
constexpr unsigned long REENVIO_PAUSA_MS = 1000;
constexpr unsigned long REINTENTO_MIN_MS = 5000;
constexpr unsigned long REINTENTO_MAX_MS = 60000;
constexpr unsigned long VIGENCIA_SIN_HORA_MS = 30000;
LoteGuardado bufer[CAPACIDAD_BUFER];
size_t inicioBufer = 0;
size_t cantidadBufer = 0;
unsigned long ultimoGuardadoMs = 0;
bool huboCorte = false;

bool esUrlLocalValida(const String& url);
bool intentarRedescubrirBackend();

bool tokenFormatoValido(const String& candidato) {
  if (candidato.length() < 16 || candidato.length() >= MAX_TOKEN_LEN) return false;
  for (size_t i = 0; i < candidato.length(); ++i) {
    const char c = candidato[i];
    if (c <= 32 || c >= 127) return false;
  }
  return true;
}

void cargarTokenPersistido() {
  if (!preferencias.begin("avisens", true)) return;
  const String guardado = preferencias.isKey("token") ? preferencias.getString("token", "") : String();
  const String urlGuardada = preferencias.isKey("url") ? preferencias.getString("url", "") : String();
  preferencias.end();
  if (tokenFormatoValido(guardado)) {
    snprintf(tokenActivo, sizeof(tokenActivo), "%s", guardado.c_str());
    Serial.println("[Provision] Token de controlador cargado desde memoria NVS.");
  }
#if BACKEND_MODO == BACKEND_MODO_LOCAL
  if (esUrlLocalValida(urlGuardada)) {
    snprintf(urlBackendActiva, sizeof(urlBackendActiva), "%s", urlGuardada.c_str());
    Serial.printf("[Provision] URL de backend cargada desde NVS: %s\n", urlBackendActiva);
  }
#endif
}

void procesarLineaSerial(String linea) {
  linea.trim();
  if (linea.isEmpty()) return;
  if (linea == "AVISENS_PING") {
    Serial.println("[Provision] PONG");
    return;
  }
  if (!linea.startsWith("AVISENS_TOKEN:")) return;

  String nuevoToken = linea.substring(strlen("AVISENS_TOKEN:"));
  nuevoToken.trim();
  if (!tokenFormatoValido(nuevoToken)) {
    Serial.println("[Provision] ERROR: formato o longitud de token inválido.");
    return;
  }

  if (!preferencias.begin("avisens", false)) {
    Serial.println("[Provision] ERROR: no se pudo abrir la memoria NVS.");
    return;
  }
  const size_t escrito = preferencias.putString("token", nuevoToken);
  preferencias.end();
  if (escrito == 0) {
    Serial.println("[Provision] ERROR: no se pudo guardar el token en NVS.");
    return;
  }

  TokenDispositivo msg{};
  snprintf(msg.valor, sizeof(msg.valor), "%s", nuevoToken.c_str());
  if (colaToken != nullptr) {
    xQueueOverwrite(colaToken, &msg);
  } else {
    snprintf(tokenActivo, sizeof(tokenActivo), "%s", nuevoToken.c_str());
  }
  Serial.println("[Provision] TOKEN_OK");
}

void procesarProvisionSerial() {
  while (Serial.available() > 0) {
    const char c = static_cast<char>(Serial.read());
    if (c == '\n' || c == '\r') {
      if (longitudBufferSerial > 0) {
        bufferSerial[longitudBufferSerial] = '\0';
        procesarLineaSerial(String(bufferSerial));
        longitudBufferSerial = 0;
      }
    } else if (longitudBufferSerial + 1 < sizeof(bufferSerial)) {
      bufferSerial[longitudBufferSerial++] = c;
    } else {
      longitudBufferSerial = 0;
    }
  }
}

void esperarConSerial(unsigned long duracionMs) {
  const unsigned long inicio = millis();
  while (millis() - inicio < duracionMs) {
    procesarProvisionSerial();
    delay(20);
  }
}

bool pinDhtPermitido(int pin) {
  const int disponibles[] = {4, 13, 14, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33};
  if (pin == PIN_RELE) return false;
  for (int disponible : disponibles) if (pin == disponible) return true;
  return false;
}

void aplicarConfiguracion() {
  ConfiguracionDht config{};
  if (colaConfiguracion == nullptr || xQueueReceive(colaConfiguracion, &config, 0) != pdTRUE) return;
  // El DHT original continúa controlando el relé incluso sin asignación en BD.
  for (uint8_t i = 1; i < cantidadLectores;) {
    bool conservar = false;
    for (uint8_t j = 0; j < config.cantidad; ++j) if (config.pines[j] == lectores[i].gpio) conservar = true;
    if (conservar) { ++i; continue; }
    delete lectores[i].sensor;
    lectores[i] = lectores[--cantidadLectores];
  }
  for (uint8_t j = 0; j < config.cantidad; ++j) {
    const uint8_t pin = config.pines[j];
    bool existe = false;
    for (uint8_t i = 0; i < cantidadLectores; ++i) if (lectores[i].gpio == pin) existe = true;
    if (existe || cantidadLectores >= MAX_DHT || !pinDhtPermitido(pin)) continue;
    DHT* sensor = new (std::nothrow) DHT(pin, DHT22);
    if (sensor == nullptr) { Serial.println("[Config] Sin memoria para otro DHT22."); continue; }
    pinMode(pin, INPUT_PULLUP);
    sensor->begin();
    lectores[cantidadLectores++] = {pin, sensor};
    Serial.printf("[Config] DHT22 habilitado en GPIO %u.\n", pin);
  }
}

bool urlBackendProduccionSegura();
bool urlBackendLocalValida();
bool relojSincronizado();
bool backendListoParaEnviar();

// ── WiFi ────────────────────────────────────────────────────────────────────
void iniciarWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("[WiFi] Iniciando conexión a %s; el control local sigue activo.\n",
                WIFI_SSID);
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

// ── Envío al backend por el transporte elegido explícitamente ───────────────
// Esta función corre en la tarea de red, nunca en el ciclo de control local.
//
// El token identifica el controlador/galpón. La identidad física de cada
// variable es tipo + gpio; los seriales administrativos viven solo en Avisens.
ResultadoEnvio enviarLote(const LoteGuardado& lote) {
  const LecturaPendiente& lectura = lote.lectura;
  JsonDocument documento;
  documento["id_lote"] = lote.id;
  if (lote.fecha[0] != '\0') documento["fecha_dispositivo"] = lote.fecha;
  JsonArray lecturas = documento["lecturas"].to<JsonArray>();
  for (uint8_t i = 0; i < lectura.cantidad; ++i) {
    const MuestraDht& muestra = lectura.muestras[i];
    const String canal = "gpio:" + String(muestra.gpio);
    JsonObject temperatura = lecturas.add<JsonObject>();
    temperatura["tipo"] = "temperatura";
    temperatura["canal"] = canal;
    temperatura["valor"] = muestra.temperatura;
    JsonObject humedad = lecturas.add<JsonObject>();
    humedad["tipo"] = "humedad";
    humedad["canal"] = canal;
    humedad["valor"] = muestra.humedad;
    if (huboCorte) {
      Serial.printf("[Reenvío] GPIO %u: temp=%.1f C  hum=%.1f %%  (capturada %s)\n",
                    muestra.gpio, muestra.temperatura, muestra.humedad,
                    lote.fecha[0] != '\0' ? lote.fecha : "sin hora");
    } else {
      Serial.printf("[Envío] GPIO %u: temp=%.1f C  hum=%.1f %%\n",
                    muestra.gpio, muestra.temperatura, muestra.humedad);
    }
  }
  if (lectura.cantidad == 0) return ResultadoEnvio::Descartar;
  String body;
  serializeJson(documento, body);

  HTTPClient http;
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);

#if BACKEND_MODO == BACKEND_MODO_LOCAL
  if (!urlBackendLocalValida() && !intentarRedescubrirBackend()) {
    Serial.println("[HTTP local] URL inválida y no se encontró el backend en la red.");
    return ResultadoEnvio::Reintentar;
  }
  WiFiClient cliente;
  if (!http.begin(cliente, urlBackendActiva)) {
    Serial.println("[HTTP local] No se pudo iniciar la conexión al backend local.");
    return ResultadoEnvio::Reintentar;
  }
#else
  WiFiClientSecure clienteTLS;
  clienteTLS.setCACert(ISRG_ROOT_X1);
  if (!http.begin(clienteTLS, BACKEND_URL)) {
    Serial.println("[HTTPS] No se pudo iniciar la conexión segura.");
    return ResultadoEnvio::Reintentar;
  }
#endif

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", tokenActivo);  // autentica al dispositivo

  int codigo = http.POST(body);
  ResultadoEnvio resultado = ResultadoEnvio::Reintentar;
  if (codigo >= 200 && codigo < 300) {
    resultado = ResultadoEnvio::Enviado;
    JsonDocument respuesta;
    if (deserializeJson(respuesta, http.getString()) || !respuesta["registradas"].is<int>() || !respuesta["ignoradas"].is<JsonArray>()) {
      Serial.println("[Backend] Respuesta sin confirmación de persistencia válida.");
    } else {
      Serial.printf("[Backend] %d: %d registradas, %u ignoradas.\n", codigo,
                    respuesta["registradas"].as<int>(),
                    static_cast<unsigned>(respuesta["ignoradas"].as<JsonArray>().size()));
    }
  } else if (codigo == 401) {
    Serial.println("[Backend] 401: token inválido. Provisiona el token del controlador desde la UI admin; no lo publiques.");
  } else if (codigo == 400 || codigo == 409 || codigo == 413 || codigo == 422) {
    // El backend nunca aceptará este ciclo tal como está: reintentarlo solo
    // bloquearía a los que vienen detrás.
    Serial.printf("[Backend] %d: ciclo rechazado, se descarta.\n", codigo);
    resultado = ResultadoEnvio::Descartar;
  } else {
    Serial.printf("[Backend] Fallo HTTP %d (%s).\n", codigo, urlBackendActiva);
#if BACKEND_MODO == BACKEND_MODO_LOCAL
    if (codigo < 0) {
      http.end();
      intentarRedescubrirBackend();
      return resultado;
    }
#endif
  }
  http.end();
  return resultado;
}

void generarId(char* destino) {
  uint8_t bytes[16];
  for (size_t i = 0; i < sizeof(bytes); i += 4) {
    const uint32_t azar = esp_random();
    memcpy(bytes + i, &azar, 4);
  }
  bytes[6] = (bytes[6] & 0x0F) | 0x40;
  bytes[8] = (bytes[8] & 0x3F) | 0x80;
  snprintf(destino, 37,
           "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
           bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
           bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]);
}

bool relojSincronizado();

void guardarEnBufer(const LecturaPendiente& lectura) {
  const unsigned long ahora = millis();
  const bool hayPendientes = cantidadBufer > 0;
  if (hayPendientes && ahora - ultimoGuardadoMs < BUFER_INTERVALO_MS) return;

  if (cantidadBufer == CAPACIDAD_BUFER) {
    inicioBufer = (inicioBufer + 1) % CAPACIDAD_BUFER;
    --cantidadBufer;
    Serial.println("[Búfer] Lleno: se descarta el ciclo más antiguo.");
  }
  LoteGuardado& lote = bufer[(inicioBufer + cantidadBufer) % CAPACIDAD_BUFER];
  generarId(lote.id);
  lote.fecha[0] = '\0';
  if (relojSincronizado()) {
    const time_t segundos = time(nullptr);
    struct tm utc;
    gmtime_r(&segundos, &utc);
    strftime(lote.fecha, sizeof(lote.fecha), "%Y-%m-%dT%H:%M:%SZ", &utc);
  }
  lote.capturadoMs = ahora;
  lote.lectura = lectura;
  ++cantidadBufer;
  ultimoGuardadoMs = ahora;
  if (hayPendientes) {
    huboCorte = true;
    Serial.printf("[Búfer] Sin conexión con el backend: %u ciclos guardados.\n",
                  static_cast<unsigned>(cantidadBufer));
  }
}

void quitarPrimeroDelBufer() {
  inicioBufer = (inicioBufer + 1) % CAPACIDAD_BUFER;
  --cantidadBufer;
}

// Una consulta fallida conserva los lectores actuales. La respuesta no contiene
// tokens; ambos endpoints usan la misma credencial y el mismo destino validado.
void consultarConfiguracion() {
#if BACKEND_MODO == BACKEND_MODO_LOCAL
  if (!urlBackendLocalValida() && !intentarRedescubrirBackend()) return;
  String url(urlBackendActiva);
#else
  String url(BACKEND_URL);
#endif
  url += "/configuracion";
  HTTPClient http;
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.useHTTP10(true);  // stream sin transferencia chunked para ArduinoJson
#if BACKEND_MODO == BACKEND_MODO_LOCAL
  WiFiClient cliente;
  if (!http.begin(cliente, url)) return;
#else
  if (!urlBackendProduccionSegura()) return;
  WiFiClientSecure cliente;
  cliente.setCACert(ISRG_ROOT_X1);
  if (!http.begin(cliente, url)) return;
#endif
  http.addHeader("X-Device-Token", tokenActivo);
  const int estado = http.GET();
  if (estado != 200) {
    Serial.printf("[Config] HTTP %d; se conservan los lectores locales.\n", estado);
    http.end();
#if BACKEND_MODO == BACKEND_MODO_LOCAL
    if (estado < 0) intentarRedescubrirBackend();
#endif
    return;
  }
  JsonDocument documento;
  const auto error = deserializeJson(documento, http.getStream(), DeserializationOption::NestingLimit(5));
  if (error || documento["version"].as<int>() != 1 || !documento["conexiones"].is<JsonArray>() || documento["conexiones"].size() > MAX_DHT) {
    Serial.println("[Config] Configuración inválida; se conserva la anterior.");
    http.end();
    return;
  }
  ConfiguracionDht config{};
  for (JsonObject conexion : documento["conexiones"].as<JsonArray>()) {
    const int pin = conexion["gpio"].as<int>();
    const String canal = conexion["canal"].as<String>();
    if (!conexion["gpio"].is<int>() || !pinDhtPermitido(pin) || conexion["modelo"].as<String>() != "DHT22" || canal != "gpio:" + String(pin)) {
      Serial.println("[Config] GPIO o modelo incompatible (incluido pin de relé); se conserva la anterior.");
      http.end();
      return;
    }
    bool repetido = false;
    for (uint8_t i = 0; i < config.cantidad; ++i) if (config.pines[i] == pin) repetido = true;
    if (!repetido) config.pines[config.cantidad++] = pin;
  }
  if (colaConfiguracion != nullptr) xQueueOverwrite(colaConfiguracion, &config);
  http.end();
}

bool urlBackendProduccionSegura() {
  return String(BACKEND_URL).startsWith("https://");
}

bool esUrlLocalValida(const String& url) {
  if (!url.startsWith("http://") || !url.endsWith(":3000/ingest")) {
    return false;
  }

  const int inicioHost = 7;
  const int finHost = url.indexOf(':', inicioHost);
  if (finHost <= inicioHost) return false;

  const String host = url.substring(inicioHost, finHost);
  unsigned int a, b, c, d;
  char sobrante;
  if (sscanf(host.c_str(), "%u.%u.%u.%u%c", &a, &b, &c, &d, &sobrante) != 4 ||
      a > 255 || b > 255 || c > 255 || d > 255) {
    return false;
  }

  const bool redPrivada10 = a == 10;
  const bool redPrivada172 = a == 172 && b >= 16 && b <= 31;
  const bool redPrivada192 = a == 192 && b == 168;
  return redPrivada10 || redPrivada172 || redPrivada192;
}

bool urlBackendLocalValida() {
  return esUrlLocalValida(String(urlBackendActiva));
}

bool probarBackendEnIp(const IPAddress& ip) {
  if (ip == IPAddress(0, 0, 0, 0)) return false;
  const String ipTexto = ip.toString();
  const String candidata = "http://" + ipTexto + ":3000/ingest";
  if (!esUrlLocalValida(candidata)) return false;

  WiFiClient cliente;
  HTTPClient http;
  http.setConnectTimeout(600);
  http.setTimeout(800);
  if (!http.begin(cliente, "http://" + ipTexto + ":3000/health")) return false;
  const int codigo = http.GET();
  const String respuesta = codigo == 200 ? http.getString() : String();
  http.end();
  // Solo un backend que se identifica como Avisens recibe el token del
  // controlador; cualquier otro servicio en el puerto 3000 se ignora.
  if (respuesta.indexOf("\"servicio\":\"avisens\"") < 0) return false;

  snprintf(urlBackendActiva, sizeof(urlBackendActiva), "%s", candidata.c_str());
  if (preferencias.begin("avisens", false)) {
    preferencias.putString("url", candidata);
    preferencias.end();
  }
  Serial.printf("[Descubrimiento] Backend Avisens encontrado en %s\n", urlBackendActiva);
  return true;
}

bool descubrirBackendEnRed() {
  if (WiFi.status() != WL_CONNECTED) return false;
  Serial.println("[Descubrimiento] Buscando servidor Avisens en la red Wi-Fi…");

  if (!mdnsIniciado) {
    mdnsIniciado = MDNS.begin("avisens-esp32");
  }
  if (mdnsIniciado) {
    const int n = MDNS.queryService("avisens", "tcp");
    for (int i = 0; i < n; ++i) {
      if (probarBackendEnIp(MDNS.IP(i))) return true;
    }
  }

  // Respaldo sin mDNS: recorre la subred /24 empezando por la última IP
  // conocida y alejándose de ella (.50, .51, .49, .52…), porque el DHCP suele
  // reasignar al computador una dirección vecina.
  const IPAddress miIp = WiFi.localIP();
  IPAddress anterior;
  int inicio = 1;
  const String urlAnterior(urlBackendActiva);
  const int desde = urlAnterior.indexOf("://") + 3;
  const int hasta = urlAnterior.indexOf(':', desde);
  if (desde > 2 && hasta > desde && anterior.fromString(urlAnterior.substring(desde, hasta)) &&
      anterior[0] == miIp[0] && anterior[1] == miIp[1] && anterior[2] == miIp[2]) {
    inicio = anterior[3];
  }
  for (int paso = 0; paso < 508; ++paso) {
    const int desplazamiento = (paso + 1) / 2;
    const int host = paso % 2 == 0 ? inicio + desplazamiento : inicio - desplazamiento;
    if (host < 1 || host > 254 || host == miIp[3]) continue;
    const IPAddress ip(miIp[0], miIp[1], miIp[2], host);
    WiFiClient sonda;
    if (sonda.connect(ip, 3000, SONDA_TIMEOUT_MS)) {
      sonda.stop();
      if (probarBackendEnIp(ip)) return true;
    }
    if (paso % 16 == 0) vTaskDelay(pdMS_TO_TICKS(5));
  }

  Serial.println("[Descubrimiento] No se encontró ningún backend Avisens en el puerto 3000 de la LAN.");
  return false;
}

bool intentarRedescubrirBackend() {
  const unsigned long ahora = millis();
  if (ultimoIntentoDescubrimiento != 0 &&
      ahora - ultimoIntentoDescubrimiento < DESCUBRIMIENTO_REINTENTO_MS) {
    return false;
  }
  ultimoIntentoDescubrimiento = ahora;
  return descubrirBackendEnRed();
}

bool relojSincronizado() {
  return time(nullptr) > 1700000000;
}

bool backendListoParaEnviar() {
#if BACKEND_MODO == BACKEND_MODO_LOCAL
  return true;
#else
  return urlBackendProduccionSegura() && relojSincronizado();
#endif
}

// La reconexión, NTP y transporte viven en otra tarea. Una espera de red no detiene
// las lecturas del DHT ni el control del relé que ejecuta loop().
void tareaRed(void*) {
  iniciarWiFi();
  unsigned long ultimoIntentoWiFi = millis();
  bool yaEstuvoConectado = false;
  bool ntpIniciado = false;
  unsigned long ultimaConfiguracion = millis() - CONFIG_INTERVALO_MS;
  unsigned long ultimoEnvioRed = 0;
  unsigned long pausaEnvio = 0;

#if BACKEND_MODO == BACKEND_MODO_LOCAL
  Serial.printf("[HTTP local] Modo LAN activo. Destino inicial: %s\n", urlBackendActiva);
#else
  if (!urlBackendProduccionSegura()) {
    Serial.println("[HTTPS] Producción exige BACKEND_URL con https://; ingesta desactivada.");
  } else {
    Serial.println("[HTTPS] Modo de producción explícito; certificado validado.");
  }
#endif

  for (;;) {
    TokenDispositivo nuevoToken{};
    if (colaToken != nullptr && xQueueReceive(colaToken, &nuevoToken, 0) == pdTRUE) {
      snprintf(tokenActivo, sizeof(tokenActivo), "%s", nuevoToken.valor);
      ultimaConfiguracion = millis() - CONFIG_INTERVALO_MS;
      Serial.println("[Provision] Nuevo token aplicado en la tarea de red.");
    }

    LecturaPendiente capturada;
    if (xQueueReceive(colaEnvios, &capturada, 0) == pdTRUE) guardarEnBufer(capturada);

    if (WiFi.status() != WL_CONNECTED) {
      if (yaEstuvoConectado) {
        Serial.println("[WiFi] Conexión perdida. El control local continúa.");
        yaEstuvoConectado = false;
      }
      if (millis() - ultimoIntentoWiFi >= WIFI_REINTENTO_MS) {
        Serial.println("[WiFi] Reintentando conexión…");
        WiFi.reconnect();
        ultimoIntentoWiFi = millis();
      }
      vTaskDelay(pdMS_TO_TICKS(500));
      continue;
    }

    if (!yaEstuvoConectado) {
      Serial.printf("[WiFi] Conectado. IP: %s\n",
                    WiFi.localIP().toString().c_str());
      yaEstuvoConectado = true;
    }

    // La hora fecha cada ciclo guardado: sin ella, una lectura reenviada tarde
    // quedaría registrada con la hora de llegada y no con la de captura.
    if (!ntpIniciado) {
      configTime(0, 0, "pool.ntp.org", "time.nist.gov");
      ntpIniciado = true;
      Serial.println("[NTP] Sincronizando la hora del controlador.");
    }

    if (backendListoParaEnviar()) {
      if (millis() - ultimaConfiguracion >= CONFIG_INTERVALO_MS) {
        ultimaConfiguracion = millis();
        consultarConfiguracion();
      }
      if (cantidadBufer > 0 && millis() - ultimoEnvioRed >= pausaEnvio) {
        LoteGuardado& lote = bufer[inicioBufer];
        if (lote.fecha[0] == '\0' && millis() - lote.capturadoMs > VIGENCIA_SIN_HORA_MS) {
          Serial.println("[Búfer] Ciclo sin hora y ya viejo: se descarta para no fecharlo mal.");
          quitarPrimeroDelBufer();
          continue;
        }
        const ResultadoEnvio resultado = enviarLote(lote);
        ultimoEnvioRed = millis();
        if (resultado == ResultadoEnvio::Reintentar) {
          pausaEnvio = pausaEnvio < REINTENTO_MIN_MS ? REINTENTO_MIN_MS : min(pausaEnvio * 2, REINTENTO_MAX_MS);
        } else {
          quitarPrimeroDelBufer();
          pausaEnvio = cantidadBufer > 0 ? REENVIO_PAUSA_MS : 0;
          if (huboCorte && cantidadBufer == 0) {
            huboCorte = false;
            Serial.println("[Búfer] Conexión recuperada: se enviaron todos los ciclos guardados.");
          }
        }
      }
    }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ── Setup / loop ────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Nodo ESP32 Avisens ===");
  cargarTokenPersistido();
  Serial.println("[Provision] LISTO");

  pinMode(PIN_RELE, OUTPUT);
  digitalWrite(PIN_RELE, RELE_APAGADO);  // arranca apagado por seguridad

  if (!pinDhtPermitido(PIN_DHT)) {
    Serial.println("[Error] PIN_DHT incompatible o compartido con el relé; revisa el cableado/configuración.");
    return;
  }
  // Pull-up en datos; nunca se aplica a un pin compartido con el relé.
  pinMode(PIN_DHT, INPUT_PULLUP);
  dht.begin();
  Serial.printf("[DHT22] Sensor configurado en GPIO %d.\n", PIN_DHT);

  colaEnvios = xQueueCreate(1, sizeof(LecturaPendiente));
  colaConfiguracion = xQueueCreate(1, sizeof(ConfiguracionDht));
  colaToken = xQueueCreate(1, sizeof(TokenDispositivo));
  if (colaEnvios == nullptr || colaConfiguracion == nullptr || colaToken == nullptr) {
    Serial.println("[Error] No se pudo crear la cola de red; seguirá el control local.");
    return;
  }

  esperarConSerial(2000);

  if (xTaskCreatePinnedToCore(tareaRed, "avisens-red", 8192, nullptr, 1,
                              nullptr, 0) != pdPASS) {
    Serial.println("[Error] No se pudo iniciar la tarea de red; seguirá el control local.");
    vQueueDelete(colaEnvios);
    vQueueDelete(colaConfiguracion);
    vQueueDelete(colaToken);
    colaEnvios = nullptr;
    colaConfiguracion = nullptr;
    colaToken = nullptr;
  }
}

void loop() {
  procesarProvisionSerial();
  if (!pinDhtPermitido(PIN_DHT)) { esperarConSerial(2000); return; }
  aplicarConfiguracion();
  LecturaPendiente lectura{};
  for (uint8_t i = 0; i < cantidadLectores; ++i) {
    const float temperatura = lectores[i].sensor->readTemperature();
    const float humedad = lectores[i].sensor->readHumidity();
    // Un lector desconectado no bloquea las demás conexiones.
    if (isnan(temperatura) || isnan(humedad)) {
      Serial.printf("[DHT] GPIO %u: lectura inválida, se omite.\n", lectores[i].gpio);
      continue;
    }
    if (lectores[i].gpio == PIN_DHT) controlarActuadores(temperatura);
    lectura.muestras[lectura.cantidad++] = {lectores[i].gpio, temperatura, humedad};
  }
  if (millis() - ultimoEnvio >= INTERVALO_ENVIO_MS) {
    ultimoEnvio = millis();
    if (colaEnvios != nullptr && lectura.cantidad > 0) xQueueOverwrite(colaEnvios, &lectura);
  }
  esperarConSerial(2000);  // DHT22: máximo una lectura cada dos segundos por conexión
}
