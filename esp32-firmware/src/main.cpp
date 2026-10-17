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
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>
#include <cstdio>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
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
struct LectorDht {
  uint8_t gpio;
  DHT* sensor;
};
LectorDht lectores[MAX_DHT] = {{PIN_DHT, &dht}};
uint8_t cantidadLectores = 1;
QueueHandle_t colaEnvios = nullptr;
QueueHandle_t colaConfiguracion = nullptr;

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
void enviarLectura(const LecturaPendiente& lectura) {
  JsonDocument documento;
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
    Serial.printf("[Envío] GPIO %u: temp=%.1f C  hum=%.1f %%\n",
                  muestra.gpio, muestra.temperatura, muestra.humedad);
  }
  if (lectura.cantidad == 0) return;
  String body;
  serializeJson(documento, body);

  HTTPClient http;
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);

#if BACKEND_MODO == BACKEND_MODO_LOCAL
  if (!urlBackendLocalValida()) {
    Serial.println("[HTTP local] URL inválida: usa http://<IPv4 privada>:3000/ingest.");
    return;
  }
  WiFiClient cliente;
  if (!http.begin(cliente, BACKEND_URL)) {
    Serial.println("[HTTP local] No se pudo iniciar la conexión al backend local.");
    return;
  }
#else
  WiFiClientSecure clienteTLS;
  clienteTLS.setCACert(ISRG_ROOT_X1);
  if (!http.begin(clienteTLS, BACKEND_URL)) {
    Serial.println("[HTTPS] No se pudo iniciar la conexión segura.");
    return;
  }
#endif

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);  // autentica al dispositivo

  int codigo = http.POST(body);
  if (codigo >= 200 && codigo < 300) {
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
  } else {
    Serial.printf("[Backend] Fallo HTTP %d.\n", codigo);
  }
  http.end();
}

// Una consulta fallida conserva los lectores actuales. La respuesta no contiene
// tokens; ambos endpoints usan la misma credencial y el mismo destino validado.
void consultarConfiguracion() {
  String url(BACKEND_URL);
  url += "/configuracion";
  HTTPClient http;
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.useHTTP10(true);  // stream sin transferencia chunked para ArduinoJson
#if BACKEND_MODO == BACKEND_MODO_LOCAL
  if (!urlBackendLocalValida()) return;
  WiFiClient cliente;
  if (!http.begin(cliente, url)) return;
#else
  if (!urlBackendProduccionSegura()) return;
  WiFiClientSecure cliente;
  cliente.setCACert(ISRG_ROOT_X1);
  if (!http.begin(cliente, url)) return;
#endif
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  const int estado = http.GET();
  if (estado != 200) {
    Serial.printf("[Config] HTTP %d; se conservan los lectores locales.\n", estado);
    http.end();
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

bool urlBackendLocalValida() {
  const String url(BACKEND_URL);
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

bool relojSincronizado() {
  return time(nullptr) > 1700000000;
}

bool backendListoParaEnviar() {
#if BACKEND_MODO == BACKEND_MODO_LOCAL
  return urlBackendLocalValida();
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

#if BACKEND_MODO == BACKEND_MODO_LOCAL
  if (!urlBackendLocalValida()) {
    Serial.println("[HTTP local] Configura una IPv4 privada: http://<IP>:3000/ingest.");
    Serial.println("[HTTP local] No se enviarán lecturas a direcciones públicas.");
  } else {
    Serial.println("[HTTP local] Modo de desarrollo LAN activo (sin TLS).");
  }
#else
  if (!urlBackendProduccionSegura()) {
    Serial.println("[HTTPS] Producción exige BACKEND_URL con https://; ingesta desactivada.");
  } else {
    Serial.println("[HTTPS] Modo de producción explícito; certificado validado.");
  }
#endif

  for (;;) {
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

    if (BACKEND_MODO == BACKEND_MODO_PRODUCCION && !ntpIniciado) {
      configTime(0, 0, "pool.ntp.org", "time.nist.gov");
      ntpIniciado = true;
      Serial.println("[NTP] Sincronizando hora para validar el certificado HTTPS.");
    }

    if (backendListoParaEnviar()) {
      if (millis() - ultimaConfiguracion >= CONFIG_INTERVALO_MS) {
        ultimaConfiguracion = millis();
        consultarConfiguracion();
      }
      LecturaPendiente lectura;
      if (xQueueReceive(colaEnvios, &lectura, pdMS_TO_TICKS(500)) == pdTRUE) {
        enviarLectura(lectura);
      }
    } else {
      vTaskDelay(pdMS_TO_TICKS(500));
    }
  }
}

// ── Setup / loop ────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Nodo ESP32 Avisens ===");

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
  delay(2000);

  colaEnvios = xQueueCreate(1, sizeof(LecturaPendiente));
  colaConfiguracion = xQueueCreate(1, sizeof(ConfiguracionDht));
  if (colaEnvios == nullptr || colaConfiguracion == nullptr) {
    Serial.println("[Error] No se pudo crear la cola de red; seguirá el control local.");
    return;
  }

  if (xTaskCreatePinnedToCore(tareaRed, "avisens-red", 8192, nullptr, 1,
                              nullptr, 0) != pdPASS) {
    Serial.println("[Error] No se pudo iniciar la tarea de red; seguirá el control local.");
    vQueueDelete(colaEnvios);
    vQueueDelete(colaConfiguracion);
    colaEnvios = nullptr;
    colaConfiguracion = nullptr;
  }
}

void loop() {
  if (!pinDhtPermitido(PIN_DHT)) { delay(2000); return; }
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
  delay(2000);  // DHT22: máximo una lectura cada dos segundos por conexión
}
