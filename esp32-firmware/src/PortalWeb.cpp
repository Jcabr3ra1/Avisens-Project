#include "PortalWeb.h"
#include <WebServer.h>
#include <Update.h>
#include "ConexionWiFi.h"
#include "ConfigDispositivo.h"
#include "config.h"

#if !defined(PORTAL_PASSWORD) || !defined(PORTAL_AP_PASSWORD) || !defined(PORTAL_AP_TRAS_MS)
#error "Define PORTAL_PASSWORD, PORTAL_AP_PASSWORD y PORTAL_AP_TRAS_MS en include/config.h (ver config.example.h)."
#endif

static const char *VERSION_FIRMWARE = "1.1.0";
static const char *USUARIO_PORTAL = "admin";

static WebServer servidor(80);
static ConexionWiFi *conexionWiFi = nullptr;
static bool ultimoEnvioOk = false;
static unsigned long ultimoEnvioMs = 0;
static bool subidaAutorizada = false;

// ─── Utilidades HTML ─────────────────────────────────────────────────────

static String escaparHtml(const String &texto) {
  String r;
  r.reserve(texto.length());
  for (char c : texto) {
    switch (c) {
      case '&': r += "&amp;"; break;
      case '<': r += "&lt;"; break;
      case '>': r += "&gt;"; break;
      case '"': r += "&quot;"; break;
      default: r += c;
    }
  }
  return r;
}

static String pagina(const String &titulo, const String &cuerpo) {
  return String(F("<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\">"
                  "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                  "<title>")) + titulo + F("</title><style>"
         "body{font-family:system-ui,sans-serif;background:#f4f6f5;color:#14211b;margin:0;padding:16px}"
         "main{max-width:560px;margin:0 auto;background:#fbfcfb;border:1px solid #d9e2dd;border-radius:14px;padding:20px}"
         "h1{font-size:1.3rem;margin:0 0 4px}p.sub{color:#5b6b63;margin:0 0 16px}"
         "table{width:100%;border-collapse:collapse}td{padding:7px 4px;border-top:1px solid #e3e9e5;vertical-align:top}"
         "td:first-child{color:#5b6b63;width:40%}label{display:block;margin:12px 0 4px;font-weight:600}"
         "input{width:100%;box-sizing:border-box;padding:9px;border:1px solid #c5d0ca;border-radius:8px;font-size:1rem}"
         "button,a.btn{display:inline-block;margin-top:16px;padding:10px 16px;border:0;border-radius:8px;"
         "background:#0f7a55;color:#fff;font-size:1rem;text-decoration:none;cursor:pointer}"
         "a.sec,button.sec{background:#e3e9e5;color:#14211b}.ok{color:#0f7a55}.mal{color:#b3261e}"
         "small{color:#5b6b63}</style></head><body><main>") + cuerpo + F("</main></body></html>");
}

static bool exigirAdmin() {
  if (servidor.authenticate(USUARIO_PORTAL, PORTAL_PASSWORD)) return true;
  servidor.requestAuthentication(BASIC_AUTH, "Avisens", "Clave de administrador requerida");
  return false;
}

static void reiniciarEnSegundos(int segundos) {
  // Da tiempo a que la respuesta salga antes del reinicio.
  delay(segundos * 1000);
  ESP.restart();
}

// ─── Páginas ─────────────────────────────────────────────────────────────

static void paginaEstado() {
  const ConfigDispositivo &cfg = configDispositivo();
  String envio = "Todavía no";
  if (ultimoEnvioMs > 0) {
    unsigned long seg = (millis() - ultimoEnvioMs) / 1000;
    envio = String(ultimoEnvioOk ? "<span class=\"ok\">OK</span>" : "<span class=\"mal\">Falló</span>") +
            " · hace " + seg + " s";
  }
  String wifi = conexionWiFi && conexionWiFi->estaConectado()
                    ? "<span class=\"ok\">Conectado</span> a " + escaparHtml(cfg.ssid) +
                          " · " + WiFi.localIP().toString()
                    : "<span class=\"mal\">Sin conexión</span> (" + escaparHtml(cfg.ssid) + ")";
  String red = conexionWiFi && conexionWiFi->puntoAccesoActivo()
                   ? escaparHtml(conexionWiFi->nombrePuntoAcceso()) + " · " + WiFi.softAPIP().toString()
                   : "Apagada";

  String cuerpo = F("<h1>Nodo Avisens</h1><p class=\"sub\">Estado del ESP32 del galpón</p><table>");
  cuerpo += "<tr><td>WiFi</td><td>" + wifi + "</td></tr>";
  cuerpo += "<tr><td>Red propia</td><td>" + red + "</td></tr>";
  cuerpo += "<tr><td>Backend</td><td>" + escaparHtml(cfg.backendUrl) + "</td></tr>";
  cuerpo += "<tr><td>Último envío</td><td>" + envio + "</td></tr>";
  cuerpo += "<tr><td>Configuración</td><td>" +
            String(configDesdeMemoria() ? "Guardada desde este portal" : "La de config.h") + "</td></tr>";
  cuerpo += "<tr><td>MAC</td><td>" + WiFi.macAddress() + "</td></tr>";
  cuerpo += "<tr><td>Firmware</td><td>" + String(VERSION_FIRMWARE) + "</td></tr>";
  cuerpo += "<tr><td>Encendido hace</td><td>" + String(millis() / 60000) + " min</td></tr></table>";
  cuerpo += F("<a class=\"btn\" href=\"/config\">Configurar</a> "
              "<a class=\"btn sec\" href=\"/actualizar\">Actualizar firmware</a>");
  servidor.send(200, "text/html; charset=utf-8", pagina("Nodo Avisens", cuerpo));
}

static void paginaConfig() {
  if (!exigirAdmin()) return;
  const ConfigDispositivo &cfg = configDispositivo();
  // Las claves no se devuelven al navegador: vacío = conservar la actual.
  String cuerpo = F("<h1>Configuración</h1><p class=\"sub\">Se guarda en el ESP32 y se reinicia</p>"
                    "<form method=\"post\" action=\"/config\">");
  cuerpo += "<label>Red WiFi (SSID)</label><input name=\"ssid\" required maxlength=\"32\" value=\"" +
            escaparHtml(cfg.ssid) + "\">";
  cuerpo += F("<label>Contraseña del WiFi</label><input name=\"password\" type=\"password\" maxlength=\"64\" "
              "placeholder=\"(vacío = no cambiar)\">");
  cuerpo += "<label>URL del backend (/ingest)</label><input name=\"backend_url\" required maxlength=\"200\" value=\"" +
            escaparHtml(cfg.backendUrl) + "\"><small>Ej.: https://tu-backend.up.railway.app/ingest</small>";
  cuerpo += F("<label>Token del dispositivo</label><input name=\"token\" type=\"password\" maxlength=\"200\" "
              "placeholder=\"(vacío = no cambiar)\"><button type=\"submit\">Guardar y reiniciar</button></form>"
              "<form method=\"post\" action=\"/config/borrar\" "
              "onsubmit=\"return confirm('¿Volver a la configuración de config.h?')\">"
              "<button class=\"sec\" type=\"submit\">Volver a la configuración de fábrica</button></form>"
              "<p><a href=\"/\">← Estado</a></p>");
  servidor.send(200, "text/html; charset=utf-8", pagina("Configuración", cuerpo));
}

static void guardarConfig() {
  if (!exigirAdmin()) return;
  const ConfigDispositivo &actual = configDispositivo();
  ConfigDispositivo nueva = actual;
  nueva.ssid = servidor.arg("ssid");
  nueva.backendUrl = servidor.arg("backend_url");
  nueva.ssid.trim();
  nueva.backendUrl.trim();
  if (servidor.arg("password").length() > 0) nueva.password = servidor.arg("password");
  if (servidor.arg("token").length() > 0) nueva.token = servidor.arg("token");

  bool urlValida = nueva.backendUrl.startsWith("http://") || nueva.backendUrl.startsWith("https://");
  if (nueva.ssid.isEmpty() || !urlValida) {
    servidor.send(400, "text/html; charset=utf-8",
                  pagina("Error", "<h1>No se guardó</h1><p>Falta la red WiFi o la URL no empieza por "
                                  "http:// o https://.</p><p><a href=\"/config\">← Volver</a></p>"));
    return;
  }
  if (!guardarConfigDispositivo(nueva)) {
    servidor.send(500, "text/html; charset=utf-8",
                  pagina("Error", "<h1>No se pudo guardar</h1><p><a href=\"/config\">← Volver</a></p>"));
    return;
  }
  servidor.send(200, "text/html; charset=utf-8",
                pagina("Guardado", "<h1>Configuración guardada</h1><p>El ESP32 se reinicia y se conecta a "
                                   "<b>" + escaparHtml(nueva.ssid) + "</b>. Si la red cambió, búscalo en la "
                                   "IP que le dé ese router.</p>"));
  Serial.println("[Portal] Configuración guardada, reiniciando");
  reiniciarEnSegundos(2);
}

static void borrarConfig() {
  if (!exigirAdmin()) return;
  borrarConfigDispositivo();
  servidor.send(200, "text/html; charset=utf-8",
                pagina("Restablecido", "<h1>Configuración borrada</h1><p>El ESP32 se reinicia con los "
                                       "valores de config.h.</p>"));
  Serial.println("[Portal] Configuración borrada, reiniciando");
  reiniciarEnSegundos(2);
}

static void paginaActualizar() {
  if (!exigirAdmin()) return;
  String cuerpo = F("<h1>Actualizar firmware</h1><p class=\"sub\">Sube el archivo <b>firmware.bin</b> que "
                    "genera PlatformIO en <code>.pio/build/esp32dev/</code></p>"
                    "<form method=\"post\" action=\"/actualizar\" enctype=\"multipart/form-data\">"
                    "<input type=\"file\" name=\"firmware\" accept=\".bin\" required>"
                    "<button type=\"submit\">Subir e instalar</button></form>"
                    "<p><small>No desconectes la corriente mientras se instala (~30 s). "
                    "Si algo falla, el ESP32 sigue con el firmware actual.</small></p>"
                    "<p><a href=\"/\">← Estado</a></p>");
  servidor.send(200, "text/html; charset=utf-8", pagina("Actualizar firmware", cuerpo));
}

// Recibe el .bin por partes mientras se sube y lo escribe en la partición
// OTA libre; el arranque solo cambia a ella si llegó entero y verificado.
static void recibirFirmware() {
  HTTPUpload &subida = servidor.upload();
  switch (subida.status) {
    case UPLOAD_FILE_START:
      subidaAutorizada = servidor.authenticate(USUARIO_PORTAL, PORTAL_PASSWORD);
      if (!subidaAutorizada) return;
      Serial.printf("[OTA] Recibiendo %s\n", subida.filename.c_str());
      if (!Update.begin(UPDATE_SIZE_UNKNOWN)) Update.printError(Serial);
      break;
    case UPLOAD_FILE_WRITE:
      if (subidaAutorizada && Update.write(subida.buf, subida.currentSize) != subida.currentSize) {
        Update.printError(Serial);
      }
      break;
    case UPLOAD_FILE_END:
      if (subidaAutorizada && Update.end(true)) {
        Serial.printf("[OTA] Listo: %u bytes\n", subida.totalSize);
      } else if (subidaAutorizada) {
        Update.printError(Serial);
      }
      break;
    case UPLOAD_FILE_ABORTED:
      if (subidaAutorizada) Update.abort();
      Serial.println("[OTA] Subida cancelada");
      break;
    default:
      break;
  }
}

static void finSubidaFirmware() {
  if (!subidaAutorizada) {
    exigirAdmin();
    return;
  }
  if (Update.hasError() || !Update.isFinished()) {
    servidor.send(500, "text/html; charset=utf-8",
                  pagina("Error", String("<h1>No se instaló</h1><p>") + Update.errorString() +
                                      "</p><p>El ESP32 sigue con el firmware anterior.</p>"
                                      "<p><a href=\"/actualizar\">← Reintentar</a></p>"));
    return;
  }
  servidor.send(200, "text/html; charset=utf-8",
                pagina("Instalado", "<h1>Firmware instalado</h1><p>El ESP32 se reinicia con la versión "
                                    "nueva. Vuelve al <a href=\"/\">estado</a> en unos segundos.</p>"));
  Serial.println("[OTA] Reiniciando con el firmware nuevo");
  reiniciarEnSegundos(2);
}

// ─── API pública ─────────────────────────────────────────────────────────

void iniciarPortalWeb(ConexionWiFi &conexion) {
  conexionWiFi = &conexion;
  servidor.on("/", HTTP_GET, paginaEstado);
  servidor.on("/config", HTTP_GET, paginaConfig);
  servidor.on("/config", HTTP_POST, guardarConfig);
  servidor.on("/config/borrar", HTTP_POST, borrarConfig);
  servidor.on("/actualizar", HTTP_GET, paginaActualizar);
  servidor.on("/actualizar", HTTP_POST, finSubidaFirmware, recibirFirmware);
  servidor.onNotFound([]() { servidor.send(404, "text/plain; charset=utf-8", "No existe"); });
  servidor.begin();
  Serial.println("[Portal] Portal web en el puerto 80 (/ , /config , /actualizar)");
}

void atenderPortalWeb() {
  servidor.handleClient();
}

void reportarEnvioPortal(bool ok) {
  ultimoEnvioOk = ok;
  ultimoEnvioMs = millis();
}
