import { describe, expect, it } from 'vitest'
import { crearGuardaDeSecuencia } from './secuencia'

describe('crearGuardaDeSecuencia', () => {
  it('el primer pedido es vigente si nadie más pidió después', () => {
    const guarda = crearGuardaDeSecuencia()
    const id = guarda.iniciar()
    expect(guarda.esVigente(id)).toBe(true)
  })

  it('un pedido anterior deja de ser vigente cuando se inicia uno nuevo', () => {
    const guarda = crearGuardaDeSecuencia()
    const anterior = guarda.iniciar()
    const nuevo = guarda.iniciar()
    expect(guarda.esVigente(anterior)).toBe(false)
    expect(guarda.esVigente(nuevo)).toBe(true)
  })

  it('una respuesta tardía de un pedido viejo no debe aplicarse aunque llegue después', () => {
    // Simula justo el caso reportado: A (carga inicial) empieza primero,
    // B (cálculo disparado por el usuario) empieza después y su respuesta
    // llega primero. Cuando por fin llega la respuesta tardía de A, ya no
    // es vigente -- así se sabe que hay que descartarla.
    const guarda = crearGuardaDeSecuencia()
    const idA = guarda.iniciar()
    const idB = guarda.iniciar()
    expect(guarda.esVigente(idB)).toBe(true)
    expect(guarda.esVigente(idA)).toBe(false)
  })
})
