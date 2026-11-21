#ifndef SENSOR_MQ135_H
#define SENSOR_MQ135_H

#include <Arduino.h>
#include "config.h"
#include "MovingAverage.h"

// Un MQ-135 conectado y caliente nunca da un ADC de casi 0 en el aire del
// galpón: eso es el pin sin sensor (o el sensor sin alimentación). Por debajo
// de este valor la lectura se da por inválida y no se envía.
#ifndef MQ135_ADC_MIN_CONECTADO
#define MQ135_ADC_MIN_CONECTADO 20
#endif
// Lecturas seguidas por debajo del mínimo antes de avisar en el monitor serie
// que el sensor está desconectado (a INTERVALO_SENSORES = 2 s, unos 10 s).
#ifndef MQ135_LECTURAS_DESCONECTADO
#define MQ135_LECTURAS_DESCONECTADO 5
#endif

/**
 * @class SensorMQ135
 * @brief Gestor del sensor MQ135 (NH3/CO2) con filtro de media móvil.
 * 
 * Realiza lectura analógica del MQ135 y aplica un filtro de media móvil
 * con buffer circular de MOVING_AVG_SIZE muestras para suavizar ruido.
 */
class SensorMQ135 {
 public:
  /**
   * @brief Constructor. Inicializa filtro de media móvil.
   */
  SensorMQ135();

  /**
   * @brief Inicializa el sensor (configurar pin ADC).
   */
  void begin();

  /**
   * @brief Realiza lectura no bloqueante y aplica filtro.
   * @return Estructura LecturaMQ135 con raw value, voltaje y validez
   */
  LecturaMQ135 leer();

  /**
   * @brief Obtiene la última lectura filtrada.
   * @return Estructura LecturaMQ135
   */
  LecturaMQ135 getUltimaLectura() const;

  /**
   * @brief Obtiene clasificación de nivel de gas.
   * @return "NORMAL", "MODERADO" o "ALTO"
   */
  String getNivelGas() const;

  /**
   * @brief Reinicia el filtro de media móvil.
   */
  void reset();

  /**
   * @brief true si lleva MQ135_LECTURAS_DESCONECTADO lecturas seguidas en ~0.
   */
  bool desconectado() const;

 private:
  MovingAverage<int, MOVING_AVG_SIZE> filtroRaw_;
  LecturaMQ135 ultimaLectura_;
  unsigned long ultimoIntento_;
  uint8_t lecturasEnCero_;

  String clasificarNivel(int rawValue) const;
};

#endif // SENSOR_MQ135_H
