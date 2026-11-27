#include "Actuador.h"

Actuador::Actuador(uint8_t pin)
    : pin_(pin),
      estado_(false) {
}

void Actuador::begin() {
  digitalWrite(pin_, HIGH);  // Estado seguro (relé activo en LOW) ANTES de fijar OUTPUT
  pinMode(pin_, OUTPUT);
  estado_ = false;
}

void Actuador::activar() {
  digitalWrite(pin_, LOW);  // Relé activo con LOW
  estado_ = true;
}

void Actuador::desactivar() {
  digitalWrite(pin_, HIGH);  // Relé inactivo con HIGH
  estado_ = false;
}

void Actuador::setEstado(bool estado) {
  if (estado) {
    activar();
  } else {
    desactivar();
  }
}

bool Actuador::getEstado() const {
  return estado_;
}

void Actuador::conmutar() {
  setEstado(!estado_);
}
