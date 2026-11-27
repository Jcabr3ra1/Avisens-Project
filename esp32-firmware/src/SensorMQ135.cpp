#include "SensorMQ135.h"

SensorMQ135::SensorMQ135()
    : ultimoIntento_(0),
      lecturasEnCero_(0) {
  ultimaLectura_ = {0, 0.0f, false, 0};
}

void SensorMQ135::begin() {
  pinMode(MQ135_PIN, INPUT);
  LOG_DEBUG("SensorMQ135 inicializado");
}

LecturaMQ135 SensorMQ135::leer() {
  unsigned long ahora = millis();

  int rawValue = analogRead(MQ135_PIN);

  LecturaMQ135 lectura;
  lectura.timestamp = ahora;

  // ADC en ~0: no hay sensor en el pin. Se marca inválida para no enviar un
  // "amoníaco normal" que nadie midió, y el filtro se vacía para que al
  // reconectarlo el promedio no arrastre esos ceros.
  if (rawValue < MQ135_ADC_MIN_CONECTADO) {
    if (lecturasEnCero_ < 255) lecturasEnCero_++;
    if (lecturasEnCero_ == MQ135_LECTURAS_DESCONECTADO) {
      LOG_WARN("MQ135 desconectado (ADC en 0): no se envían sus lecturas");
    }
    filtroRaw_.reset();
    lectura.rawValue = 0;
    lectura.voltaje = 0.0f;
    lectura.valida = false;
    ultimaLectura_ = lectura;
    return lectura;
  }

  if (lecturasEnCero_ >= MQ135_LECTURAS_DESCONECTADO) {
    LOG_DEBUG("✓ MQ135 reconectado");
  }
  lecturasEnCero_ = 0;

  // Aplicar filtro de media móvil
  int rawFiltrado = filtroRaw_.add(rawValue);

  lectura.rawValue = rawFiltrado;
  lectura.voltaje = rawFiltrado * (3.3f / 4095.0f);
  lectura.valida = true;

  ultimaLectura_ = lectura;
  return lectura;
}

LecturaMQ135 SensorMQ135::getUltimaLectura() const {
  return ultimaLectura_;
}

String SensorMQ135::getNivelGas() const {
  return clasificarNivel(ultimaLectura_.rawValue);
}

bool SensorMQ135::desconectado() const {
  return lecturasEnCero_ >= MQ135_LECTURAS_DESCONECTADO;
}

void SensorMQ135::reset() {
  filtroRaw_.reset();
  ultimaLectura_ = {0, 0.0f, false, 0};
}

String SensorMQ135::clasificarNivel(int rawValue) const {
  if (rawValue < NH3_MODERADO) {
    return "NORMAL";
  } else if (rawValue < NH3_ALTO) {
    return "MODERADO";
  } else {
    return "ALTO";
  }
}
