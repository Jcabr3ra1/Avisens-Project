#include "ConfigDispositivo.h"
#include <Preferences.h>
#include "config.h"

static const char *NAMESPACE_NVS = "avisens";

static ConfigDispositivo config;
static bool desdeMemoria = false;

void cargarConfigDispositivo() {
  Preferences prefs;
  prefs.begin(NAMESPACE_NVS, true);
  desdeMemoria = prefs.isKey("ssid");
  config.ssid = prefs.getString("ssid", WIFI_SSID);
  config.password = prefs.getString("password", WIFI_PASSWORD);
  config.backendUrl = prefs.getString("backend_url", BACKEND_URL);
  config.token = prefs.getString("token", DEVICE_TOKEN);
  prefs.end();

  Serial.printf("[Config] %s · WiFi \"%s\" · backend %s\n",
                desdeMemoria ? "guardada en el portal" : "de config.h",
                config.ssid.c_str(), config.backendUrl.c_str());
}

const ConfigDispositivo &configDispositivo() {
  return config;
}

bool configDesdeMemoria() {
  return desdeMemoria;
}

bool guardarConfigDispositivo(const ConfigDispositivo &nueva) {
  Preferences prefs;
  if (!prefs.begin(NAMESPACE_NVS, false)) return false;
  bool ok = prefs.putString("ssid", nueva.ssid) > 0 &&
            prefs.putString("backend_url", nueva.backendUrl) > 0 &&
            prefs.putString("token", nueva.token) > 0;
  // Una red abierta tiene contraseña vacía: putString devuelve 0 y es válido.
  prefs.putString("password", nueva.password);
  prefs.end();
  if (ok) {
    config = nueva;
    desdeMemoria = true;
  }
  return ok;
}

void borrarConfigDispositivo() {
  Preferences prefs;
  prefs.begin(NAMESPACE_NVS, false);
  prefs.clear();
  prefs.end();
  desdeMemoria = false;
}
