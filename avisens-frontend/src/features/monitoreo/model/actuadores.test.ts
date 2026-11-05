import { describe, expect, it } from 'vitest'
import {
  ESTADOS_FINALES,
  SIN_ESTADOS,
  TEXTO_SIN_CONFIRMACION_FISICA,
  VIGENCIA_ESTADO_MS,
  aplicarRespuestaEstados,
  esReleControlable,
  estadoActualRele,
  estadosVigentes,
  fusionarOrdenes,
  opcionActiva,
  opcionSolicitada,
  ordenEnCurso,
  proximoVencimiento,
  puedeEnviarOrden,
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

describe('vigencia del estado en la pantalla (D2)', () => {
  const lectura = { valor: 1, estado: 'sin_umbral' as const }
  // Reloj local arbitrario: la consulta salió en T0. El servidor respondió
  // cuando el informe (reportado 15:00:05) tenía 5 s: le quedan 25 s.
  const T0 = 1_000_000
  const GENERADO = Date.parse('2026-10-17T15:00:10.000Z')
  const VENCE = T0 + VIGENCIA_ESTADO_MS - 5_000

  const recibir = (consulta: number, consultadaEn: number, previos = SIN_ESTADOS, generadoEn: number | null = GENERADO) =>
    aplicarRespuestaEstados(previos, consulta, [estado({ modo: 'manual_remoto', encendido: true })], {
      consultadaEn,
      generadoEn,
    })

  const actualEn = (recibidos: ReturnType<typeof recibir>, ahora: number) =>
    estadoActualRele(lectura, estadosVigentes(recibidos, ahora)[12])

  it('antes de cumplir los 30 s el estado es actual y los botones están disponibles', () => {
    const actual = actualEn(recibir(1, T0), VENCE)
    expect(actual).toEqual({ encendido: true, modo: 'manual_remoto', conectado: true })
    expect(puedeEnviarOrden(actual, false)).toBe(true)
  })

  it('pasados los 30 s sin otra respuesta correcta muestra "Sin dato reciente" y bloquea los botones', () => {
    const actual = actualEn(recibir(1, T0), VENCE + 1)
    expect(actual).toEqual({ encendido: null, modo: 'desconocido', conectado: false })
    expect(textoSalida(actual.encendido)).toBe('Sin dato reciente')
    expect(puedeEnviarOrden(actual, false)).toBe(false)
  })

  it('la edad que el informe ya tenía al responder se descuenta; sin generado_en se cuenta desde la consulta', () => {
    expect(actualEn(recibir(1, T0), T0 + 26_000).conectado).toBe(false)
    expect(actualEn(recibir(1, T0, SIN_ESTADOS, null), T0 + VIGENCIA_ESTADO_MS).conectado).toBe(true)
    expect(actualEn(recibir(1, T0, SIN_ESTADOS, null), T0 + VIGENCIA_ESTADO_MS + 1).conectado).toBe(false)
  })

  it('una consulta fallida no renueva la vigencia: el estado anterior sigue envejeciendo', () => {
    // La consulta 2 falla: no llega a aplicarRespuestaEstados y nada cambia.
    const tras = recibir(1, T0)
    expect(actualEn(tras, VENCE + 1).conectado).toBe(false)
    expect(proximoVencimiento(tras, VENCE + 1)).toBeNull()
  })

  it('una respuesta tardía de una consulta anterior no restaura un estado viejo', () => {
    const nueva = recibir(3, T0 + 40_000)
    expect(recibir(2, T0 + 20_000, nueva)).toBe(nueva)
  })

  it('una respuesta correcta posterior devuelve el estado actual y los controles', () => {
    const vencido = recibir(1, T0)
    expect(actualEn(vencido, VENCE + 1).conectado).toBe(false)
    const recuperado = recibir(2, VENCE + 2_000, vencido, GENERADO + VENCE + 2_000 - T0)
    // El informe es igual de viejo que antes (no llegó otro del ESP32): con
    // generado_en que avanzó lo mismo, ya no vale. Uno reciente sí.
    expect(actualEn(recuperado, VENCE + 2_000).conectado).toBe(false)
    const fresco = aplicarRespuestaEstados(vencido, 3, [estado({ reportado_en: '2026-10-17T15:01:00.000Z' })], {
      consultadaEn: VENCE + 3_000,
      generadoEn: Date.parse('2026-10-17T15:01:01.000Z'),
    })
    const actual = actualEn(fresco, VENCE + 3_000)
    expect(actual.conectado).toBe(true)
    expect(puedeEnviarOrden(actual, false)).toBe(true)
  })

  it('lo que el servidor ya marcó como no vigente nunca se presenta como actual', () => {
    const recibidos = aplicarRespuestaEstados(SIN_ESTADOS, 1, [estado({ vigente: false })], {
      consultadaEn: T0,
      generadoEn: GENERADO,
    })
    expect(actualEn(recibidos, T0).conectado).toBe(false)
    expect(proximoVencimiento(recibidos, T0)).toBeNull()
  })

  it('con una orden en curso los botones siguen bloqueados aunque el estado sea vigente', () => {
    const actual = actualEn(recibir(1, T0), T0)
    expect(puedeEnviarOrden(actual, true)).toBe(false)
  })

  it('el próximo vencimiento es el del informe que vence primero', () => {
    const recibidos = aplicarRespuestaEstados(
      SIN_ESTADOS,
      1,
      [estado({ sensor_id: 12 }), estado({ sensor_id: 13, reportado_en: '2026-10-17T15:00:01.000Z' })],
      { consultadaEn: T0, generadoEn: GENERADO },
    )
    expect(proximoVencimiento(recibidos, T0)).toBe(T0 + VIGENCIA_ESTADO_MS - 9_000)
  })
})

describe('botón activo y botón pedido', () => {
  const lectura = { valor: 1, estado: 'sin_umbral' as const }
  const actual = (parcial: Partial<EstadoRele>) => estadoActualRele(lectura, estado(parcial))

  it('el activo sale de lo que informó el ESP32: manual web encendido, apagado o automático', () => {
    expect(opcionActiva(actual({ modo: 'manual_remoto', encendido: true }))).toBe('encender')
    expect(opcionActiva(actual({ modo: 'manual_remoto', encendido: false }))).toBe('apagar')
    // En automático la salida puede estar encendida: el activo es el modo, no la salida.
    expect(opcionActiva(actual({ modo: 'automatico', encendido: true }))).toBe('automatico')
  })

  it('sin dato vigente o en manual local no se marca ninguno', () => {
    expect(opcionActiva(actual({ vigente: false, modo: 'manual_remoto', encendido: true }))).toBeNull()
    expect(opcionActiva(actual({ modo: 'manual_local', encendido: true }))).toBeNull()
    expect(opcionActiva(estadoActualRele({ valor: null, estado: 'offline' }, undefined))).toBeNull()
  })

  it('pulsar no marca activo: la orden en curso es "pedida", y al cerrarse deja de serlo', () => {
    expect(opcionSolicitada(orden({ estado: 'pendiente', accion: 'apagar' }))).toBe('apagar')
    expect(opcionSolicitada(orden({ estado: 'enviada', accion: 'automatico' }))).toBe('automatico')
    expect(opcionSolicitada(orden({ estado: 'aplicada', accion: 'apagar' }))).toBeNull()
    expect(opcionSolicitada(orden({ estado: 'rechazada', accion: 'encender' }))).toBeNull()
    expect(opcionSolicitada(undefined)).toBeNull()
    // Mientras tanto, el activo sigue siendo el que informó el ESP32.
    expect(opcionActiva(actual({ modo: 'automatico' }))).toBe('automatico')
  })
})
