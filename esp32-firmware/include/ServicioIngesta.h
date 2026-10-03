#ifndef SERVICIO_INGESTA_H
#define SERVICIO_INGESTA_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include "Configuracion.h"

class ServicioIngesta
{
public:
  ServicioIngesta();

  void actualizar();

private:
  enum class ResultadoEnvio : uint8_t
  {
    OK,
    REINTENTAR,
    ABANDONAR
  };

  unsigned long ultimoEnvio_;
  bool ntpIniciado_;
  String url_;

  ResultadoEnvio enviarHttp(const String &payload, const String &idLote, size_t enviadas);
  size_t construirPayload(const SnapshotTelemetria &snapshot, const String &idLote, String &payload) const;
  static void agregarLectura(JsonArray &lecturas, const char *codigo, float valor);
  static bool fechaCaptura(unsigned long capturaMs, char *buffer, size_t tamano);
  static String generarUUID();
};

#endif
