#include "GestorActuadores.h"

void GestorActuadores::establecerManual(uint8_t rele, bool estado)
{
  switch (rele)
  {
  case 1:
    manualK1_ = true;
    k1_.setEstado(estado);
    break;
  case 2:
    manualK2_ = true;
    k2_.setEstado(estado);
    break;
  case 3:
    manualK3_ = true;
    k3_.setEstado(estado);
    break;
  case 4:
    manualK4_ = true;
    k4_.setEstado(estado);
    break;
  default:
    LOG_WARN("establecerManual: número de relé inválido: " + String(rele));
    return;
  }
  LOG_WARN("Relé " + String(rele) + " -> MANUAL " + (estado ? "ON" : "OFF"));
}

void GestorActuadores::establecerAutomatico(uint8_t rele)
{
  switch (rele)
  {
  case 1:
    manualK1_ = false;
    break;
  case 2:
    manualK2_ = false;
    break;
  case 3:
    manualK3_ = false;
    break;
  case 4:
    manualK4_ = false;
    break;
  default:
    LOG_WARN("establecerAutomatico: número de relé inválido: " + String(rele));
    return;
  }
  LOG_DEBUG("Relé " + String(rele) + " devuelto a modo AUTOMÁTICO");
}

bool GestorActuadores::esManual(uint8_t rele) const
{
  switch (rele)
  {
  case 1:
    return manualK1_;
  case 2:
    return manualK2_;
  case 3:
    return manualK3_;
  case 4:
    return manualK4_;
  default:
    return false;
  }
}

bool GestorActuadores::getEstado(uint8_t rele) const
{
  switch (rele)
  {
  case 1:
    return k1_.getEstado();
  case 2:
    return k2_.getEstado();
  case 3:
    return k3_.getEstado();
  case 4:
    return k4_.getEstado();
  default:
    return false;
  }
}

uint8_t GestorActuadores::releDesdeNombre(const String &nombre)
{
  String n = nombre;
  n.toLowerCase();

  if (n == "calefactor" || n == "k1")
    return 1;
  if (n == "ventilador" || n == "humidificador" || n == "k2")
    return 2;
  if (n == "extractor" || n == "k3")
    return 3;
  if (n == "bomba" || n == "k4")
    return 4;

  return 0; // No reconocido
}

String GestorActuadores::nombreDesdeRele(uint8_t rele)
{
  switch (rele)
  {
  case 1:
    return "calefactor";
  case 2:
    return "ventilador";
  case 3:
    return "extractor";
  case 4:
    return "bomba";
  default:
    return "desconocido";
  }
}

void GestorActuadores::forzarRele(uint8_t rele, bool estado)
{
  switch (rele)
  {
  case 1:
    k1_.setEstado(estado);
    break;
  case 2:
    k2_.setEstado(estado);
    break;
  case 3:
    k3_.setEstado(estado);
    break;
  case 4:
    k4_.setEstado(estado);
    break;
  default:
    LOG_WARN("Relé inválido");
  }
}
