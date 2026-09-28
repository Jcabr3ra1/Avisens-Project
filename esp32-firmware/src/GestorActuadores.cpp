#include "GestorActuadores.h"

GestorActuadores::GestorActuadores()
    : k1_(K1_PIN),
      k2_(K2_PIN),
      k3_(K3_PIN),
      k4_(K4_PIN),
      ultimoEstadoBomba_(false),
      ultimoControl_(0)
{
}

void GestorActuadores::begin()
{
  k1_.begin();
  k2_.begin();
  k3_.begin();
  k4_.begin();
  LOG_DEBUG("GestorActuadores inicializado");
}

void GestorActuadores::actualizarClima(
    float temperatura,
    float humedad,
    int rawNH3,
    bool lecturaValida,
    bool enErrorDHT)
{

  if (enErrorDHT)
  {
    failSafeClima();
    return;
  }

  // Fallo puntual (aun no persistente): no se recalcula con un dato
  // fabricado -- los reles quedan en la ultima decision con dato real.
  if (!lecturaValida)
  {
    return;
  }

  // ─── Lógica de control con umbrales ───────────────────

  // Detectar si hay gases altos
  bool gasesAltos = (rawNH3 >= NH3_ALTO);

  // Calefacción: Activar si NO hay gases altos Y temperatura < TEMP_FRIO
  bool activarCalefaccion = !gasesAltos && (temperatura < TEMP_FRIO);

  // Ventilación (Ventilador + Extractor):
  bool activarVentilacion = !activarCalefaccion &&
                            (temperatura >= TEMP_CALOR ||
                             humedad > HUM_EXTRACTORES ||
                             gasesAltos);

  // ─── Aplicar estados ──────────────────────────────────
  aplicarControlClima(activarCalefaccion, activarVentilacion);

  // ─── Log de monitoreo ──────────────────────────────────
  Serial.println("\n--- CLIMA ---");
  Serial.print("Temp: ");
  Serial.print(temperatura, 1);
  Serial.print("°C | Hum: ");
  Serial.print(humedad, 1);
  Serial.println("%");
  Serial.print("NH3: ");
  Serial.print(rawNH3);
  Serial.print(" [");
  if (rawNH3 < NH3_MODERADO)
    Serial.print("NORMAL");
  else if (rawNH3 < NH3_ALTO)
    Serial.print("MODERADO");
  else
    Serial.print("ALTO");
  Serial.println("]");
  Serial.print("K1 (Calef): ");
  Serial.println(k1_.getEstado() ? "ON" : "off");
  Serial.print("K2 (Ventil): ");
  Serial.println(k2_.getEstado() ? "ON" : "off");
  Serial.print("K3 (Extract): ");
  Serial.println(k3_.getEstado() ? "ON" : "off");
}

void GestorActuadores::actualizarAgua(
    float distanciaAgua,
    EstadoSensorUltrasonico estadoSensorUltrasonico,
    bool enErrorUltrasonico)
{

  if (enErrorUltrasonico)
  {
    LOG_WARN("Ultrasonico en error — Fail-Safe local de agua: K4 OFF");
    failSafeAgua();
    return;
  }

  // Bomba: Uso de histéresis (ON si dist > NIVEL_BOMBA_ON, OFF si dist <= NIVEL_BOMBA_OFF)
  bool activarBomba = calcularActivacionBomba(distanciaAgua, estadoSensorUltrasonico);
  if (!manualK4_)
  {
    if (activarBomba)
    {
      k4_.activar();
    }
    else
    {
      k4_.desactivar();
    }
  }

  Serial.print("Agua: ");
  if (estadoSensorUltrasonico == EstadoSensorUltrasonico::OK)
  {
    Serial.print(distanciaAgua, 1);
    Serial.println(" cm");
  }
  else
  {
    Serial.println("ERROR/TIMEOUT");
  }
  Serial.print("K4 (Bomba): ");
  Serial.println(k4_.getEstado() ? "ON" : "off");
}

void GestorActuadores::failSafe()
{

  k1_.desactivar();
  k2_.desactivar();
  k3_.desactivar();
  k4_.activar(); // Bomba ON: mantiene el suministro/llenado de agua

  LOG_ERROR("FAIL-SAFE ACTIVADO — Bomba forzada ON");
}

void GestorActuadores::failSafeClima()
{
  if (!manualK1_)
    k1_.desactivar();
  if (!manualK2_)
    k2_.desactivar();
  if (!manualK3_)
    k3_.desactivar();
  LOG_ERROR("Clima en Fail-Safe (DHT en error persistente) — K1/K2/K3 OFF");
}

void GestorActuadores::failSafeAgua()
{

  if (!manualK4_)
    k4_.desactivar();
  LOG_ERROR("Agua en Fail-Safe (Ultrasónico en error persistente) — K4 OFF");
}

void GestorActuadores::aplicarControlClima(
    bool activarCalefaccion,
    bool activarVentilacion)
{

  // K1: Calefacción (solo si no hay ventilación) — omitido si está en MANUAL
  if (!manualK1_)
  {
    if (activarCalefaccion)
    {
      k1_.activar();
    }
    else
    {
      k1_.desactivar();
    }
  }

  // K2: Ventilador (complementa tanto calefacción como ventilación)
  if (!manualK2_)
  {
    if (activarCalefaccion || activarVentilacion)
    {
      k2_.activar();
    }
    else
    {
      k2_.desactivar();
    }
  }

  // K3: Extractor (solo si hay ventilación)
  if (!manualK3_)
  {
    if (activarVentilacion)
    {
      k3_.activar();
    }
    else
    {
      k3_.desactivar();
    }
  }
}

bool GestorActuadores::calcularActivacionBomba(
    float distancia,
    EstadoSensorUltrasonico estado)
{

  // Si hay error en el sensor, mantener último estado (conservador)
  if (estado != EstadoSensorUltrasonico::OK)
  {
    return ultimoEstadoBomba_;
  }

  // Histéresis: ON si dist > NIVEL_BOMBA_ON, OFF si dist <= NIVEL_BOMBA_OFF
  if (distancia > NIVEL_BOMBA_ON)
  {
    ultimoEstadoBomba_ = true;
  }
  else if (distancia <= NIVEL_BOMBA_OFF)
  {
    ultimoEstadoBomba_ = false;
  }
  // Si está entre los dos umbrales, mantener estado anterior

  return ultimoEstadoBomba_;
}
