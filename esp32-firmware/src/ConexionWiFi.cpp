#include "ConexionWiFi.h"
#include <esp_log.h>
#include "config.h"

static const char *TAG = "WiFi";

ConexionWiFi::ConexionWiFi()
    : hostname_("galponsmart"),
      conectado_(false),
      ultimoIntento_(0),
      intervaloReconexion_(INTERVALO_RECONEXION_MS),
      desconectadoDesde_(0),
      apActivo_(false) {}

void ConexionWiFi::configurar(const String &ssid, const String &password)
{
  ssid_ = ssid;
  password_ = password;
}

void ConexionWiFi::comenzar()
{
  ESP_LOGI(TAG, "Iniciando conexión WiFi asíncrona...");
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(hostname_.c_str());
  desconectadoDesde_ = millis();

  if (ssid_.isEmpty())
  {
    // Sin red configurada no hay nada que intentar: directo a la red de
    // rescate para poder configurarla desde el portal.
    Serial.println("[WiFi] Sin red configurada");
    iniciarPuntoAcceso();
    return;
  }

  WiFi.begin(ssid_.c_str(), password_.c_str());

  Serial.print("[WiFi] Conectando a SSID: ");
  Serial.println(ssid_);
}

void ConexionWiFi::actualizar()
{
  unsigned long ahora = millis();

  if (WiFi.status() == WL_CONNECTED)
  {
    if (!conectado_)
    {
      conectado_ = true;
      Serial.print("✓ WiFi conectado. IP: ");
      Serial.println(WiFi.localIP());
      // La MAC es la que se registra en el backend (dispositivos.mac_address).
      Serial.print("  MAC: ");
      Serial.println(WiFi.macAddress());
    }
    if (apActivo_)
    {
      detenerPuntoAcceso();
    }
  }
  else
  {
    if (conectado_)
    {
      conectado_ = false;
      desconectadoDesde_ = ahora;
      ESP_LOGW(TAG, "WiFi desconectado");
      Serial.println("⚠ WiFi desconectado");
    }

    // Mucho tiempo sin red (otra casa, clave cambiada): se levanta la red
    // propia para poder corregir la configuración sin USB. Se sigue
    // intentando la red configurada mientras tanto.
    if (!apActivo_ && ahora - desconectadoDesde_ >= PORTAL_AP_TRAS_MS)
    {
      iniciarPuntoAcceso();
    }

    if (!ssid_.isEmpty() && ahora - ultimoIntento_ >= intervaloReconexion_)
    {
      ultimoIntento_ = ahora;
      Serial.print("[WiFi] Reconectando... Estado: ");
      Serial.println(static_cast<int>(WiFi.status()));
      WiFi.reconnect();
    }
  }
}

bool ConexionWiFi::estaConectado() const
{
  return conectado_ && (WiFi.status() == WL_CONNECTED);
}

IPAddress ConexionWiFi::getIP() const
{
  return WiFi.localIP();
}

void ConexionWiFi::setHostname(const char *hostname)
{
  hostname_ = hostname;
  if (estaConectado())
  {
    WiFi.setHostname(hostname);
  }
}

void ConexionWiFi::desconectar()
{
  conectado_ = false;
  WiFi.disconnect(true);
  ESP_LOGI(TAG, "WiFi desconectado manualmente");
  Serial.println("[WiFi] Desconectado.");
}

String ConexionWiFi::nombrePuntoAcceso() const
{
  // Los 4 últimos dígitos de la MAC distinguen un nodo de otro.
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  return "Avisens-" + mac.substring(mac.length() - 4);
}

void ConexionWiFi::iniciarPuntoAcceso()
{
  WiFi.mode(WIFI_AP_STA);
  apActivo_ = WiFi.softAP(nombrePuntoAcceso().c_str(), PORTAL_AP_PASSWORD);
  if (apActivo_)
  {
    Serial.printf("[WiFi] Red propia \"%s\" activa · portal en http://%s\n",
                  nombrePuntoAcceso().c_str(), WiFi.softAPIP().toString().c_str());
  }
  else
  {
    LOG_WARN("No se pudo crear la red propia (PORTAL_AP_PASSWORD necesita 8+ caracteres)");
  }
}

void ConexionWiFi::detenerPuntoAcceso()
{
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
  apActivo_ = false;
  Serial.println("[WiFi] Red propia apagada (ya hay conexión al WiFi)");
}
