import { describe, expect, it } from 'vitest'
import { organizarBandeja, prioridadDe, resumirBandeja } from './bandeja'
import type { ProspectoVista } from './prospectoVista'

const AHORA = new Date('2026-10-16T10:00:00-05:00')

function prospecto(cambios: Partial<ProspectoVista> = {}): ProspectoVista {
  return {
    id: 1,
    nombre: 'Ana Pérez',
    granja: 'La Esperanza',
    municipio: 'Montería',
    rol: 'Propietario',
    areaGalponM2: 0,
    puntaje: 6,
    etapa: 'tibio',
    ultimaActividad: '2026-10-15T09:00:00-05:00',
    telefono: '3001234567',
    asesorId: 7,
    canal: 'web',
    estado: 'calificado',
    departamento: 'Córdoba',
    numeroGalpones: 2,
    accionSiguiente: 'DEMO_REMOTA',
    fechaCallback: null,
    senalCaliente: false,
    contactoDecisor: '',
    fechaInicio: '2026-10-14T09:00:00-05:00',
    ...cambios,
  }
}

describe('prioridadDe', () => {
  it('una llamada al decisor que ya venció va primero, con los días de atraso', () => {
    const prioridad = prioridadDe(prospecto({ fechaCallback: '2026-10-13T09:00:00-05:00' }), AHORA)
    expect(prioridad.grupo).toBe('vencidos')
    expect(prioridad.motivo).toBe('Llamada pendiente: venció hace 3 días')
  })

  it('una llamada agendada para más tarde hoy va en «Para hoy» con su hora', () => {
    const prioridad = prioridadDe(prospecto({ fechaCallback: '2026-10-16T15:00:00-05:00' }), AHORA)
    expect(prioridad.grupo).toBe('hoy')
    expect(prioridad.motivo).toMatch(/^Llamar hoy a las 3:00/)
  })

  it('un caliente sin contacto 4 días o más está vencido; uno reciente es para hoy', () => {
    expect(prioridadDe(prospecto({ etapa: 'caliente', ultimaActividad: '2026-10-11T09:00:00-05:00' }), AHORA).grupo).toBe('vencidos')
    const reciente = prioridadDe(prospecto({ etapa: 'caliente', senalCaliente: true }), AHORA)
    expect(reciente.grupo).toBe('hoy')
    expect(reciente.motivo).toBe('Interés alto y tiene un problema que resolver')
  })

  it('un tibio sin contacto 12 días está vencido', () => {
    expect(prioridadDe(prospecto({ ultimaActividad: '2026-10-03T09:00:00-05:00' }), AHORA).grupo).toBe('vencidos')
  })

  it('sin asesor y sin urgencia queda en «Sin asesor»', () => {
    const prioridad = prioridadDe(prospecto({ asesorId: null, etapa: 'frio' }), AHORA)
    expect(prioridad.grupo).toBe('sin_asesor')
    expect(prioridad.motivo).toBe('Llegó hace 2 días y nadie lo atiende')
  })

  it('con asesor y sin urgencia muestra su acción siguiente', () => {
    const prioridad = prioridadDe(prospecto(), AHORA)
    expect(prioridad.grupo).toBe('seguimiento')
    expect(prioridad.motivo).toBe('Programar una demo remota · último contacto hace 1 día')
  })

  it('convertidos y descartados salen de la bandeja activa', () => {
    expect(prioridadDe(prospecto({ etapa: 'cerrado' }), AHORA).grupo).toBe('convertidos')
    expect(prioridadDe(prospecto({ etapa: 'descartado' }), AHORA).grupo).toBe('descartados')
  })
})

describe('organizarBandeja', () => {
  const lista = [
    prospecto({ id: 1 }),
    prospecto({ id: 2, etapa: 'caliente', puntaje: 10 }),
    prospecto({ id: 3, fechaCallback: '2026-10-14T09:00:00-05:00' }),
    prospecto({ id: 4, asesorId: null, etapa: 'frio', canal: 'whatsapp', nombre: 'José Ñúñez' }),
    prospecto({ id: 5, etapa: 'cerrado' }),
    prospecto({ id: 6, etapa: 'descartado' }),
  ]
  const base = { vista: 'prioridad' as const, texto: '', canal: 'todos' as const, temperatura: 'todas' as const }

  it('ordena la vista de prioridad por grupos y omite grupos vacíos', () => {
    const secciones = organizarBandeja(lista, base, AHORA)
    expect(secciones.map((seccion) => seccion.grupo)).toEqual(['vencidos', 'hoy', 'sin_asesor', 'seguimiento'])
    expect(secciones.flatMap((seccion) => seccion.items.map((item) => item.prospecto.id))).toEqual([3, 2, 4, 1])
  })

  it('filtra por búsqueda sin tildes, por canal y por temperatura', () => {
    expect(organizarBandeja(lista, { ...base, texto: 'nunez' }, AHORA)[0].items[0].prospecto.id).toBe(4)
    expect(organizarBandeja(lista, { ...base, canal: 'whatsapp' }, AHORA).flatMap((s) => s.items)).toHaveLength(1)
    expect(organizarBandeja(lista, { ...base, temperatura: 'caliente' }, AHORA).flatMap((s) => s.items.map((i) => i.prospecto.id))).toEqual([2])
  })

  it('las vistas de convertidos y descartados solo muestran los suyos', () => {
    expect(organizarBandeja(lista, { ...base, vista: 'convertidos' }, AHORA).flatMap((s) => s.items.map((i) => i.prospecto.id))).toEqual([5])
    expect(organizarBandeja(lista, { ...base, vista: 'descartados' }, AHORA).flatMap((s) => s.items.map((i) => i.prospecto.id))).toEqual([6])
  })

  it('la vista de activos es una sola lista por contacto más reciente', () => {
    const secciones = organizarBandeja([
      prospecto({ id: 1, ultimaActividad: '2026-10-10T09:00:00-05:00' }),
      prospecto({ id: 2, ultimaActividad: '2026-10-15T09:00:00-05:00' }),
    ], { ...base, vista: 'activos' }, AHORA)
    expect(secciones).toHaveLength(1)
    expect(secciones[0].items.map((item) => item.prospecto.id)).toEqual([2, 1])
  })
})

describe('resumirBandeja', () => {
  it('cuenta lo que hay que atender, el embudo y la conversión', () => {
    const resumen = resumirBandeja([
      prospecto({ id: 1, etapa: 'caliente' }),
      prospecto({ id: 2, fechaCallback: '2026-10-14T09:00:00-05:00' }),
      prospecto({ id: 3, etapa: 'frio', asesorId: null }),
      prospecto({ id: 4, etapa: 'cerrado' }),
      prospecto({ id: 5, etapa: 'descartado' }),
    ], AHORA)
    expect(resumen).toMatchObject({
      paraAtender: 2,
      vencidos: 1,
      activos: 3,
      porTemperatura: { frio: 1, tibio: 1, caliente: 1 },
      convertidos: 1,
      conversionPct: 25,
      sinAsesor: 1,
      porVista: { prioridad: 3, activos: 3, convertidos: 1, descartados: 1 },
    })
  })
})
