import { describe, expect, it } from 'vitest'
import type { AtencionAdminData } from '../api/admin'
import { calcularAtencionAdmin } from './adminResumen'

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
import type { GalponMonitoreoVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
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
      [],
    )
    expect(kpis[0].etiqueta).toBe('Organizaciones activas')
    expect(kpis[0].valor).toBe(2)
    expect(kpis[0].detalle).toBe('de 3 clientes registrados')
    expect(kpis[0].progreso).toBe(67)
  })

  it('los usuarios distinguen el total de los que tienen acceso', () => {
    const kpis = calcularKpisAdmin([], [usuario(1), usuario(2, false)], colaVacia(), [])
    expect(kpis[1].valor).toBe(2)
    expect(kpis[1].detalle).toBe('1 con acceso')
    expect(kpis[1].progresoTexto).toBe('1 de 2 con acceso')
  })

  it('la cola suma PQRS y contraseñas, que son las dos que exigen respuesta', () => {
    const cola = { ...colaVacia(), solicitudesPendientes: 3, recuperacionesPendientes: 2 }
    const kpis = calcularKpisAdmin([], [], cola, [])
    expect(kpis[2].valor).toBe(5)
    expect(kpis[2].detalle).toBe('3 PQRS · 2 contraseñas')
  })

  it('sin sensores informa que todavía no hay infraestructura instalada', () => {
    const kpis = calcularKpisAdmin([], [], colaVacia(), [])
    expect(kpis[3].valor).toBe('—')
    expect(kpis[3].detalle).toBe('Sin sensores instalados')
    expect(kpis[3].progreso).toBeNull()
  })

  it('cuenta en línea todo sensor que no esté offline', () => {
    const galpones = [
      { sensores: [{ estado: 'ok' }, { estado: 'offline' }, { estado: 'alerta' }] },
    ] as unknown as GalponMonitoreoVista[]
    const kpis = calcularKpisAdmin([], [], colaVacia(), galpones)
    expect(kpis[3].valor).toBe('2/3')
    expect(kpis[3].progreso).toBe(66.7)
  })
})
