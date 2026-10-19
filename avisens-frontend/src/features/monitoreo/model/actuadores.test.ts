import { describe, expect, it } from 'vitest'
import {
  ESTADOS_FINALES,
  TEXTO_SIN_CONFIRMACION_FISICA,
  esReleControlable,
  estadoActualRele,
  fusionarOrdenes,
  ordenEnCurso,
  textoOrden,
  textoSalida,
} from './actuadores'
import type { EstadoRele, OrdenActuador } from '../api/ordenesActuadores'

function orden(parcial: Partial<OrdenActuador> = {}): OrdenActuador {
  return {
    id: 41,
    sensor_id: 12,
    dispositivo_id: 7,
    galpon_id: 3,
    accion: 'encender',
    estado: 'pendiente',
    estado_real: null,
    motivo: null,
    fecha_creacion: '2026-10-17T15:00:00.000Z',
    fecha_envio: null,
    fecha_resultado: null,
    actualizada_en: '2026-10-17T15:00:00.000Z',
    sensor: { codigo: 'REL-K2-G1-01', tipo: 'Ventiladores (K2)' },
    usuario: { id: 5, nombre_completo: 'Ana' },
    ...parcial,
  }
}

function estado(parcial: Partial<EstadoRele> = {}): EstadoRele {
  return {
    sensor_id: 12,
    modo: 'automatico',
    encendido: false,
    orden_id: null,
    reportado_en: '2026-10-17T15:00:05.000Z',
    vigente: true,
    confirmacion_fisica: 'no_disponible',
    ...parcial,
  }
}

describe('esReleControlable', () => {
  it('solo los relés K1-K4 con unidad de estado', () => {
    expect(esReleControlable({ esEstado: true, codigo: 'REL-K1-G1-01' })).toBe(true)
    expect(esReleControlable({ esEstado: true, codigo: 'MOT-PERS-G1-01' })).toBe(false)
    expect(esReleControlable({ esEstado: false, codigo: 'REL-K1-G1-01' })).toBe(false)
  })
})

describe('estadoActualRele', () => {
  const lectura = { valor: 1, estado: 'sin_umbral' as const }

  it('con un informe vigente, modo y salida son los que dijo el ESP32', () => {
    expect(estadoActualRele(lectura, estado({ modo: 'manual_remoto', encendido: false }))).toEqual({
      encendido: false,
      modo: 'manual_remoto',
      conectado: true,
    })
  })

  it('un informe viejo no se presenta como actual: ni modo manual ni salida', () => {
    expect(estadoActualRele(lectura, estado({ modo: 'manual_remoto', encendido: true, vigente: false }))).toEqual({
      encendido: null,
      modo: 'desconocido',
      conectado: false,
    })
  })

  it('el manual local (serial) se distingue del manual de la web', () => {
    expect(estadoActualRele(lectura, estado({ modo: 'manual_local' })).modo).toBe('manual_local')
  })

  it('sin informe (firmware anterior) usa la lectura reciente del relé y no inventa el modo', () => {
    expect(estadoActualRele(lectura, undefined)).toEqual({ encendido: true, modo: 'desconocido', conectado: true })
    expect(estadoActualRele({ valor: 1, estado: 'obsoleta' }, undefined)).toEqual({
      encendido: null,
      modo: 'desconocido',
      conectado: false,
    })
  })
})

describe('fusionarOrdenes', () => {
  it('una respuesta vieja que llega tarde no deshace una confirmación', () => {
    const confirmada = orden({ estado: 'aplicada', actualizada_en: '2026-10-17T15:00:12.000Z' })
    const vieja = orden({ estado: 'enviada', actualizada_en: '2026-10-17T15:00:06.000Z' })
    const resultado = fusionarOrdenes({ 12: confirmada }, [vieja])
    expect(resultado[12].estado).toBe('aplicada')
  })

  it('una versión más nueva de la misma orden la reemplaza', () => {
    const enviada = orden({ estado: 'enviada', actualizada_en: '2026-10-17T15:00:06.000Z' })
    const revertida = orden({ estado: 'revertida', actualizada_en: '2026-10-17T15:01:00.000Z' })
    expect(fusionarOrdenes({ 12: enviada }, [revertida])[12].estado).toBe('revertida')
  })

  it('una orden posterior del mismo relé gana aunque la anterior sea más reciente en hora', () => {
    const anterior = orden({ id: 41, estado: 'revertida', actualizada_en: '2026-10-17T15:05:00.000Z' })
    const nueva = orden({ id: 42, estado: 'pendiente', actualizada_en: '2026-10-17T15:04:00.000Z' })
    expect(fusionarOrdenes({ 12: anterior }, [nueva])[12].id).toBe(42)
  })

  it('no toca los relés que no vienen en la respuesta', () => {
    const otra = orden({ id: 30, sensor_id: 13 })
    expect(fusionarOrdenes({ 13: otra }, [orden()])[13]).toBe(otra)
  })
})

describe('ordenEnCurso y textoOrden', () => {
  it('pendiente y enviada siguen en curso; los estados finales no', () => {
    expect(ordenEnCurso(orden({ estado: 'pendiente' }))).toBe(true)
    expect(ordenEnCurso(orden({ estado: 'enviada' }))).toBe(true)
    expect(ordenEnCurso(orden({ estado: 'rechazada' }))).toBe(false)
    expect(ordenEnCurso(undefined)).toBe(false)
  })

  it('el rechazo muestra el motivo que dio el ESP32', () => {
    const texto = textoOrden(orden({ estado: 'rechazada', motivo: 'Tanque lleno: la bomba no se puede encender' }))
    expect(texto).toContain('Tanque lleno')
  })

  it('mientras está pendiente no dice que el relé cambió', () => {
    expect(textoOrden(orden({ estado: 'pendiente' }))).toMatch(/esperando/)
  })

  it('una aplicada se presenta como historial ("última orden"), no como el estado actual', () => {
    expect(textoOrden(orden({ estado: 'aplicada', estado_real: true }))).toMatch(/^Última orden/)
  })
})

describe('salida ordenada frente a confirmación física (B2)', () => {
  it('la salida se nombra como ordenada, nunca como estado físico del relé', () => {
    expect(textoSalida(true)).toBe('Salida ordenada: encendida')
    expect(textoSalida(false)).toBe('Salida ordenada: apagada')
    expect(textoSalida(true)).not.toMatch(/confirmad|físic/i)
  })

  it('con el informe vencido no se muestra el último valor como actual', () => {
    const vencido = estadoActualRele({ valor: 1, estado: 'sin_umbral' }, estado({ encendido: true, vigente: false }))
    expect(textoSalida(vencido.encendido)).toBe('Sin dato reciente')
  })

  it('desconectado (sin informe ni lectura reciente) tampoco hay salida que mostrar', () => {
    const desconectado = estadoActualRele({ valor: null, estado: 'offline' }, undefined)
    expect(desconectado.conectado).toBe(false)
    expect(textoSalida(desconectado.encendido)).toBe('Sin dato reciente')
  })

  it('el aviso dice explícitamente que no hay confirmación física', () => {
    expect(TEXTO_SIN_CONFIRMACION_FISICA).toMatch(/no disponible/)
  })
})

describe('orden incierta tras un reinicio del ESP32 (B3)', () => {
  it('es un estado final: no se sigue esperando ni se reintenta', () => {
    expect(ESTADOS_FINALES).toContain('incierta')
    expect(ordenEnCurso(orden({ estado: 'incierta' }))).toBe(false)
  })

  it('no se presenta como aplicada ni como fallida, sino como no confirmada', () => {
    const texto = textoOrden(orden({ estado: 'incierta', motivo: 'El ESP32 se reinició sin confirmar la orden' }))
    expect(texto).toMatch(/^No confirmada/)
    expect(texto).not.toMatch(/confirmada por el ESP32/)
  })
})
