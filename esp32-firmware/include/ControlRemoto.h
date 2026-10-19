#ifndef CONTROL_REMOTO_H
#define CONTROL_REMOTO_H

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include "config.h"
#include "GestorActuadores.h"
#include "ReglasControlRemoto.h"

// Órdenes remotas (web/móvil) sobre los relés K1-K4.
//
// Llegan en la respuesta de POST /ingest, en tareaWiFi (Core 1), y se aplican
// en tareaGalpon (Core 0), única dueña de gestorActuadores. Entre ambas solo
// hay colas FreeRTOS y un snapshot protegido por mux, como en el resto del
// firmware.
//
// La regla de oro se mantiene: decide el ESP32. Una orden manual nunca salta
// las restricciones de la lógica automática. Si al llegar las viola, se
// rechaza; si después aparecen (sensor en error, calor, gases, tanque lleno,
// agua baja, sin contacto con el backend), el relé vuelve solo a AUTOMÁTICO y
// se informa como "revertida".

// Sin una respuesta válida de /ingest durante este tiempo, los relés en
// manual remoto vuelven a AUTOMÁTICO: sin WiFi nadie puede corregir una
// orden desde la web, y el galpón tiene que seguir protegido solo. Se puede
// redefinir en config.h.
#ifndef MANUAL_REMOTO_SIN_CONTACTO_MS
#define MANUAL_REMOTO_SIN_CONTACTO_MS 60000UL
#endif

enum class AccionRemota : uint8_t { ENCENDER, APAGAR, AUTOMATICO };
enum class ResultadoRemoto : uint8_t { APLICADA, RECHAZADA, REVERTIDA };
// Quién gobierna el relé ahora mismo.
enum class ModoRele : uint8_t { AUTOMATICO, MANUAL_REMOTO, MANUAL_LOCAL };

// Orden tal como viene en el JSON de /ingest, antes de traducirla a un relé.
struct OrdenRecibida {
  uint32_t id;
  char codigo[32];
  char accion[16];
};

struct ResultadoOrdenRemota {
  uint32_t id;
  ResultadoRemoto resultado;
  bool estadoRele;
  char motivo[72];  // texto fijo del firmware, sin comillas (va al JSON tal cual)
};

// Lo que hay en cada relé al cerrar el último ciclo de sensores: modo, salida
// ordenada al pin y, en manual remoto, la orden que lo sostiene. Se informa en
// cada /ingest para que la web muestre el estado actual y no el histórico.
struct EstadoReles {
  bool valido;  // false hasta el primer ciclo de tareaGalpon
  ModoRele modo[4];
  bool encendido[4];
  uint32_t orden[4];  // 0 si no está en manual remoto
};

// ContextoProtecciones y las reglas viven en ReglasControlRemoto.h.

class ControlRemoto {
 public:
  explicit ControlRemoto(GestorActuadores &gestor);

  // Crea las colas. false si no hubo memoria: el control remoto queda
  // deshabilitado y el galpón sigue en automático.
  bool begin();

  // ─── Core 1 (tareaWiFi) ────────────────────────────────────────────
  // Traduce y encola una orden para tareaGalpon. Ignora las ya recibidas:
  // el backend repite las órdenes hasta que llega su confirmación.
  void recibirOrden(const OrdenRecibida &orden);
  // Saca hasta `max` resultados listos para informar al backend.
  uint8_t tomarResultados(ResultadoOrdenRemota *destino, uint8_t max);
  // Leer DESPUÉS de tomarResultados(): cerrarCiclo() actualiza este estado
  // antes de publicar los resultados, así lo que se informa en un mismo
  // envío nunca se contradice.
  EstadoReles leerEstadoReles();
  // Hubo una respuesta válida de /ingest: el backend está al alcance.
  void registrarContactoBackend();

  // ─── Core 0 (tareaGalpon), en este orden en cada ciclo de sensores ──
  // Devuelve a AUTOMÁTICO los relés cuya orden manual dejó de ser segura.
  void vigilar(const ContextoProtecciones &ctx);
  // Aplica (o rechaza) las órdenes encoladas.
  void procesarOrdenes(const ContextoProtecciones &ctx);
  // Después de la lógica automática: publica el estado de los relés y los
  // resultados del ciclo con la salida que de verdad quedó. Un relé que
  // vuelve a AUTOMÁTICO recibe su decisión automática antes de informarse.
  void cerrarCiclo();

 private:
  struct OrdenRemota {
    uint32_t id;
    uint8_t rele;  // 1-4
    AccionRemota accion;
  };

  // Resultado decidido en el ciclo, publicado en cerrarCiclo().
  struct ResultadoPorPublicar {
    uint32_t id;
    uint8_t rele;
    ResultadoRemoto resultado;
    const char *motivo;  // siempre un literal del firmware
  };

  GestorActuadores &gestor_;
  QueueHandle_t colaOrdenes_ = nullptr;
  QueueHandle_t colaResultados_ = nullptr;

  // Solo Core 0: qué orden dejó cada relé en manual remoto (0 = ninguna).
  uint32_t ordenManual_[4] = {0, 0, 0, 0};
  // Solo Core 0. Cabe todo lo de un ciclo: la cola de órdenes (8) más una
  // reversión por relé (4).
  static const uint8_t MAX_POR_PUBLICAR = 12;
  ResultadoPorPublicar porPublicar_[MAX_POR_PUBLICAR];
  uint8_t cantidadPorPublicar_ = 0;

  // Compartidos entre núcleos, protegidos por mux_.
  portMUX_TYPE mux_ = portMUX_INITIALIZER_UNLOCKED;
  EstadoReles estadoReles_ = {};
  unsigned long ultimoContactoMs_ = 0;

  // Solo Core 1: ids recientes, para no aplicar dos veces la misma orden.
  static const uint8_t RECIENTES = 16;
  uint32_t recientes_[RECIENTES] = {};
  uint8_t posReciente_ = 0;

  bool yaRecibida(uint32_t id) const;
  void recordar(uint32_t id);
  void anotarResultado(uint32_t id, uint8_t rele, ResultadoRemoto resultado,
                       const char *motivo);
  void publicarResultado(uint32_t id, ResultadoRemoto resultado,
                         bool estadoRele, const char *motivo);
  bool hayContactoBackend();

  static uint8_t releDesdeCodigo(const char *codigo);
};

#endif  // CONTROL_REMOTO_H
