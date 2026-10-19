#ifndef REGLAS_CONTROL_REMOTO_H
#define REGLAS_CONTROL_REMOTO_H

#include <stdint.h>

// Reglas que decide si una orden remota sobre K1-K4 respeta las restricciones
// de la lógica automática. Sin dependencias de Arduino a propósito: así se
// pueden probar en el host (test/test_reglas_control_remoto).
//
// Usa los umbrales de config.h, que deben estar definidos antes de incluir
// este archivo.
#if !defined(TEMP_CALOR) || !defined(NH3_ALTO) || !defined(NIVEL_BOMBA_ON) || !defined(NIVEL_BOMBA_OFF)
#error "Incluye config.h (TEMP_CALOR, NH3_ALTO, NIVEL_BOMBA_ON/OFF) antes de ReglasControlRemoto.h"
#endif

// Lo que tareaGalpon sabe del galpón en este ciclo de sensores.
struct ContextoProtecciones {
  bool sistemaEnMonitoreo;
  bool dhtEnError;      // fallos persistentes (MAX_FALLOS_SENSOR)
  bool dhtValida;       // la lectura de ESTE ciclo es válida (DHT no sostiene datos)
  float temperatura;    // solo significa algo si dhtValida
  int rawNH3;           // MQ-135: el driver no detecta fallos (ver CONTROL_REMOTO.md)
  bool ultrasonicoEnError;
  bool aguaValida;      // estado OK, aunque sea la última lectura sostenida
  bool aguaActual;      // estado OK y medida en ESTE ciclo (no sostenida)
  float distanciaAgua;  // cm hasta la superficie: más distancia = menos agua
};

// Para qué se evalúan las reglas:
// - AUTORIZAR: llega una orden nueva. Solo se acepta con muestras de este
//   ciclo: sin ellas, "no hay calor" o "el tanque no está lleno" serían
//   suposiciones, y una suposición no autoriza mover un relé.
// - SOSTENER: el relé ya está en manual remoto (vigilar). Se usa lo mismo que
//   usa la lógica automática: un fallo puntual no revierte (la automática
//   también conserva su última decisión) y el fallo persistente sí.
enum class UsoRegla : uint8_t { AUTORIZAR, SOSTENER };

// nullptr si la acción respeta las restricciones; si no, el motivo (texto
// fijo, sin comillas: viaja tal cual en el JSON de /ingest).
inline const char *motivoBloqueoRemoto(uint8_t rele, bool encender, UsoRegla uso,
                                       const ContextoProtecciones &ctx)
{
  if (!ctx.sistemaEnMonitoreo)
    return "El sistema no esta en MONITORING (arranque, calibracion o fail-safe)";

  bool autorizar = uso == UsoRegla::AUTORIZAR;

  if (rele >= 1 && rele <= 3)
  {
    if (ctx.dhtEnError)
      return "DHT22 en error: el clima lo gobierna el fail-safe";

    // Encender K1 o apagar K2/K3 es ir hacia donde el calor lo prohíbe. Hacia
    // el lado contrario (apagar K1, encender K2/K3) siempre es seguro.
    bool haciaLoQueElCalorProhibe = (rele == 1 && encender) || (rele != 1 && !encender);
    if (autorizar && haciaLoQueElCalorProhibe && !ctx.dhtValida)
      return "Sin lectura valida del DHT22 en este ciclo: no se autoriza";

    bool gasesAltos = ctx.rawNH3 >= NH3_ALTO;
    bool calor = ctx.dhtValida && ctx.temperatura >= TEMP_CALOR;

    // K1: la lógica automática nunca calienta con gases altos ni con calor.
    if (rele == 1 && encender && (gasesAltos || calor))
      return gasesAltos ? "Gases altos: la calefaccion queda bloqueada"
                        : "Temperatura en zona de calor: la calefaccion queda bloqueada";

    // K2/K3: con calor o gases altos la ventilación es obligatoria.
    if (rele != 1 && !encender && (gasesAltos || calor))
      return gasesAltos ? "Gases altos: la ventilacion no se puede apagar"
                        : "Temperatura en zona de calor: la ventilacion no se puede apagar";
    return nullptr;
  }

  // K4: bomba de llenado. Las dos direcciones tienen riesgo (desbordar o
  // dejar sin agua), así que autorizar cualquiera exige una medida actual.
  if (ctx.ultrasonicoEnError)
    return "HC-SR04 en error: la bomba la gobierna el fail-safe";
  if (autorizar && !ctx.aguaActual)
    return "Sin medida actual del HC-SR04 (la ultima es sostenida): no se autoriza";

  bool aguaConocida = autorizar ? ctx.aguaActual : ctx.aguaValida;
  if (aguaConocida && encender && ctx.distanciaAgua <= NIVEL_BOMBA_OFF)
    return "Tanque lleno: la bomba no se puede encender";
  if (aguaConocida && !encender && ctx.distanciaAgua > NIVEL_BOMBA_ON)
    return "Nivel de agua bajo: la bomba no se puede apagar";
  return nullptr;
}

#endif  // REGLAS_CONTROL_REMOTO_H
