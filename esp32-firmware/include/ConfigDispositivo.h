#pragma once
#include <Arduino.h>

// Configuración de red del nodo que se puede cambiar sin recompilar: se
// guarda en la NVS (memoria no volátil del ESP32) desde el portal web. La
// primera vez, o tras borrarla, se usan los valores de config.h.
struct ConfigDispositivo {
  String ssid;
  String password;
  String backendUrl;  // URL completa de /ingest (http:// o https://)
  String token;       // X-Device-Token del dispositivo
};

// Lee la NVS; lo que no esté guardado toma el valor de config.h.
void cargarConfigDispositivo();

const ConfigDispositivo &configDispositivo();

// true si la configuración actual viene de la NVS (cambiada en el portal).
bool configDesdeMemoria();

bool guardarConfigDispositivo(const ConfigDispositivo &nueva);

// Borra lo guardado: al reiniciar se vuelve a los valores de config.h.
void borrarConfigDispositivo();
