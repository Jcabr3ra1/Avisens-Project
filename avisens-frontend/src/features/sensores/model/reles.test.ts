import { describe, expect, it } from 'vitest'
import type { CanalRegistrado, RegistroReles } from '../api/sensores'
import {
  esReleControlable,
  esReleSinCanal,
  esSensorRele,
  etiquetaRele,
  mensajeRegistroReles,
} from './reles'

describe('identidad de los relés en la web', () => {
  it('con canal manda el canal; sin canal, el código antiguo REL-K', () => {
    expect(esReleControlable({ esEstado: true, codigo: 'CUALQUIERA', canal: 'rele:k3' })).toBe(true)
    expect(esReleControlable({ esEstado: true, codigo: 'REL-K2-G1-01', canal: null })).toBe(true)
    // Un GPIO nunca es un relé, aunque el código lo parezca.
    expect(esReleControlable({ esEstado: true, codigo: 'REL-K1-G1-01', canal: 'gpio:18' })).toBe(false)
    expect(esReleControlable({ esEstado: false, codigo: 'REL-K1-G1-01', canal: 'rele:k1' })).toBe(false)
    expect(esReleControlable({ esEstado: true, codigo: 'MOT-ALIM-G1-01', canal: null })).toBe(false)
  })

  it('etiqueta K1-K4 por canal o por código antiguo', () => {
    expect(etiquetaRele({ canal: 'rele:k4', codigo: 'X' })).toBe('K4')
    expect(etiquetaRele({ canal: null, codigo: 'REL-K2-G1-01' })).toBe('K2')
    expect(etiquetaRele({ canal: 'gpio:4', codigo: 'REL-K2-G1-01' })).toBeNull()
  })

  it('detecta los relés antiguos que aún no tienen canal', () => {
    expect(esReleSinCanal({ esEstado: true, codigo: 'REL-K1-G1-01', canal: null })).toBe(true)
    expect(esReleSinCanal({ esEstado: true, codigo: 'REL-K1-G1-D7', canal: 'rele:k1' })).toBe(false)
  })

  it('reconoce un relé tal como lo devuelve la API', () => {
    expect(esSensorRele({ unidad_medida: 'Estado', codigo: 'X', canal: 'rele:k2' })).toBe(true)
    expect(esSensorRele({ unidad_medida: '°C', codigo: 'X', canal: 'gpio:4' })).toBe(false)
  })
})

function registro(canales: Array<Partial<CanalRegistrado> & Pick<CanalRegistrado, 'canal' | 'resultado'>>): RegistroReles {
  const lista = canales.map((c) => ({ nombre: 'Relé', sensor_id: 1, codigo: 'C', motivo: null, ...c }))
  const cuenta = (r: string) => lista.filter((c) => c.resultado === r).length
  return {
    galpon_id: 1,
    dispositivo: { id: 10, nombre: 'ESP32 norte', codigo_topic: 'G1-ESP32-01' },
    completo: cuenta('conflicto') === 0,
    resumen: {
      creados: cuenta('creado'),
      asociados: cuenta('asociado'),
      existentes: cuenta('existente'),
      conflictos: cuenta('conflicto'),
    },
    canales: lista,
  }
}

describe('mensaje del registro de relés', () => {
  it('registro inicial: éxito con los cuatro creados', () => {
    const m = mensajeRegistroReles(registro([
      { canal: 'rele:k1', resultado: 'creado' },
      { canal: 'rele:k2', resultado: 'creado' },
      { canal: 'rele:k3', resultado: 'creado' },
      { canal: 'rele:k4', resultado: 'creado' },
    ]))
    expect(m.tono).toBe('ok')
    expect(m.titulo).toBe('Relés de G1-ESP32-01 registrados: 4 creados.')
  })

  it('repetido: informa que el registro ya estaba completo', () => {
    const m = mensajeRegistroReles(registro(['rele:k1', 'rele:k2', 'rele:k3', 'rele:k4'].map((canal) => ({ canal, resultado: 'existente' as const }))))
    expect(m.tono).toBe('ok')
    expect(m.titulo).toContain('ya estaba completo')
  })

  it('parcial: cuenta creados, asociados (conservan historial) y existentes', () => {
    const m = mensajeRegistroReles(registro([
      { canal: 'rele:k1', resultado: 'asociado' },
      { canal: 'rele:k2', resultado: 'existente' },
      { canal: 'rele:k3', resultado: 'creado' },
      { canal: 'rele:k4', resultado: 'creado' },
    ]))
    expect(m.titulo).toBe(
      'Relés de G1-ESP32-01 registrados: 2 creados, 1 registro antiguo asociado (conservan su historial), 1 ya existía.',
    )
  })

  it('conflicto: aviso que nombra el canal afectado y su motivo', () => {
    const m = mensajeRegistroReles(registro([
      { canal: 'rele:k1', resultado: 'creado' },
      { canal: 'rele:k2', resultado: 'conflicto', nombre: 'Ventiladores', sensor_id: null, codigo: null, motivo: 'Hay 2 registros antiguos' },
      { canal: 'rele:k3', resultado: 'creado' },
      { canal: 'rele:k4', resultado: 'existente' },
    ]))
    expect(m.tono).toBe('aviso')
    expect(m.titulo).toContain('1 canal quedó sin registrar')
    expect(m.detalles).toEqual(['K2 · Ventiladores: Hay 2 registros antiguos'])
  })
})
