import { describe, expect, it } from 'vitest'
import type { PoliticaAlerta } from '../api/politicas-alerta'
import {
  NIVELES_POLITICA,
  canalInicial,
  estadoDePolitica,
  minutosIniciales,
  politicaDeNivel,
  segundosDeMinutos,
  tiempoLegible,
  validarMinutos,
} from './politicaAlerta'

function politica(parcial: Partial<PoliticaAlerta>): PoliticaAlerta {
  return {
    id: 1,
    granja_id: 10,
    criticidad: 'alta',
    nivel_escalamiento: null,
    canal: 'WhatsApp',
    tiempo_max_respuesta_seg: 900,
    verificado: false,
    activa: true,
    fecha_actualizacion: '2026-11-10T10:00:00Z',
    granja: { id: 10, nombre: 'La Esperanza', propietario_id: 3 },
    ...parcial,
  }
}

const ALTA = NIVELES_POLITICA[0]

describe('politicaDeNivel', () => {
  it('prefiere la activa aunque haya una pausada más reciente', () => {
    const activa = politica({ id: 1, fecha_actualizacion: '2026-11-01T00:00:00Z' })
    const pausada = politica({ id: 2, activa: false, fecha_actualizacion: '2026-11-12T00:00:00Z' })
    expect(politicaDeNivel([pausada, activa], 10, 'alta')?.id).toBe(1)
  })

  it('sin activa, devuelve la pausada más reciente para reactivarla', () => {
    const vieja = politica({ id: 1, activa: false, fecha_actualizacion: '2026-11-01T00:00:00Z' })
    const nueva = politica({ id: 2, activa: false, fecha_actualizacion: '2026-11-12T00:00:00Z' })
    expect(politicaDeNivel([vieja, nueva], 10, 'alta')?.id).toBe(2)
  })

  it('ignora otras granjas y otras criticidades', () => {
    const otraGranja = politica({ id: 1, granja_id: 99 })
    const media = politica({ id: 2, criticidad: 'media' })
    expect(politicaDeNivel([otraGranja, media], 10, 'alta')).toBeNull()
  })

  it('reconoce criticidades guardadas con mayúscula', () => {
    expect(politicaDeNivel([politica({ criticidad: 'Alta' })], 10, 'alta')).not.toBeNull()
  })
})

describe('estadoDePolitica', () => {
  it('distingue sin configurar, activa y pausada', () => {
    expect(estadoDePolitica(null)).toBe('sin-configurar')
    expect(estadoDePolitica(politica({}))).toBe('activa')
    expect(estadoDePolitica(politica({ activa: false }))).toBe('pausada')
  })
})

describe('valores iniciales del formulario', () => {
  it('convierte los segundos guardados a minutos', () => {
    expect(minutosIniciales(politica({ tiempo_max_respuesta_seg: 1800 }), ALTA)).toBe('30')
  })

  it('sugiere el tiempo del nivel cuando no hay política o no tiene tiempo', () => {
    expect(minutosIniciales(null, ALTA)).toBe('15')
    expect(minutosIniciales(politica({ tiempo_max_respuesta_seg: null }), ALTA)).toBe('15')
  })

  it('usa WhatsApp si el canal guardado no es uno de los válidos', () => {
    expect(canalInicial(politica({ canal: 'Email' }))).toBe('Email')
    expect(canalInicial(politica({ canal: 'paloma' }))).toBe('WhatsApp')
    expect(canalInicial(null)).toBe('WhatsApp')
  })
})

describe('validarMinutos', () => {
  it('acepta enteros dentro del rango', () => {
    expect(validarMinutos('1')).toBeNull()
    expect(validarMinutos('1440')).toBeNull()
  })

  it('rechaza vacío, decimales y valores fuera de rango', () => {
    expect(validarMinutos('')).not.toBeNull()
    expect(validarMinutos('2.5')).not.toBeNull()
    expect(validarMinutos('0')).not.toBeNull()
    expect(validarMinutos('1441')).not.toBeNull()
  })

  it('convierte los minutos a los segundos que espera el backend', () => {
    expect(segundosDeMinutos('15')).toBe(900)
  })
})

describe('tiempoLegible', () => {
  it('expresa minutos y horas en lenguaje natural', () => {
    expect(tiempoLegible(15)).toBe('15 min')
    expect(tiempoLegible(60)).toBe('1 hora')
    expect(tiempoLegible(150)).toBe('2 horas 30 min')
  })
})
