#ifndef SENSOR_DHT_H
#define SENSOR_DHT_H

#include <Arduino.h>
// DHTesp y no la librería de Adafruit: Adafruit lee los 80 pulsos con las
// interrupciones apagadas y solo revisa el timeout al final, así que un
// sensor que se cuelga a mitad de trama bloquea la CPU varios segundos y
// el Interrupt WDT reinicia el ESP32. DHTesp aborta en el primer timeout.
#include "DHTesp.h"
#include "config.h"

/**
 * @class SensorDHT
 * @brief Gestor de lectura del sensor DHT22 (temperatura y humedad).
 * 
 * Implementa lectura asíncrona y no bloqueante. Contador de fallos
 * con fail-safe: después de MAX_FALLOS_SENSOR intentos fallidos,
 * reporta estado de error.
 */
class SensorDHT {
 public:
  /**
   * @brief Constructor. Inicializa el objeto DHT.
   */
  SensorDHT();

  /**
   * @brief Inicializa el sensor (llamar en setup()).
   */
  void begin();

  /**
   * @brief Realiza lectura no bloqueante (llamar cada INTERVALO_SENSORES ms).
   * @return Estructura LecturaDHT con datos y validez
   */
  LecturaDHT leer();

  /**
   * @brief Obtiene la última lectura válida.
   * @return Estructura LecturaDHT
   */
  LecturaDHT getUltimaLectura() const;

  /**
   * @brief Indica si el sensor está en estado de error.
   * @return true si ha superado MAX_FALLOS_SENSOR fallos consecutivos
   */
  bool enError() const;

  /**
   * @brief Reinicia el contador de fallos.
   */
  void reiniciarFallos();

  /**
   * @brief Fuerza reinicio de la lectura (útil después de error).
   */
  void reset();

 private:
  DHTesp dht_;
  LecturaDHT ultimaLectura_;
  int contadorFallos_;
  unsigned long ultimoIntento_;
};

#endif // SENSOR_DHT_H
