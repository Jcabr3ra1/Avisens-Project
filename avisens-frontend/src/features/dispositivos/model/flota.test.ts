import { describe, expect, it } from 'vitest'
import type { Galpon } from '@features/galpones/api/galpones'
import type { Dispositivo } from '../api/dispositivos'
import { agruparPorOrganizacion, atencionesFlota, cumpleFiltro, estadoDeConexion, filasFlota, resumenFlota } from './flota'

const ahora = Date.parse('2026-10-18T14:00:00Z')

const galpon = (id: number, organizacion: string, cambios: Partial<Galpon> = {}): Galpon => ({
  id, codigo: `GAL-${id}`, nombre: `Galpón ${id}`, capacidad_aves: null, ancho_metros: null, largo_metros: null,
  orientacion: null, tipo_techo: null, plano_url: null, fecha_construccion: null, activo: true,
  granja: { id: id * 10, nombre: `Granja ${id}`, propietario_id: 1, organizacion: { id: 1, nombre: organizacion } },
  ...cambios,
})

const dispositivo = (id: number, galponId: number, ultima: string | null, version: string | null = '1.1.1'): Dispositivo => ({
  id, codigo_topic: `GAL-${galponId}-ESP32-00${id}`, nombre: 'ESP32', version_firmware: version, estado: 'online',
  ip_local: null, ultima_conexion: ultima, activo: true, fecha_creacion: '2026-10-01T00:00:00Z',
  galpon: { id: galponId, nombre: `Galpón ${galponId}`, granja: { id: galponId * 10, propietario_id: 1 } },
})

describe('flota de controladores', () => {
  it('clasifica la conexión con la ventana de 15 minutos', () => {
    expect(estadoDeConexion('2026-10-18T13:50:00Z', ahora)).toBe('conectado')
    expect(estadoDeConexion('2026-10-18T13:30:00Z', ahora)).toBe('sin_reportar')
    expect(estadoDeConexion(null, ahora)).toBe('nunca')
  })

  it('arma una fila por galpón activo con su conexión más reciente', () => {
    const filas = filasFlota(
      [galpon(1, 'Jaller'), galpon(2, 'Jaller'), galpon(3, 'Otra', { activo: false })],
      [dispositivo(1, 1, '2026-10-18T13:20:00Z'), dispositivo(2, 1, '2026-10-18T13:55:00Z')],
      ahora,
    )

    expect(filas).toHaveLength(2)
    expect(filas[0].estado).toBe('conectado')
    expect(filas[0].ultimaConexion).toBe('2026-10-18T13:55:00Z')
    expect(filas[1].estado).toBe('sin_controlador')
  })

  it('agrupa por organización y filtra por cualquier nombre o código', () => {
    const filas = filasFlota([galpon(1, 'Zeta'), galpon(2, 'Alfa')], [dispositivo(1, 1, null)], ahora)

    expect(agruparPorOrganizacion(filas).map((grupo) => grupo.organizacion)).toEqual(['Alfa', 'Zeta'])
    expect(agruparPorOrganizacion(filas, 'esp32-001')).toHaveLength(1)
    expect(agruparPorOrganizacion(filas, 'nada')).toHaveLength(0)
  })

  it('cuenta cuántos controladores tienen el firmware publicado', () => {
    const filas = filasFlota([galpon(1, 'Jaller')], [dispositivo(1, 1, null, '1.1.1'), dispositivo(2, 1, null, '1.0.0')], ahora)

    expect(resumenFlota(filas, '1.1.1').alDia).toBe(1)
    expect(resumenFlota(filas, null).alDia).toBeNull()
  })
})

describe('atención y filtros de la flota', () => {
  it('prioriza lo que dejó de reportar sobre firmware y galpones vacíos', () => {
    const filas = filasFlota(
      [galpon(1, 'A'), galpon(2, 'A'), galpon(3, 'A')],
      [dispositivo(1, 1, '2026-10-18T13:55:00Z', '1.0.0'), dispositivo(2, 2, '2026-10-18T12:00:00Z')],
      ahora,
    )

    const atenciones = atencionesFlota(filas, '1.1.1')

    expect(atenciones.map((item) => item.tono)).toEqual(['critico', 'aviso', 'info'])
    expect(atenciones[0].titulo).toBe('Dejó de reportar')
    expect(cumpleFiltro(filas[0], 'en_linea')).toBe(true)
    expect(cumpleFiltro(filas[1], 'problemas')).toBe(true)
    expect(cumpleFiltro(filas[2], 'sin_controlador')).toBe(true)
  })
})
