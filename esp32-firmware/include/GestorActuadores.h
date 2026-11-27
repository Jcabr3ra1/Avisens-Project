#ifndef GESTOR_ACTUADORES_H
#define GESTOR_ACTUADORES_H

#include <Arduino.h>
#include "config.h"
#include "Actuador.h"

// Gestor centralizado de los 4 relés del sistema (K1 calefacción, K2
// ventilador, K3 extractor, K4 bomba de agua de llenado). Implementa la
// lógica de control por umbrales y los tres niveles de fail-safe (local de
// clima, local de agua, global). Documentación completa, con el porqué de
// cada decisión: docs/03_control_pid_actuadores.md.
//
// Implementación repartida en dos archivos:
// - src/GestorActuadores.cpp: clima, agua, fail-safe.
// - src/GestorActuadoresManual.cpp: control remoto/modo MANUAL, traducción
//   de nombres de relé, forzarRele().
class GestorActuadores {
 public:
  GestorActuadores();

  // Inicializa los 4 relés como salidas, en estado seguro (desactivados).
  void begin();

  // Clima (K1-K3) según DHT22 + MQ135. Independiente de actualizarAgua():
  // un fallo del DHT nunca afecta a K4. Si enErrorDHT es persistente,
  // delega en el fail-safe LOCAL de clima. Ver docs §5.2.
  void actualizarClima(
    float temperatura,
    float humedad,
    int rawNH3,
    bool lecturaValida,
    bool enErrorDHT
  );

  // Bomba de agua (K4) según el sensor ultrasónico. Independiente de
  // actualizarClima(): un fallo del ultrasónico nunca afecta a K1-K3. Si
  // enErrorUltrasonico es persistente, delega en el fail-safe LOCAL de
  // agua (K4 OFF -- bomba de llenado, ver docs §5.2).
  void actualizarAgua(
    float distanciaAgua,
    EstadoSensorUltrasonico estadoSensorUltrasonico,
    bool enErrorUltrasonico
  );

  // Fail-safe GLOBAL: K1-K3 OFF, K4 ON. Lo dispara la FSM global al entrar
  // en ERROR (ver main.cpp) -- no confundir con los fail-safe LOCALES
  // internos (failSafeClima/failSafeAgua). Ver docs §5.2 sobre la relación
  // entre ambos y una tensión de política todavía sin resolver.
  void failSafe();

  // Estado de cada relé (para depuración/monitoreo).
  bool getK1() const { return k1_.getEstado(); }
  bool getK2() const { return k2_.getEstado(); }
  bool getK3() const { return k3_.getEstado(); }
  bool getK4() const { return k4_.getEstado(); }

  // Fuerza el estado de un relé (1-4) sin pasar por modo MANUAL/AUTO; solo
  // para depuración. Ver docs §3.4.
  void forzarRele(uint8_t rele, bool estado);

  // ─── Control remoto / modo MANUAL (comandos desde la app web) ────

  // Pone el relé (1-4, ver releDesdeNombre) en modo MANUAL con el estado
  // indicado: queda congelado ahí hasta establecerAutomatico(). Ver
  // docs §3.4.
  void establecerManual(uint8_t rele, bool estado);

  // Devuelve el relé (1-4) al control de la lógica automática.
  void establecerAutomatico(uint8_t rele);

  // true si el relé (1-4) está en modo MANUAL.
  bool esManual(uint8_t rele) const;

  // Estado actual del relé (1-4); false también si el número es inválido.
  bool getEstado(uint8_t rele) const;

  // Nombre lógico del actuador -> número de relé interno (1-4), o 0 si no
  // se reconoce. Ver docs §3.5 sobre el origen y el estado real de este
  // contrato de nombres.
  static uint8_t releDesdeNombre(const String& nombre);

  // Número de relé (1-4) -> nombre lógico canónico (inverso de
  // releDesdeNombre).
  static String nombreDesdeRele(uint8_t rele);

 private:
  Actuador k1_;  // Calefacción
  Actuador k2_;  // Ventilador
  Actuador k3_;  // Extractor
  Actuador k4_;  // Bomba

  bool ultimoEstadoBomba_;
  unsigned long ultimoControl_;

  // Modo MANUAL por relé: true = bajo control remoto (app), false = AUTO
  bool manualK1_ = false;
  bool manualK2_ = false;
  bool manualK3_ = false;
  bool manualK4_ = false;

  // Métodos de lógica interna
  void aplicarControlClima(
    bool activarCalefaccion,
    bool activarVentilacion
  );

  bool calcularActivacionBomba(
    float distancia,
    EstadoSensorUltrasonico estado
  );

  // Fail-safe LOCAL de clima: apaga K1/K2/K3. No toca K4. Llamado desde
  // actualizarClima() cuando enErrorDHT es true.
  void failSafeClima();

  // Fail-safe LOCAL de agua: apaga K4. No toca K1/K2/K3. Llamado desde
  // actualizarAgua() cuando enErrorUltrasonico es true.
  void failSafeAgua();
};

#endif // GESTOR_ACTUADORES_H
