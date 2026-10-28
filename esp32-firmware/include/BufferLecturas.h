#pragma once
#include <stddef.h>
#include <stdint.h>
#include <string.h>

// Cola circular de lecturas que no se pudieron enviar (sin internet o con el
// backend caído). Guarda solo las lecturas, nunca las órdenes ni el estado de
// los relés: esos datos caducan y no deben reenviarse tarde. Si se llena,
// descarta la más vieja para conservar lo reciente. Sin Arduino: se prueba en
// el computador con `pio test -e native`.
struct EntradaBufferLecturas
{
  char idLote[37];
  int64_t epoch;       // segundos UTC de la captura
  char lecturas[704];  // JSON de las lecturas, sin los corchetes del arreglo
};

template <size_t CAPACIDAD>
class BufferLecturas
{
public:
  // Devuelve true si tuvo que descartar la entrada más vieja para hacer sitio.
  // Una entrada que no cabe en `lecturas` se rechaza completa en vez de
  // guardarse cortada (un JSON cortado haría fallar todo el reenvío).
  bool agregar(const char *idLote, int64_t epoch, const char *lecturas, bool *guardada = nullptr)
  {
    if (guardada) *guardada = false;
    if (idLote == nullptr || lecturas == nullptr) return false;
    if (strlen(idLote) >= sizeof(EntradaBufferLecturas::idLote)) return false;
    if (strlen(lecturas) >= sizeof(EntradaBufferLecturas::lecturas)) return false;

    bool descarto = false;
    if (cantidad_ == CAPACIDAD)
    {
      inicio_ = (inicio_ + 1) % CAPACIDAD;
      cantidad_--;
      descarto = true;
    }
    EntradaBufferLecturas &e = datos_[(inicio_ + cantidad_) % CAPACIDAD];
    strcpy(e.idLote, idLote);
    e.epoch = epoch;
    strcpy(e.lecturas, lecturas);
    cantidad_++;
    if (guardada) *guardada = true;
    return descarto;
  }

  // La más vieja, sin quitarla: se quita solo cuando el backend confirma.
  const EntradaBufferLecturas *masVieja() const
  {
    return cantidad_ == 0 ? nullptr : &datos_[inicio_];
  }

  void quitarMasVieja()
  {
    if (cantidad_ == 0) return;
    inicio_ = (inicio_ + 1) % CAPACIDAD;
    cantidad_--;
  }

  size_t cantidad() const { return cantidad_; }
  bool vacio() const { return cantidad_ == 0; }
  static constexpr size_t capacidad() { return CAPACIDAD; }

private:
  EntradaBufferLecturas datos_[CAPACIDAD];
  size_t inicio_ = 0;
  size_t cantidad_ = 0;
};
