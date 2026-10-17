#pragma once
#include <Arduino.h>

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
  EstadoActuadores actuadores;
};

bool enviarLecturaConReintentos(const CicloIngesta &ciclo, const String &idLote);
