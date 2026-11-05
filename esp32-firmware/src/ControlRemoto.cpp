#include "ControlRemoto.h"

namespace {
// Holgura de las colas: el backend entrega como mucho 10 órdenes por
// respuesta, y los resultados se drenan cada INTERVALO_ENVIO_MS.
const UBaseType_t TAM_COLA_ORDENES = 8;
const UBaseType_t TAM_COLA_RESULTADOS = 12;

const char *const MOTIVO_MANUAL_LOCAL = "Rele en manual local (serial): la web no lo cambia";
}  // namespace

ControlRemoto::ControlRemoto(GestorActuadores &gestor) : gestor_(gestor) {}

bool ControlRemoto::begin()
{
  colaOrdenes_ = xQueueCreate(TAM_COLA_ORDENES, sizeof(OrdenRemota));
  colaResultados_ = xQueueCreate(TAM_COLA_RESULTADOS, sizeof(ResultadoOrdenRemota));
  if (colaOrdenes_ == nullptr || colaResultados_ == nullptr)
  {
    LOG_ERROR("ControlRemoto: sin memoria para las colas -- control remoto deshabilitado");
    return false;
  }
  return true;
}

// ─── Core 1 ─────────────────────────────────────────────────────────────

void ControlRemoto::recibirOrden(const OrdenRecibida &orden)
{
  if (colaOrdenes_ == nullptr || yaRecibida(orden.id))
    return;

  uint8_t rele = releDesdeCanal(orden.canal);
  if (rele == 0)
  {
    recordar(orden.id);
    publicarResultado(orden.id, ResultadoRemoto::RECHAZADA, false,
                      orden.canal[0] == '\0'
                          ? "Orden sin canal K1-K4: registra los reles por canal en la web"
                          : "El canal no corresponde a un rele K1-K4 de este ESP32");
    return;
  }

  OrdenRemota remota = {orden.id, rele, AccionRemota::AUTOMATICO};
  if (strcmp(orden.accion, "encender") == 0)
    remota.accion = AccionRemota::ENCENDER;
  else if (strcmp(orden.accion, "apagar") == 0)
    remota.accion = AccionRemota::APAGAR;
  else if (strcmp(orden.accion, "automatico") != 0)
  {
    recordar(orden.id);
    // Core 1 no toca gestorActuadores: la salida sale del último snapshot.
    publicarResultado(orden.id, ResultadoRemoto::RECHAZADA,
                      leerEstadoReles().encendido[rele - 1],
                      "Accion desconocida para el firmware");
    return;
  }

  // Solo se recuerda si entró en la cola: si estaba llena, el backend la
  // repite en el próximo ciclo y se vuelve a intentar.
  if (xQueueSend(colaOrdenes_, &remota, 0) == pdTRUE)
    recordar(orden.id);
  else
    LOG_WARN("ControlRemoto: cola de ordenes llena, se reintenta en el proximo ciclo");
}

uint8_t ControlRemoto::tomarResultados(ResultadoOrdenRemota *destino, uint8_t max)
{
  if (colaResultados_ == nullptr)
    return 0;
  uint8_t n = 0;
  while (n < max && xQueueReceive(colaResultados_, &destino[n], 0) == pdTRUE)
    n++;
  return n;
}

EstadoReles ControlRemoto::leerEstadoReles()
{
  portENTER_CRITICAL(&mux_);
  EstadoReles copia = estadoReles_;
  portEXIT_CRITICAL(&mux_);
  return copia;
}

void ControlRemoto::registrarContactoBackend()
{
  portENTER_CRITICAL(&mux_);
  ultimoContactoMs_ = millis();
  portEXIT_CRITICAL(&mux_);
}

// ─── Core 0 ─────────────────────────────────────────────────────────────

void ControlRemoto::vigilar(const ContextoProtecciones &ctx)
{
  bool contacto = hayContactoBackend();
  for (uint8_t rele = 1; rele <= 4; rele++)
  {
    uint32_t id = ordenManual_[rele - 1];
    if (id == 0)
      continue;

    // Alguien lo devolvió a AUTO por serial: ya no es una orden remota. No
    // hace falta un resultado; el estado de relés del próximo envío lo
    // muestra y el backend revierte la orden.
    if (!gestor_.esManual(rele))
    {
      ordenManual_[rele - 1] = 0;
      continue;
    }

    // Sostener el manual vigente (encendido o apagado) con las reglas de
    // SOSTENER: un fallo puntual de un sensor no lo revierte, uno
    // persistente sí (ver ReglasControlRemoto.h).
    const char *motivo = contacto
                             ? motivoBloqueoRemoto(rele, gestor_.getEstado(rele), UsoRegla::SOSTENER, ctx)
                             : "Sin contacto con el backend: vuelve a automatico";
    if (motivo == nullptr)
      continue;

    gestor_.establecerAutomatico(rele);
    ordenManual_[rele - 1] = 0;
    // La salida se informa en cerrarCiclo(), después de que la lógica
    // automática decida: aquí todavía es la que dejó la orden manual.
    anotarResultado(id, rele, ResultadoRemoto::REVERTIDA, motivo);
    LOG_WARN("ControlRemoto: K" + String(rele) + " vuelve a AUTOMATICO -- " + motivo);
  }
}

void ControlRemoto::procesarOrdenes(const ContextoProtecciones &ctx)
{
  if (colaOrdenes_ == nullptr)
    return;

  OrdenRemota orden;
  while (xQueueReceive(colaOrdenes_, &orden, 0) == pdTRUE)
  {
    uint8_t i = orden.rele - 1;

    // Un relé tomado por un operador en el monitor serie no lo cambia la
    // web, ni siquiera para volver a automático: esa prueba manda.
    if (gestor_.esManual(orden.rele) && ordenManual_[i] == 0)
    {
      anotarResultado(orden.id, orden.rele, ResultadoRemoto::RECHAZADA, MOTIVO_MANUAL_LOCAL);
      continue;
    }

    if (orden.accion == AccionRemota::AUTOMATICO)
    {
      // Volver a automático siempre es seguro.
      gestor_.establecerAutomatico(orden.rele);
      ordenManual_[i] = 0;
      anotarResultado(orden.id, orden.rele, ResultadoRemoto::APLICADA, "");
      continue;
    }

    // Una orden nueva solo se autoriza con muestras de este ciclo.
    const char *motivo = motivoBloqueoRemoto(orden.rele, orden.accion == AccionRemota::ENCENDER,
                                             UsoRegla::AUTORIZAR, ctx);
    if (motivo != nullptr)
    {
      anotarResultado(orden.id, orden.rele, ResultadoRemoto::RECHAZADA, motivo);
      continue;
    }

    gestor_.establecerManual(orden.rele, orden.accion == AccionRemota::ENCENDER);
    ordenManual_[i] = orden.id;
    anotarResultado(orden.id, orden.rele, ResultadoRemoto::APLICADA, "");
  }
}

void ControlRemoto::cerrarCiclo()
{
  EstadoReles estado = {};
  estado.valido = true;
  for (uint8_t rele = 1; rele <= 4; rele++)
  {
    uint8_t i = rele - 1;
    estado.encendido[i] = gestor_.getEstado(rele);
    estado.orden[i] = ordenManual_[i];
    if (ordenManual_[i] != 0)
      estado.modo[i] = ModoRele::MANUAL_REMOTO;
    else if (gestor_.esManual(rele))
      estado.modo[i] = ModoRele::MANUAL_LOCAL;
    else
      estado.modo[i] = ModoRele::AUTOMATICO;
  }

  // Primero el estado, después los resultados (ver leerEstadoReles en el .h).
  portENTER_CRITICAL(&mux_);
  estadoReles_ = estado;
  portEXIT_CRITICAL(&mux_);

  for (uint8_t n = 0; n < cantidadPorPublicar_; n++)
  {
    const ResultadoPorPublicar &r = porPublicar_[n];
    publicarResultado(r.id, r.resultado, gestor_.getEstado(r.rele), r.motivo);
  }
  cantidadPorPublicar_ = 0;
}

// ─── Auxiliares ─────────────────────────────────────────────────────────

uint8_t ControlRemoto::releDesdeCanal(const char *canal)
{
  // Los mismos canales con los que se reportan los relés en /ingest. El
  // backend solo entrega a este ESP32 órdenes de relés registrados en él.
  for (uint8_t i = 0; i < 4; i++)
  {
    if (strcmp(canal, canalDeRele(i)) == 0)
      return i + 1;
  }
  return 0;
}

bool ControlRemoto::yaRecibida(uint32_t id) const
{
  for (uint8_t i = 0; i < RECIENTES; i++)
  {
    if (recientes_[i] == id)
      return true;
  }
  return false;
}

void ControlRemoto::recordar(uint32_t id)
{
  recientes_[posReciente_] = id;
  posReciente_ = (posReciente_ + 1) % RECIENTES;
}

void ControlRemoto::anotarResultado(uint32_t id, uint8_t rele, ResultadoRemoto resultado,
                                    const char *motivo)
{
  if (cantidadPorPublicar_ >= MAX_POR_PUBLICAR)
  {
    // No debería pasar (ver MAX_POR_PUBLICAR). Si pasa, el estado de relés
    // del envío sigue diciendo la verdad y el backend reconcilia con él.
    LOG_WARN("ControlRemoto: sin espacio para el resultado de la orden " + String(id));
    return;
  }
  porPublicar_[cantidadPorPublicar_++] = {id, rele, resultado, motivo};
}

void ControlRemoto::publicarResultado(uint32_t id, ResultadoRemoto resultado,
                                      bool estadoRele, const char *motivo)
{
  ResultadoOrdenRemota r = {id, resultado, estadoRele, {0}};
  strncpy(r.motivo, motivo, sizeof(r.motivo) - 1);
  // Si la cola está llena se pierde el resultado, pero no el estado: el
  // estado de relés viaja en cada envío con la orden que sostiene el manual,
  // y con eso el backend da la orden por aplicada (o revertida) igual.
  if (xQueueSend(colaResultados_, &r, 0) != pdTRUE)
    LOG_WARN("ControlRemoto: cola de resultados llena, se pierde el de la orden " + String(id));
}

bool ControlRemoto::hayContactoBackend()
{
  portENTER_CRITICAL(&mux_);
  unsigned long ultimo = ultimoContactoMs_;
  portEXIT_CRITICAL(&mux_);
  return ultimo != 0 && millis() - ultimo <= MANUAL_REMOTO_SIN_CONTACTO_MS;
}
