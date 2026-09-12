import { describe, expect, it } from 'vitest'
import type { Umbral } from '../api/umbrales'
import {
  agruparPorVariable,
  etiquetaSemana,
  hayHuecos,
  totalDeHuecos,
} from './umbralVista'

function umbral(cambios: Partial<Umbral> = {}): Umbral {
  return {
    id: 1, galpon_id: 2, variable: 'temperatura', semana_vida: 0,
    valor_minimo: 32, valor_maximo: 34, unidad: '°C',
    criticidad: 'alta', vigente: true, version: 1,
    fecha_creacion: '2026-09-10T00:00:00.000Z',
    galpon: { id: 2, nombre: 'Norte', granja: { id: 1, propietario_id: 3 } },
    ...cambios,
  }
}

describe('agruparPorVariable', () => {
  it('despliega las siete semanas aunque falten umbrales', () => {
    // La rampa solo se entiende entera: si solo se pintan las semanas que
    // existen, un hueco parece que no está en vez de parecer un hueco.
    const filas = agruparPorVariable([umbral()], ['temperatura'])
    expect(filas[0].celdas).toHaveLength(7)
    expect(filas[0].celdas[0].umbral).not.toBeNull()
    expect(filas[0].celdas[1].umbral).toBeNull()
  })

  it('cuenta los huecos, que es lo que deja al sensor sin comparar', () => {
    const filas = agruparPorVariable([umbral()], ['temperatura'])
    expect(filas[0].faltan).toBe(6)
    expect(totalDeHuecos(filas)).toBe(6)
    expect(hayHuecos(filas)).toBe(true)
  })

  it('ignora los umbrales jubilados', () => {
    // Solo el vigente se usa para comparar. Contar una versión vieja como si
    // cubriera la semana sería decir que hay umbral donde no lo hay.
    const filas = agruparPorVariable(
      [umbral({ vigente: false }), umbral({ id: 2, semana_vida: 1 })],
      ['temperatura'],
    )
    expect(filas[0].celdas[0].umbral).toBeNull()
    expect(filas[0].celdas[1].umbral).not.toBeNull()
  })

  it('una variable sin ningún umbral sale entera vacía', () => {
    const filas = agruparPorVariable([], ['temperatura', 'humedad'])
    expect(filas).toHaveLength(2)
    expect(totalDeHuecos(filas)).toBe(14)
  })

  it('sin huecos no avisa de nada', () => {
    const completos = [0, 1, 2, 3, 4, 5, 6].map((semana) =>
      umbral({ id: semana + 1, semana_vida: semana }),
    )
    const filas = agruparPorVariable(completos, ['temperatura'])
    expect(hayHuecos(filas)).toBe(false)
  })
})

describe('etiquetaSemana', () => {
  it('habla en días, que es lo que entiende quien mira', () => {
    // «Semana 0» no le dice nada a nadie en una cabecera de tabla.
    expect(etiquetaSemana(0)).toBe('Días 1–7')
    expect(etiquetaSemana(5)).toBe('Días 36–42')
  })
})
