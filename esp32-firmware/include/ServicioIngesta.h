#ifndef SERVICIO_INGESTA_H
#define SERVICIO_INGESTA_H

#include <Arduino.h>
#include "config.h"

class ServicioIngesta
{
public:
  ServicioIngesta();

  void actualizar();

private:
  unsigned long ultimoEnvio_;

  bool enviarHttp(const String &payload);
  String construirPayload(const SnapshotTelemetria &snapshot, const String &idLote) const;
  static String generarUUID();
};

#endif
