#pragma once
#include <Arduino.h>

// Portal web del nodo (puerto 80), en la IP del WiFi o en 192.168.4.1 cuando
// el ESP32 levanta su red propia:
//   /            estado del nodo (sin clave)
//   /config      red WiFi, URL del backend y token (usuario admin)
//   /actualizar  subir un firmware .bin por WiFi, sin USB (usuario admin)
// Corre en la tarea de red (Core 1): atenderPortalWeb() en cada vuelta.

class ConexionWiFi;

void iniciarPortalWeb(ConexionWiFi &conexion);
void atenderPortalWeb();

// La tarea de red avisa el resultado de cada envío para mostrarlo en "/".
void reportarEnvioPortal(bool ok);
