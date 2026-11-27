// Cuando dos pedidos pueden escribir el mismo estado y resolver fuera de
// orden (una carga inicial más lenta que un cálculo posterior), sin esto
// gana quien responde último, no quien se pidió último. `iniciar()` marca
// un pedido como el más reciente; `esVigente(id)` dice si sigue siéndolo
// cuando su respuesta llega -- si no, se descarta en vez de aplicarse.
export function crearGuardaDeSecuencia() {
  let ultimoId = 0
  return {
    iniciar(): number {
      ultimoId += 1
      return ultimoId
    },
    esVigente(id: number): boolean {
      return id === ultimoId
    },
  }
}
