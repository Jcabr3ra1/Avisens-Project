#include "ConfigDispositivo.h"
#include <Preferences.h>
#include "config.h"

// config.h antiguos no traen el segundo destino: sin definirlo queda apagado.
#ifndef BACKEND_URL_2
#define BACKEND_URL_2 ""
#endif
#ifndef DEVICE_TOKEN_2
#define DEVICE_TOKEN_2 ""
#endif

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
  config.backendUrl2 = prefs.getString("backend_url2", BACKEND_URL_2);
  config.token2 = prefs.getString("token2", DEVICE_TOKEN_2);
  prefs.end();

  Serial.printf("[Config] %s · WiFi \"%s\" · backend %s · espejo %s\n",
                desdeMemoria ? "guardada en el portal" : "de config.h",
                config.ssid.c_str(), config.backendUrl.c_str(),
                config.backendUrl2.length() > 0 ? config.backendUrl2.c_str() : "(ninguno)");
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
  // El espejo es opcional: vacío lo apaga (putString con "" devuelve 0).
  prefs.putString("backend_url2", nueva.backendUrl2);
  prefs.putString("token2", nueva.token2);
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
