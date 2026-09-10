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
