#ifndef SERVICIO_INGESTA_H
#define SERVICIO_INGESTA_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include "Configuracion.h"

// Envía las lecturas vigentes al backend (POST /ingest) cada INTERVALO_ENVIO_MS.
// Hace llamadas HTTP bloqueantes con reintentos: debe ejecutarse en su propia
// tarea (tareaIngesta), nunca en tareaRed, para no frenar el lazo MQTT.
class ServicioIngesta
{
public:
  ServicioIngesta();

  void actualizar();

private:
  enum class ResultadoEnvio : uint8_t
  {
    OK,        // El backend registró todas las lecturas
    REINTENTAR, // Fallo transitorio: red, 5xx, respuesta inesperada
    ABANDONAR  // Reintentar no lo arregla: token inválido, DTO rechazado, códigos ignorados
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
