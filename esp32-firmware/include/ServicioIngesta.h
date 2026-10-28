#pragma once
#include <Arduino.h>
#include "ControlRemoto.h"

// Genera un id_lote nuevo (UUID v4, RFC 4122) para UN ciclo de lectura.
// El mismo valor se reutiliza en todos los reintentos de ese ciclo -- así
// el backend puede reconocer un reintento como el mismo lote de lecturas,
// no como uno nuevo.
String generarIdLote();

// Envía UNA lectura con reintentos acotados. El payload (temperatura,
// humedad, idLote) se arma UNA sola vez, antes del primer intento: todos
// los reintentos mandan el mismo cuerpo -- si se regenerara por intento,
// el backend vería cada reintento como un ciclo distinto y la
// idempotencia de id_lote no serviría de nada.
// Devuelve true si el backend confirmó (2xx); false si se agotaron los
// MAX_REINTENTOS_INGESTA intentos -- en ese caso el ciclo se abandona,
// sin buffer local: el siguiente ciclo arranca con un id_lote nuevo.
// Estado de los actuadores en el ciclo: true si estuvieron encendidos en
// algún momento desde el envío anterior.
struct EstadoActuadores {
  bool alimentador;  // motor L293D canal B
  bool persiana;     // motor L293D canal A
  bool reles[4];     // K1..K4 (reles[0] = K1)
};

// Lo que se envía en un ciclo. Un sensor que falló en el ciclo va con su
// incluir* en false y se omite: así un fallo no tumba el envío del resto
// (ni oculta que un motor se encendió).
struct CicloIngesta {
  bool incluirDht;
  float temperatura;
  float humedad;
  bool incluirAgua;
  float distanciaAgua;  // cm, del HC-SR04 a la superficie del agua
  bool incluirGas;
  int gasAdc;           // MQ-135: ADC crudo filtrado (0-4095), no ppm
  bool incluirPeso;
  float pesoGramos;     // HX711, ya tarado
  bool pesoCalibrado;   // false = factor de ejemplo: se envía "sospechosa"
  EstadoActuadores actuadores;
  // Confirmaciones de órdenes remotas que el backend aún no recibió.
  const ResultadoOrdenRemota *resultados;
  uint8_t cantidadResultados;
  EstadoReles reles;  // modo y salida actuales de K1-K4
  // UUID de esta sesión de arranque (ver tareaWiFi). Con él el backend sabe
  // que el ESP32 se reinició y no le reentrega órdenes de la sesión anterior.
  const char *arranqueId;
};

// Tope de órdenes que se leen de una respuesta (el backend manda hasta 10).
#define MAX_ORDENES_POR_RESPUESTA 10

// Lo que trajo la respuesta de /ingest. contratoValido es true cuando el
// backend procesó el envío (aunque haya ignorado algún código): solo
// entonces las confirmaciones enviadas se dan por recibidas.
struct RespuestaIngesta {
  bool contratoValido;
  uint8_t cantidadOrdenes;
  OrdenRecibida ordenes[MAX_ORDENES_POR_RESPUESTA];
};

bool enviarLecturaConReintentos(const CicloIngesta &ciclo, const String &idLote,
                                RespuestaIngesta &respuesta);

// Hora real por internet (NTP). El búfer la necesita para fechar lecturas.
void iniciarHoraRed();
bool horaSincronizada();

// Guarda en el búfer las lecturas de un ciclo cuando no hay WiFi. Como mucho
// una por INTERVALO_BUFFER_MS, para que el búfer cubra un corte largo.
void guardarCicloSinRed(const CicloIngesta &ciclo);

// true si ya toca guardar otra lectura (hay hora real y pasó el intervalo).
// Se consulta ANTES de armar el ciclo: armarlo reinicia el aviso de que un
// motor se encendió, y no debe gastarse en un ciclo que se va a descartar.
bool bufferListoParaGuardar();

// Lecturas guardadas que aún no se reenviaron.
size_t lecturasPendientes();
