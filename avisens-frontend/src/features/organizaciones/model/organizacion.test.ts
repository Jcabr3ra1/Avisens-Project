import { describe, expect, it } from 'vitest'
import type { Organizacion } from '../api/organizaciones'
import { actividadDe, etiquetaPlan, filtrarOrganizaciones, inicialesOrganizacion, normalizarPlan, resumirOrganizaciones } from './organizacion'

function organizacion(cambios: Partial<Organizacion> = {}): Organizacion {
  return {
    id: 1, nombre: 'Cliente', nit: null, plan: 'free', activa: true,
    fecha_creacion: '2026-08-26T14:51:59.674Z',
    _count: { granjas: 1, usuarios: 3 },
    ...cambios,
  }
}

describe('resumirOrganizaciones', () => {
  it('suma los conteos que trae el servidor', () => {
    // Los totales salen del `_count` de cada fila y no de recorrer granjas y
    // usuarios: así no dependen de lo que alcance a ver quien mira.
    const resumen = resumirOrganizaciones([
      organizacion({ _count: { granjas: 1, usuarios: 3 } }),
      organizacion({ id: 2, _count: { granjas: 0, usuarios: 1 } }),
    ])
    expect(resumen).toEqual({ total: 2, activas: 2, sinActividad: 2, granjas: 1, usuarios: 4 })
  })

  it('una organización suspendida cuenta en el total pero no en las activas', () => {
    const resumen = resumirOrganizaciones([
      organizacion(),
      organizacion({ id: 2, activa: false }),
    ])
    expect(resumen.total).toBe(2)
    expect(resumen.activas).toBe(1)
  })

  it('sin organizaciones todo queda en cero', () => {
    expect(resumirOrganizaciones([])).toEqual({ total: 0, activas: 0, sinActividad: 0, granjas: 0, usuarios: 0 })
  })
})

describe('planes', () => {
  it('agrupa las variantes de escritura del mismo plan', () => {
    // El backend guarda `plan` como texto libre, así que 'Free', 'free ' y
    // 'FREE' llegan como cadenas distintas siendo el mismo plan.
    expect(normalizarPlan(' Free ')).toBe('free')
    expect(normalizarPlan('FREE')).toBe('free')
  })

  it('un plan vacío se dice con palabras, no con un hueco', () => {
    expect(etiquetaPlan('')).toBe('Sin plan')
    expect(etiquetaPlan('   ')).toBe('Sin plan')
  })
})

describe('filtrarOrganizaciones', () => {
  const lista = [
    organizacion({ id: 1, nombre: 'Avícola Zuleta', nit: '900111', activa: true, fecha_creacion: '2026-01-01T00:00:00Z', _count: { granjas: 1, usuarios: 5 } }),
    organizacion({ id: 2, nombre: 'avicola Andes', nit: null, activa: false, fecha_creacion: '2026-03-01T00:00:00Z', _count: { granjas: 4, usuarios: 1 } }),
    organizacion({ id: 3, nombre: 'Granja Ñuñoa', nit: '800222', activa: true, fecha_creacion: '2026-02-01T00:00:00Z', _count: { granjas: 4, usuarios: 2 } }),
  ]
  const ids = (resultado: Organizacion[]) => resultado.map((item) => item.id)

  it('busca sin distinguir tildes ni mayúsculas, por nombre o NIT', () => {
    expect(ids(filtrarOrganizaciones(lista, { texto: 'AVICOLA', estado: 'todas', orden: 'nombre-asc' }))).toEqual([2, 1])
    expect(ids(filtrarOrganizaciones(lista, { texto: 'nunoa', estado: 'todas', orden: 'nombre-asc' }))).toEqual([3])
    expect(ids(filtrarOrganizaciones(lista, { texto: '800', estado: 'todas', orden: 'nombre-asc' }))).toEqual([3])
  })

  it('filtra por estado', () => {
    expect(ids(filtrarOrganizaciones(lista, { texto: '', estado: 'activas', orden: 'nombre-asc' }))).toEqual([1, 3])
    expect(ids(filtrarOrganizaciones(lista, { texto: '', estado: 'suspendidas', orden: 'nombre-asc' }))).toEqual([2])
  })

  it('ordena y desempata por nombre sin mutar la lista original', () => {
    const original = ids(lista)
    expect(ids(filtrarOrganizaciones(lista, { texto: '', estado: 'todas', orden: 'nombre-desc' }))).toEqual([3, 1, 2])
    expect(ids(filtrarOrganizaciones(lista, { texto: '', estado: 'todas', orden: 'granjas' }))).toEqual([2, 3, 1])
    expect(ids(filtrarOrganizaciones(lista, { texto: '', estado: 'todas', orden: 'personas' }))).toEqual([1, 3, 2])
    expect(ids(filtrarOrganizaciones(lista, { texto: '', estado: 'todas', orden: 'recientes' }))).toEqual([2, 3, 1])
    expect(ids(lista)).toEqual(original)
  })
})

describe('inicialesOrganizacion', () => {
  it('toma la primera y la última palabra con contenido', () => {
    expect(inicialesOrganizacion('Organización de perez')).toBe('OP')
    expect(inicialesOrganizacion('Avícola Demo del Caribe S.A.S.')).toBe('AC')
    expect(inicialesOrganizacion('Pollos')).toBe('P')
    expect(inicialesOrganizacion('  ')).toBe('?')
  })
})

describe('actividadDe', () => {
  const ahora = new Date('2026-10-17T12:00:00Z')
  const hace = (dias: number) => new Date(ahora.getTime() - dias * 86_400_000).toISOString()

  it('marca sin actividad desde los 7 días', () => {
    expect(actividadDe({ ultima_actividad: hace(6) }, ahora).tono).toBe('reciente')
    expect(actividadDe({ ultima_actividad: hace(7) }, ahora)).toEqual({ tono: 'inactiva', texto: 'Sin actividad: último ingreso hace 7 días' })
  })

  it('habla en lenguaje natural para lo reciente', () => {
    expect(actividadDe({ ultima_actividad: hace(0) }, ahora).texto).toBe('Último ingreso hoy')
    expect(actividadDe({ ultima_actividad: hace(1) }, ahora).texto).toBe('Último ingreso ayer')
  })

  it('distingue a la organización donde nadie ha ingresado', () => {
    expect(actividadDe({ ultima_actividad: null }, ahora)).toEqual({ tono: 'nunca', texto: 'Nadie ha ingresado aún' })
  })
})
