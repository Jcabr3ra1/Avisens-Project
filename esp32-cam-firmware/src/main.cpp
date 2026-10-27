// main.cpp — ESP32-CAM (AI-Thinker) del galpón.
//
// Cada INTERVALO_FOTO_MS toma una foto JPEG y la envía al backend
// (POST BACKEND_URL_FOTO, header X-Device-Token). El servidor la analiza con
// el modelo YOLO: cuenta los pollos, sigue a los quietos y genera alertas.
//
// Además sirve, en la red local:
//   http://<IP>/          estado (WiFi, último envío, conteo)
//   http://<IP>/capture   una foto nueva, para apuntar la cámara
//
// Pines AI-Thinker: los mismos del ejemplo CameraWebServer
// (CAMERA_MODEL_AI_THINKER).

#include <Arduino.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include "esp_camera.h"
#include "config.h"

#if !defined(WIFI_SSID) || !defined(BACKEND_URL_FOTO) || !defined(DEVICE_TOKEN)
#error "Copia include/config.example.h como include/config.h y completa tus valores."
#endif

// ─── Pines de la cámara (AI-Thinker) ─────────────────────────────────────
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22
#define LED_FLASH_GPIO 4

static const char *VERSION_FIRMWARE = "cam-1.0.0";

WebServer servidor(80);
unsigned long ultimaFoto = 0;
int fallosSeguidos = 0;
int ultimoCodigo = 0;
String ultimaRespuesta = "todavía no";
unsigned long ultimoEnvioMs = 0;

// ─── Cámara ──────────────────────────────────────────────────────────────

bool iniciarCamara()
{
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = CAMARA_FRAMESIZE;
  config.jpeg_quality = CAMARA_CALIDAD;
  // GRAB_LATEST: cada foto es de "ahora", no un cuadro viejo del búfer.
  config.grab_mode = CAMERA_GRAB_LATEST;
  config.fb_location = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
  config.fb_count = psramFound() ? 2 : 1;

  esp_err_t error = esp_camera_init(&config);
  if (error != ESP_OK)
  {
    Serial.printf("❌ La cámara no inició (0x%x). Revisa la cinta del OV2640 y la alimentación.\n", error);
    return false;
  }
  sensor_t *s = esp_camera_sensor_get();
  s->set_framesize(s, CAMARA_FRAMESIZE);
  s->set_quality(s, CAMARA_CALIDAD);
  s->set_vflip(s, CAMARA_VFLIP);
  s->set_hmirror(s, CAMARA_HMIRROR);
  Serial.println("✓ Cámara lista");
  return true;
}

// Descarta un cuadro: el primero tras un rato quieta suele salir con la
// exposición vieja.
camera_fb_t *tomarFoto()
{
  camera_fb_t *fb = esp_camera_fb_get();
  if (fb)
    esp_camera_fb_return(fb);
  return esp_camera_fb_get();
}

// ─── WiFi ────────────────────────────────────────────────────────────────

void conectarWiFi()
{
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false); // con ahorro de energía la cámara pierde paquetes
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("[WiFi] Conectando a %s", WIFI_SSID);
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.printf("✓ WiFi conectado. IP: %s · MAC: %s\n",
                  WiFi.localIP().toString().c_str(), WiFi.macAddress().c_str());
  }
  else
  {
    Serial.println("⚠ Sin WiFi todavía: se reintenta en el siguiente ciclo");
  }
}

// ─── Envío ───────────────────────────────────────────────────────────────

bool enviarFoto(camera_fb_t *fb)
{
  HTTPClient http;
  WiFiClient clientePlano;
  WiFiClientSecure clienteTls;
  String url = BACKEND_URL_FOTO;
  if (url.startsWith("https://"))
  {
    // Cifra la conexión sin validar el certificado del servidor, igual que el
    // nodo de sensores: evita cargar y renovar la CA en el firmware.
    clienteTls.setInsecure();
    http.begin(clienteTls, url);
  }
  else
  {
    http.begin(clientePlano, url);
  }
  http.setTimeout(TIMEOUT_ENVIO_MS);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.addHeader("X-Firmware-Version", VERSION_FIRMWARE);

  ultimoCodigo = http.POST(fb->buf, fb->len);
  ultimaRespuesta = ultimoCodigo > 0 ? http.getString() : http.errorToString(ultimoCodigo);
  http.end();
  ultimoEnvioMs = millis();

  bool ok = ultimoCodigo >= 200 && ultimoCodigo < 300;
  Serial.printf("[Foto] %u bytes → %d %s\n", fb->len, ultimoCodigo, ultimaRespuesta.c_str());
  if (ultimoCodigo == 401)
  {
    Serial.println("⚠ Token rechazado: revisa DEVICE_TOKEN en config.h");
  }
  return ok;
}

// ─── Portal local ────────────────────────────────────────────────────────

void paginaEstado()
{
  String html = "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\">"
                "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                "<title>Cámara Avisens</title><style>body{font-family:system-ui,sans-serif;"
                "background:#f4f6f5;color:#14211b;padding:16px}main{max-width:680px;margin:auto}"
                "img{width:100%;border-radius:10px;border:1px solid #cfd8d3}"
                "td{padding:4px 8px}</style></head><body><main><h1>Cámara Avisens</h1><table>";
  html += "<tr><td>WiFi</td><td>" + String(WiFi.status() == WL_CONNECTED ? "Conectado · " + WiFi.localIP().toString() : "Sin conexión") + "</td></tr>";
  html += "<tr><td>Backend</td><td>" + String(BACKEND_URL_FOTO) + "</td></tr>";
  html += "<tr><td>Último envío</td><td>" + (ultimoEnvioMs ? String(ultimoCodigo) + " · hace " + String((millis() - ultimoEnvioMs) / 1000) + " s" : String("todavía no")) + "</td></tr>";
  html += "<tr><td>Respuesta</td><td><code>" + ultimaRespuesta + "</code></td></tr>";
  html += "<tr><td>Fallos seguidos</td><td>" + String(fallosSeguidos) + "</td></tr>";
  html += "<tr><td>Firmware</td><td>" + String(VERSION_FIRMWARE) + "</td></tr></table>";
  html += "<p><a href=\"/capture\">Foto nueva</a> (recarga para apuntar la cámara)</p>"
          "<img src=\"/capture\" alt=\"Vista de la cámara\"></main></body></html>";
  servidor.send(200, "text/html; charset=utf-8", html);
}

void paginaCaptura()
{
  camera_fb_t *fb = tomarFoto();
  if (!fb)
  {
    servidor.send(503, "text/plain", "No se pudo tomar la foto");
    return;
  }
  servidor.sendHeader("Cache-Control", "no-store");
  servidor.send_P(200, "image/jpeg", reinterpret_cast<const char *>(fb->buf), fb->len);
  esp_camera_fb_return(fb);
}

// ─── Programa ────────────────────────────────────────────────────────────

void setup()
{
  Serial.begin(115200);
  delay(300);
  Serial.printf("\n=== ESP32-CAM Avisens · %s ===\n", VERSION_FIRMWARE);
  pinMode(LED_FLASH_GPIO, OUTPUT);
  digitalWrite(LED_FLASH_GPIO, LOW); // el flash apagado: no molestar a los pollos

  if (!iniciarCamara())
  {
    delay(5000);
    ESP.restart();
  }
  conectarWiFi();

  servidor.on("/", paginaEstado);
  servidor.on("/capture", paginaCaptura);
  servidor.begin();
  Serial.println("Portal: http://<IP>/  ·  foto: http://<IP>/capture");
}

void loop()
{
  servidor.handleClient();

  if (millis() - ultimaFoto < INTERVALO_FOTO_MS)
  {
    delay(5);
    return;
  }
  ultimaFoto = millis();

  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("⚠ WiFi desconectado: reintentando");
    WiFi.reconnect();
    fallosSeguidos++;
  }
  else
  {
    camera_fb_t *fb = tomarFoto();
    if (!fb)
    {
      Serial.println("⚠ No se pudo tomar la foto");
      fallosSeguidos++;
    }
    else
    {
      bool ok = enviarFoto(fb);
      esp_camera_fb_return(fb);
      // 401/403 es configuración (token), no algo que un reinicio arregle.
      fallosSeguidos = (ok || ultimoCodigo == 401 || ultimoCodigo == 403) ? 0 : fallosSeguidos + 1;
    }
  }

  if (fallosSeguidos >= FALLOS_PARA_REINICIAR)
  {
    Serial.printf("⚠ %d envíos fallidos seguidos: reiniciando la cámara\n", fallosSeguidos);
    delay(500);
    ESP.restart();
  }
}
