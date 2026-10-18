import { describe, expect, it } from 'vitest'
import type { Lote } from '@features/lotes/api/lotes'
import type { SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { DashboardIndicador } from '@features/dashboard/model/dashboard'
import type { GalponConLotes, GranjaConEstructura } from '../hooks/useEstructuraGranjas'
import { progresoDatos, proximoPaso, sensoresReportando, tarjetaGalpon } from './explorador'

const loteCompleto = {
  id: 9, codigo: 'LOT-9', fecha_ingreso: '2026-10-16', cantidad_inicial: 500, raza: null, sexo: 'macho',
  marca_alimento: 'italcol', linea_genetica: { id: 2, codigo: 'cobb_500', nombre: 'Cobb 500' },
  costo_pollito_unitario: null, presupuesto_total_cop: null, fecha_salida_estimada: null, fecha_salida_real: null,
  estado: 'activo', galpon: { id: 31, nombre: 'G', granja: { id: 1, nombre: 'el jaller', propietario_id: 56 } },
  proveedor: { id: 1, nombre: 'Italcol S.A.' },
} as Lote

function sensor(tipo: string, valor: number | null, estado: SensorVista['estado'] = 'optimo'): SensorVista {
  return { id: Math.random(), codigo: 'S', tipo, unidad: tipo === 'Temperatura' ? '°C' : '%', variableUmbral: null, valor, minUmbral: null, maxUmbral: null, estado, ultimaLecturaTs: null, x: null, y: null }
}

function galpon(cambios: Partial<GalponConLotes> = {}): GalponConLotes {
  return {
    id: 31, codigo: 'GAL-31', nombre: 'jallergalpon', granjaId: 1, activo: true, capacidadAves: 500,
    anchoMetros: 12, largoMetros: 100, loteActivo: null, diaVida: 3,
    origen: {
      id: 31, codigo: 'GAL-31', nombre: 'jallergalpon', capacidad_aves: 500, ancho_metros: 12, largo_metros: 100,
      orientacion: 'norte-sur', tipo_techo: 'zinc', plano_url: null, fecha_construccion: '2020-01-01', activo: true,
      granja: { id: 1, nombre: 'el jaller', propietario_id: 56 },
    },
    sensores: [sensor('Temperatura', 27.4), sensor('Humedad', 63.5)],
    estadoOperativo: 'normal', alertasAbiertas: 0, loteEnCurso: loteCompleto, lotes: [loteCompleto],
    ...cambios,
  } as GalponConLotes
}

const conPeso = { pesoPromedioG: 900 } as DashboardIndicador

describe('proximoPaso', () => {
  it('prioriza los datos del lote, luego las alertas y luego el pesaje', () => {
    const incompleto = { ...loteCompleto, linea_genetica: null }
    expect(proximoPaso(galpon({ loteEnCurso: incompleto }), conPeso)).toMatchObject({
      titulo: 'Completa los datos del lote', destino: { tipo: 'datos-lote' },
    })
    expect(proximoPaso(galpon({ alertasAbiertas: 2 }), conPeso)).toMatchObject({
      tono: 'alerta', titulo: 'Hay 2 alertas abiertas', destino: { tipo: 'ruta', ruta: '/alertas' },
    })
    expect(proximoPaso(galpon(), null)).toMatchObject({ titulo: 'Registra el primer pesaje', destino: { tipo: 'ruta', ruta: '/bitacora' } })
    const sinTecho = galpon()
    sinTecho.origen = { ...sinTecho.origen, tipo_techo: null }
    expect(proximoPaso(sinTecho, conPeso)).toMatchObject({ tono: 'ok' })
    expect(proximoPaso(galpon(), conPeso)).toMatchObject({ tono: 'ok', destino: { tipo: 'ruta', ruta: '/guia-crecimiento?lote=9' } })
  })

  it('explica un galpón vacío o inactivo sin proponer acciones', () => {
    expect(proximoPaso(galpon({ loteEnCurso: null }), null)).toMatchObject({ titulo: 'Galpón vacío', accion: null })
    expect(proximoPaso(galpon({ activo: false }), null)).toMatchObject({ titulo: 'Galpón inactivo', accion: null })
  })
})

describe('progresoDatos', () => {
  it('cuenta solo lo que completa el propietario: la granja y los lotes en curso', () => {
    const estructura = {
      granja: { id: 1, nombre: 'el jaller', direccion: null, municipio: null, departamento: null, latitud: null, longitud: null, area_total_m2: null, activa: true, fecha_creacion: '', propietario: { id: 56, nombre_completo: 'j' } },
      galpones: [galpon(), galpon({ id: 32, activo: false })],
      lotesActivos: 1, avesAlojadas: 500, alertasAbiertas: 0,
    } as GranjaConEstructura
    const progreso = progresoDatos(estructura)
    expect(progreso).toMatchObject({ completos: 1, total: 2 })
    expect(progreso.pendientes).toEqual([{ tipo: 'granja' }])
  })
})

describe('tarjetaGalpon', () => {
  it('resume estado, lote, lecturas y ocupación', () => {
    expect(tarjetaGalpon(galpon())).toMatchObject({
      estado: 'ok', etiquetaEstado: 'En orden', temperatura: '27,4 °C', humedad: '63,5 %', ocupacion: 100, aves: 500,
    })
    expect(tarjetaGalpon(galpon({ alertasAbiertas: 1 }))).toMatchObject({ estado: 'alerta', etiquetaEstado: '1 alerta' })
    expect(tarjetaGalpon(galpon({ loteEnCurso: null }))).toMatchObject({ estado: 'vacio', etiquetaEstado: 'Sin lote', lote: null })
  })

  it('cuenta los sensores que reportan', () => {
    expect(sensoresReportando(galpon({ sensores: [sensor('Temperatura', 27), sensor('Humedad', null, 'offline')] }))).toEqual({ reportando: 1, total: 2 })
  })
})
