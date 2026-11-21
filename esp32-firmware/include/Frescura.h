#pragma once

#include <cstdint>

// Cálculos de tiempo sin dependencias de Arduino, para poder probarlos en el PC
// (pio test -e native). Operan con la aritmética sin signo de 32 bits de millis():
// la resta sigue siendo correcta cuando el contador se desborda (cada ~49,7 días).
namespace frescura
{
  inline uint32_t transcurridoMs(uint32_t ahoraMs, uint32_t desdeMs)
  {
    return ahoraMs - desdeMs;
  }

  // El DHT22 no admite lecturas físicas a menos de intervaloMinMs entre sí.
  inline bool tocaLecturaFisica(uint32_t ahoraMs, uint32_t ultimaFisicaMs,
                                bool hayLecturaPrevia, uint32_t intervaloMinMs)
  {
    return !hayLecturaPrevia || transcurridoMs(ahoraMs, ultimaFisicaMs) >= intervaloMinMs;
  }

  // Una lectura es nueva si se capturó dentro del ciclo que generó el snapshot
  // [inicioCicloMs, publicadoMs]. Una arrastrada de un ciclo anterior es previa a
  // inicioCicloMs: su resta da la vuelta y queda fuera de la ventana. No depende de
  // cuánto tarden el ciclo ni la planificación de tareas.
  inline bool capturadaEnCiclo(uint32_t capturaMs, uint32_t inicioCicloMs, uint32_t publicadoMs)
  {
    return transcurridoMs(capturaMs, inicioCicloMs) <= transcurridoMs(publicadoMs, inicioCicloMs);
  }

  // ahoraMs debe tomarse después de leer el snapshot: así nunca es anterior a publicadoMs.
  inline bool snapshotVigente(uint32_t ahoraMs, uint32_t publicadoMs, uint32_t maxAntiguedadMs)
  {
    return transcurridoMs(ahoraMs, publicadoMs) <= maxAntiguedadMs;
  }

  inline bool esSnapshotNuevo(uint32_t secuencia, bool hayEnvioPrevio, uint32_t ultimaSecuenciaEnviada)
  {
    return !hayEnvioPrevio || secuencia != ultimaSecuenciaEnviada;
  }
}
