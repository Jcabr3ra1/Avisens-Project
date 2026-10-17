import { describe, expect, it } from 'vitest'
import type { AtencionAdminData } from '../api/admin'
import type { Prospecto } from '@features/crm/api/prospectos'
import { aProspectoVista } from '@features/crm/model/prospectoVista'
import { resumirBandeja } from '@features/crm/model/bandeja'
import { calcularAtencionAdmin, calcularConversionCrm, calcularEtapasCrmAdmin, ultimosProspectos } from './adminResumen'

function datosVacios(): AtencionAdminData {
  return { alertas: [], solicitudes: [], recuperaciones: [] }
}

describe('calcularAtencionAdmin', () => {
  it('prioriza alertas críticas y cuenta solo pendientes', () => {
    const datos = datosVacios()
    datos.alertas = [
      {
        id: 1,
        estado: 'abierta',
        criticidad: 'alta',
        mensaje: 'Temperatura fuera de rango',
        tipo: 'temperatura',
        fecha_creacion: '2026-09-04T12:00:00.000Z',
        galpon: { id: 1, nombre: 'Galpón 1', codigo: 'G-01', granja: { id: 1, nombre: 'La Esperanza', propietario_id: 2 } },
      } as unknown as AtencionAdminData['alertas'][number],
      {
        id: 2,
        estado: 'cerrada',
        criticidad: 'alta',
        mensaje: 'Alerta resuelta',
        tipo: 'humedad',
        fecha_creacion: '2026-09-04T13:00:00.000Z',
        galpon: { id: 2, nombre: 'Galpón 2', codigo: 'G-02', granja: { id: 1, nombre: 'La Esperanza', propietario_id: 2 } },
      } as unknown as AtencionAdminData['alertas'][number],
    ]
    datos.solicitudes = [
      {
        id: 4,
        estado: 'abierta',
        categoria: 'Petición',
        asunto: 'Solicitud comercial',
        fecha_creacion: '2026-09-04T14:00:00.000Z',
        prospecto: { id: 3, nombre: 'Ana', email: 'ana@example.com' },
      } as unknown as AtencionAdminData['solicitudes'][number],
    ]

    const resumen = calcularAtencionAdmin(datos)

    expect(resumen.alertasCriticas).toBe(1)
    expect(resumen.solicitudesPendientes).toBe(1)
    expect(resumen.items).toHaveLength(2)
    expect(resumen.items[0]).toMatchObject({ tipo: 'alerta', ruta: '/alertas' })
  })

  it('incluye recuperaciones pendientes y omite las completadas', () => {
    const datos = datosVacios()
    datos.recuperaciones = [
      {
        id: 8,
        estado: 'pendiente',
        fecha_creacion: '2026-09-04T09:00:00.000Z',
        usuario: { id: 7, nombre_completo: 'Luis Pérez', email: 'luis@example.com' },
      } as unknown as AtencionAdminData['recuperaciones'][number],
      {
        id: 9,
        estado: 'completada',
        fecha_creacion: '2026-09-04T10:00:00.000Z',
        usuario: { id: 8, nombre_completo: 'Marta Díaz', email: 'marta@example.com' },
      } as unknown as AtencionAdminData['recuperaciones'][number],
    ]

    const resumen = calcularAtencionAdmin(datos)

    expect(resumen.recuperacionesPendientes).toBe(1)
    expect(resumen.items).toHaveLength(1)
    expect(resumen.items[0]).toMatchObject({ tipo: 'recuperacion', ruta: '/usuarios' })
  })
})

// ─── KPIs de la portada del administrador ────────────────────────────────────

import type { Organizacion } from '@features/organizaciones/api/organizaciones'
import type { Usuario } from '@shared/api'
import type { ConectividadPlataforma } from './conectividad'
import { calcularKpisAdmin, type ResumenAtencionAdmin } from './adminResumen'

function organizacion(id: number, activa = true): Organizacion {
  return {
    id, nombre: `Cliente ${id}`, nit: null, plan: 'free', activa,
    fecha_creacion: '2026-08-26T14:51:59.674Z',
    _count: { granjas: 1, usuarios: 2 },
  }
}

function usuario(id: number, activo = true): Usuario {
  return { id, activo } as Usuario
}

function colaVacia(): ResumenAtencionAdmin {
  return { items: [], alertasCriticas: 0, solicitudesPendientes: 0, recuperacionesPendientes: 0 }
}

describe('calcularKpisAdmin', () => {
  it('la portada abre con los clientes, no con las granjas', () => {
    const kpis = calcularKpisAdmin(
      [organizacion(1), organizacion(2), organizacion(3, false)],
      [usuario(1), usuario(2, false)],
      colaVacia(),
      null,
    )
    expect(kpis[0].etiqueta).toBe('Organizaciones activas')
    expect(kpis[0].valor).toBe(2)
    expect(kpis[0].detalle).toBe('de 3 clientes registrados')
    expect(kpis[0].progreso).toBe(67)
  })

  it('los usuarios distinguen el total de los que tienen acceso', () => {
    const kpis = calcularKpisAdmin([], [usuario(1), usuario(2, false)], colaVacia(), null)
    expect(kpis[1].valor).toBe(2)
    expect(kpis[1].detalle).toBe('1 con acceso')
    expect(kpis[1].progresoTexto).toBe('1 de 2 con acceso')
  })

  it('la cola suma PQRS y contraseñas, que son las dos que exigen respuesta', () => {
    const cola = { ...colaVacia(), solicitudesPendientes: 3, recuperacionesPendientes: 2 }
    const kpis = calcularKpisAdmin([], [], cola, null)
    expect(kpis[2].valor).toBe(5)
    expect(kpis[2].detalle).toBe('3 PQRS · 2 contraseñas')
  })

  const red = (conectados: number, total: number): ConectividadPlataforma => ({
    ventana_minutos: 15, total, conectados, sin_reportar: total - conectados, nunca: 0, problemas: [],
  })

  it('sin controladores informa que no hay infraestructura instalada', () => {
    const kpis = calcularKpisAdmin([], [], colaVacia(), null)
    expect(kpis[3].valor).toBe('—')
    expect(kpis[3].detalle).toBe('Sin controladores instalados')
    expect(kpis[3].progreso).toBeNull()
  })

  it('cuenta en línea solo los controladores que reportaron dentro de la ventana', () => {
    const kpis = calcularKpisAdmin([], [], colaVacia(), red(2, 3))
    expect(kpis[3].etiqueta).toBe('Controladores en línea')
    expect(kpis[3].valor).toBe('2/3')
    expect(kpis[3].detalle).toBe('1 sin reportar en 15 min')
    expect(kpis[3].progreso).toBe(66.7)
  })

  it('con todos reportando lo dice explícitamente', () => {
    expect(calcularKpisAdmin([], [], colaVacia(), red(4, 4))[3].detalle).toBe('Todos reportan (últimos 15 min)')
  })

  it('si la consulta falló, avisa en vez de decir "0 en línea"', () => {
    const kpis = calcularKpisAdmin([], [], colaVacia(), null, true)
    expect(kpis[3].valor).toBe('—')
    expect(kpis[3].detalle).toBe('No se pudo consultar los controladores')
    expect(kpis[3].progreso).toBeNull()
  })
})

function prospecto(datos: Partial<Prospecto>): Prospecto {
  return {
    id: 1,
    nombre: 'Ana Pérez',
    telefono: null,
    email: null,
    canal_origen: 'web',
    clasificacion: null,
    estado: 'nuevo',
    fecha_inicio: '2026-10-01T10:00:00.000Z',
    ultima_actividad: '2026-10-01T10:00:00.000Z',
    ...datos,
  } as Prospecto
}

describe('ultimosProspectos', () => {
  it('ordena del más reciente al más antiguo y respeta el límite', () => {
    const lista = [
      prospecto({ id: 1, fecha_inicio: '2026-10-01T10:00:00.000Z' }),
      prospecto({ id: 2, fecha_inicio: '2026-10-03T10:00:00.000Z' }),
      prospecto({ id: 3, fecha_inicio: '2026-10-02T10:00:00.000Z' }),
    ]

    expect(ultimosProspectos(lista, 2).map((p) => p.id)).toEqual([2, 3])
  })

  it('no modifica el arreglo original', () => {
    const lista = [prospecto({ id: 1 }), prospecto({ id: 2, fecha_inicio: '2026-10-05T10:00:00.000Z' })]
    ultimosProspectos(lista)
    expect(lista.map((p) => p.id)).toEqual([1, 2])
  })

  it('usa el teléfono, luego el correo y nunca muestra una identidad de WhatsApp como número', () => {
    const [conTelefono] = ultimosProspectos([prospecto({ telefono: '3001234567', email: 'a@b.co' })])
    const [conCorreo] = ultimosProspectos([prospecto({ email: 'ana@finca.co' })])
    const [soloWhatsapp] = ultimosProspectos([prospecto({ telefono: 'CO.573001234567' })])
    const [sinNada] = ultimosProspectos([prospecto({})])

    expect(conTelefono.contacto).toBe('3001234567')
    expect(conCorreo.contacto).toBe('ana@finca.co')
    expect(soloWhatsapp.contacto).toBe('Usuario de WhatsApp')
    expect(sinNada.contacto).toBe('Sin contacto')
  })

  it('traduce el canal y la etapa con las reglas del CRM', () => {
    const [cerrado] = ultimosProspectos([prospecto({ canal_origen: 'whatsapp', estado: 'cerrado' })])
    const [caliente] = ultimosProspectos([prospecto({ canal_origen: null, clasificacion: 'caliente' })])
    const [sinNombre] = ultimosProspectos([prospecto({ nombre: null })])

    expect(cerrado).toMatchObject({ canal: 'WhatsApp', etapa: 'cerrado' })
    expect(caliente).toMatchObject({ canal: 'Otro canal', etapa: 'caliente' })
    expect(sinNombre.nombre).toBe('Prospecto sin nombre')
  })

  it('sin prospectos devuelve una lista vacía', () => {
    expect(ultimosProspectos([])).toEqual([])
  })
})

describe('embudo comercial del panel admin', () => {
  const lista = [
    prospecto({ id: 1, clasificacion: 'caliente', estado: 'cerrado', resultado_cierre: 'ganado' } as Partial<Prospecto>),
    prospecto({ id: 2, clasificacion: 'caliente', estado: 'cerrado', resultado_cierre: 'ganado' } as Partial<Prospecto>),
    prospecto({ id: 3, clasificacion: 'caliente' }),
    prospecto({ id: 4, clasificacion: 'frio' }),
    prospecto({ id: 5 }),
  ]

  it('da la misma conversión que la bandeja de Prospectos', () => {
    expect(calcularConversionCrm(lista)).toBe(resumirBandeja(lista.map(aProspectoVista)).conversionPct)
    expect(calcularConversionCrm(lista)).toBe(40)
  })

  it('no cuenta a los convertidos como calientes', () => {
    const etapas = Object.fromEntries(calcularEtapasCrmAdmin(lista).map((etapa) => [etapa.nombre, etapa.cantidad]))
    expect(etapas).toEqual({ Fríos: 2, Tibios: 0, Calientes: 1, Cerrados: 2 })
  })

  it('sin prospectos la conversión es cero', () => {
    expect(calcularConversionCrm([])).toBe(0)
  })
})
