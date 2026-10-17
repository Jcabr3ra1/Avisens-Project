import { describe, expect, it } from 'vitest'
import { enlaceTelefono, enlaceWhatsApp, organizarBandeja, plazoDe, resumirBandeja } from './bandejaPqrs'
import type { SolicitudPqrs } from './solicitudPqrs'

const AHORA = new Date('2026-10-16T12:00:00Z')
const HORA = 3_600_000

function enHoras(horas: number): string {
  return new Date(AHORA.getTime() + horas * HORA).toISOString()
}

function solicitud(parcial: Partial<SolicitudPqrs> & { id: number }): SolicitudPqrs {
  return {
    radicado: `PQRS-${String(parcial.id).padStart(6, '0')}`,
    prospecto_id: 1,
    categoria: 'Reclamo',
    asunto: 'Los sensores no reportan',
    mensaje: null,
    respuesta: null,
    estado: 'abierta',
    responsable_id: null,
    fecha_creacion: enHoras(-10),
    fecha_limite: enHoras(14),
    fecha_cierre: null,
    prospecto: { id: 1, nombre: 'Granja El Jaller', telefono: '3001234567', email: null, canal_origen: 'whatsapp' },
    responsable: null,
    ...parcial,
  }
}

const filtros = { vista: 'atender' as const, texto: '', categoria: 'todas', usuarioId: 5 }

describe('plazoDe', () => {
  it('marca vencida, por vencer, a tiempo y sin plazo', () => {
    expect(plazoDe(solicitud({ id: 1, fecha_limite: enHoras(-2) }), AHORA)).toEqual({ tono: 'vencida', texto: 'Vencida hace 2 h' })
    expect(plazoDe(solicitud({ id: 2, fecha_limite: enHoras(3) }), AHORA)).toEqual({ tono: 'por_vencer', texto: 'Vence en 3 h' })
    expect(plazoDe(solicitud({ id: 3, fecha_limite: enHoras(30) }), AHORA).tono).toBe('a_tiempo')
    expect(plazoDe(solicitud({ id: 4, fecha_limite: null }), AHORA)).toEqual({ tono: 'sin_plazo', texto: 'Sin plazo' })
  })

  it('una resuelta dice si se cumplió el plazo', () => {
    expect(plazoDe(solicitud({ id: 1, estado: 'resuelta', fecha_limite: enHoras(-1), fecha_cierre: enHoras(-3) }), AHORA).tono).toBe('cumplida')
    expect(plazoDe(solicitud({ id: 2, estado: 'cerrada', fecha_limite: enHoras(-5), fecha_cierre: enHoras(-2) }), AHORA)).toEqual({ tono: 'tarde', texto: 'Resuelta 3 h tarde' })
  })
})

describe('organizarBandeja', () => {
  const lista = [
    solicitud({ id: 1, estado: 'en_proceso', responsable_id: 5, fecha_limite: enHoras(20) }),
    solicitud({ id: 2, fecha_limite: enHoras(-1) }),
    solicitud({ id: 3, fecha_limite: enHoras(2) }),
    solicitud({ id: 4, fecha_limite: enHoras(40) }),
    solicitud({ id: 5, fecha_limite: enHoras(10) }),
    solicitud({ id: 6, estado: 'resuelta', responsable_id: 5, respuesta: 'Listo', fecha_cierre: enHoras(-1) }),
    solicitud({ id: 7, estado: 'cerrada', respuesta: 'Listo', fecha_creacion: enHoras(-51), fecha_cierre: enHoras(-30) }),
  ]

  it('ordena por urgencia: vencidas, por vencer, nuevas y en proceso', () => {
    const secciones = organizarBandeja(lista, filtros, AHORA)
    expect(secciones.map((seccion) => seccion.grupo)).toEqual(['vencidas', 'por_vencer', 'nuevas', 'en_proceso'])
    expect(secciones[2].items.map((item) => item.id)).toEqual([5, 4])
  })

  it('«Mías» solo muestra las del usuario', () => {
    const ids = organizarBandeja(lista, { ...filtros, vista: 'mias' }, AHORA).flatMap((seccion) => seccion.items.map((item) => item.id))
    expect(ids).toEqual([1, 6])
  })

  it('busca por radicado sin importar tildes ni mayúsculas', () => {
    const ids = organizarBandeja(lista, { ...filtros, vista: 'todas', texto: 'pqrs-000004' }, AHORA).flatMap((seccion) => seccion.items.map((item) => item.id))
    expect(ids).toEqual([4])
    expect(organizarBandeja(lista, { ...filtros, vista: 'todas', texto: 'JALLER' }, AHORA).length).toBeGreaterThan(0)
  })

  it('filtra por categoría', () => {
    expect(organizarBandeja([solicitud({ id: 1, categoria: 'Queja' })], { ...filtros, categoria: 'Reclamo' }, AHORA)).toEqual([])
  })

  it('«sin tomar» incluye las vencidas que nadie ha tomado', () => {
    const vencidaSinDueno = solicitud({ id: 9, estado: 'abierta', responsable_id: null, fecha_limite: '2026-01-01T00:00:00.000Z' })
    const resumen = resumirBandeja([vencidaSinDueno], 5, AHORA)
    expect(resumen.vencidas).toBe(1)
    expect(resumen.sinTomar).toBe(1)
  })

  it('resume los conteos de la cabecera', () => {
    const resumen = resumirBandeja(lista, 5, AHORA)
    expect(resumen).toEqual(expect.objectContaining({ porAtender: 5, vencidas: 1, porVencer: 1, sinTomar: 4, resueltasSemana: 2 }))
    expect(resumen.porVista).toEqual({ atender: 5, mias: 2, resueltas: 2, todas: 7 })
    expect(resumen.respuestaPromedioHoras).toBe(15)
  })
})

describe('enlaces de contacto', () => {
  it('arma WhatsApp con indicativo de Colombia', () => {
    expect(enlaceWhatsApp('300 123 4567')).toBe('https://wa.me/573001234567')
    expect(enlaceWhatsApp('+57 300 123 4567')).toBe('https://wa.me/573001234567')
  })

  it('no arma enlaces con identidades que no son teléfonos', () => {
    expect(enlaceWhatsApp('CO.1234567890')).toBeNull()
    expect(enlaceTelefono('CO.1234567890')).toBeNull()
    expect(enlaceTelefono(null)).toBeNull()
  })
})
