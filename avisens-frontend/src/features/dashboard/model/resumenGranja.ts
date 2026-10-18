import { esCriticidadAlta, etiquetaCriticidad } from '@features/alertas/model/alerta'
import { tieneLecturaUtil, type GalponMonitoreoVista, type SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { diasDeVida, hace } from '@shared/utils/fechas'
import type { DashboardAlerta, DashboardGalpon, DashboardLote } from './dashboard'

export type KpiGranja = {
  id: 'galpones' | 'aves' | 'alertas' | 'sensores'
  etiqueta: string
  valor: string
  detalle: string
  progreso: number | null
  destino: string
}

export type TipoAtencionGranja = 'alerta' | 'sensor'

export type ItemAtencionGranja = {
  id: string
  tipo: TipoAtencionGranja
  critico: boolean
  etiqueta: string
  titulo: string
  detalle: string
  cuando: string | null
  orden: number
  galponId: number
}

export type FilaGalpon = {
  id: number
  nombre: string
  codigo: string
  activo: boolean
  lote: { codigo: string; dia: number; aves: number } | null
  alertas: number
  urgentes: number
  lecturas: string[]
}

const enteros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const unDecimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function plural(cantidad: number, singular: string, varios: string): string {
  return `${enteros.format(cantidad)} ${cantidad === 1 ? singular : varios}`
}

function porcentaje(parte: number, total: number): number | null {
  return total === 0 ? null : Math.round((parte / total) * 100)
}

export function lotesActivosDe(galpones: DashboardGalpon[], lotes: DashboardLote[]): DashboardLote[] {
  const ids = new Set(galpones.map((galpon) => galpon.id))
  return lotes.filter((lote) => lote.estado === 'activo' && ids.has(lote.galponId))
}

export function kpisGranja({ galpones, lotes, alertas, sensores }: {
  galpones: DashboardGalpon[]
  lotes: DashboardLote[]
  alertas: DashboardAlerta[]
  sensores: SensorVista[]
}): KpiGranja[] {
  const activos = galpones.filter((galpon) => galpon.activo)
  const lotesActivos = lotesActivosDe(galpones, lotes)
  const conLote = activos.filter((galpon) => lotesActivos.some((lote) => lote.galponId === galpon.id)).length
  const aves = lotesActivos.reduce((total, lote) => total + lote.cantidadInicial, 0)
  const abiertas = alertas.filter((alerta) => alerta.estado !== 'cerrada')
  const criticas = abiertas.filter((alerta) => esCriticidadAlta(alerta.criticidad)).length
  const conLectura = sensores.filter((sensor) => tieneLecturaUtil(sensor.estado)).length
  const sinSenal = sensores.filter((sensor) => sensor.estado === 'offline').length

  return [
    {
      id: 'galpones',
      etiqueta: 'Galpones con lote',
      valor: `${conLote}/${activos.length}`,
      detalle: activos.length === 0
        ? 'Sin galpones activos'
        : conLote === activos.length ? 'Todos en producción' : `${plural(activos.length - conLote, 'galpón', 'galpones')} sin lote`,
      progreso: porcentaje(conLote, activos.length),
      destino: '/granjas',
    },
    {
      id: 'aves',
      etiqueta: 'Aves alojadas',
      valor: enteros.format(aves),
      detalle: lotesActivos.length === 0 ? 'Sin lotes activos' : `Al ingreso · ${plural(lotesActivos.length, 'lote activo', 'lotes activos')}`,
      progreso: null,
      destino: '/granjas',
    },
    {
      id: 'alertas',
      etiqueta: 'Alertas abiertas',
      valor: enteros.format(abiertas.length),
      detalle: abiertas.length === 0 ? 'Sin incidencias' : criticas === 0 ? 'Ninguna crítica' : plural(criticas, 'crítica', 'críticas'),
      progreso: null,
      destino: '/granjas?pestana=alertas',
    },
    {
      id: 'sensores',
      etiqueta: 'Sensores con lectura',
      valor: `${conLectura}/${sensores.length}`,
      detalle: sensores.length === 0
        ? 'Sin sensores registrados'
        : sinSenal > 0 ? `${plural(sinSenal, 'sin señal', 'sin señal')}` : 'Todos reportando',
      progreso: porcentaje(conLectura, sensores.length),
      destino: '/granjas?pestana=ambiente',
    },
  ]
}

function valorSensor(sensor: SensorVista): string {
  return sensor.valor === null ? '—' : `${unDecimal.format(sensor.valor)} ${sensor.unidad}`.trim()
}

export function itemsAtencionGranja({ alertas, galpones, monitoreo, ahora = Date.now() }: {
  alertas: DashboardAlerta[]
  galpones: DashboardGalpon[]
  monitoreo: GalponMonitoreoVista[]
  ahora?: number
}): ItemAtencionGranja[] {
  const nombres = new Map(galpones.map((galpon) => [galpon.id, galpon.nombre]))
  const items: ItemAtencionGranja[] = []

  for (const alerta of alertas) {
    if (alerta.estado === 'cerrada' || !nombres.has(alerta.galponId)) continue
    const fecha = new Date(alerta.fechaCreacion).getTime()
    items.push({
      id: `alerta-${alerta.id}`,
      tipo: 'alerta',
      critico: esCriticidadAlta(alerta.criticidad),
      etiqueta: `Alerta ${etiquetaCriticidad(alerta.criticidad).toLowerCase()}`,
      titulo: alerta.mensaje ?? alerta.tipo,
      detalle: nombres.get(alerta.galponId) ?? '',
      cuando: Number.isNaN(fecha) ? null : hace(alerta.fechaCreacion),
      orden: Number.isNaN(fecha) ? 0 : fecha,
      galponId: alerta.galponId,
    })
  }

  for (const galpon of monitoreo) {
    if (!nombres.has(galpon.id)) continue
    for (const sensor of galpon.sensores) {
      const fueraDeRango = sensor.estado === 'critico' || sensor.estado === 'advertencia'
      if (!fueraDeRango && sensor.estado !== 'offline') continue
      const ultima = sensor.ultimaLecturaTs
      items.push({
        id: `sensor-${sensor.id}`,
        tipo: 'sensor',
        critico: sensor.estado === 'critico',
        etiqueta: fueraDeRango ? 'Fuera de rango' : 'Sin señal',
        titulo: fueraDeRango ? `${sensor.tipo} en ${valorSensor(sensor)}` : `${sensor.tipo} · ${sensor.codigo}`,
        detalle: fueraDeRango && sensor.minUmbral !== null && sensor.maxUmbral !== null
          ? `${galpon.nombre} · rango ${unDecimal.format(sensor.minUmbral)}–${unDecimal.format(sensor.maxUmbral)} ${sensor.unidad}`
          : ultima === null ? `${galpon.nombre} · nunca ha reportado` : galpon.nombre,
        cuando: ultima === null ? null : hace(new Date(ultima).toISOString()),
        orden: ultima ?? ahora - 365 * 86_400_000,
        galponId: galpon.id,
      })
    }
  }

  return items.sort((a, b) => Number(b.critico) - Number(a.critico) || b.orden - a.orden)
}

function lecturasDe(sensores: SensorVista[]): string[] {
  const elegir = (patron: RegExp) => sensores.find((sensor) => patron.test(sensor.tipo) && sensor.valor !== null)
  return [elegir(/temp/i), elegir(/hum/i)]
    .filter((sensor): sensor is SensorVista => sensor !== undefined)
    .map(valorSensor)
}

export function filasGalpones({ galpones, lotes, alertas, monitoreo, hoy = new Date() }: {
  galpones: DashboardGalpon[]
  lotes: DashboardLote[]
  alertas: DashboardAlerta[]
  monitoreo: GalponMonitoreoVista[]
  hoy?: Date
}): FilaGalpon[] {
  return [...galpones]
    .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, 'es'))
    .map((galpon) => {
      const lote = lotes.find((item) => item.galponId === galpon.id && item.estado === 'activo') ?? null
      const abiertas = alertas.filter((alerta) => alerta.galponId === galpon.id && alerta.estado !== 'cerrada')
      return {
        id: galpon.id,
        nombre: galpon.nombre,
        codigo: galpon.codigo,
        activo: galpon.activo,
        lote: lote
          ? { codigo: lote.codigo, dia: diasDeVida(lote.fechaIngreso, hoy), aves: lote.cantidadInicial }
          : null,
        alertas: abiertas.length,
        urgentes: abiertas.filter((alerta) => esCriticidadAlta(alerta.criticidad)).length,
        lecturas: lecturasDe(monitoreo.find((item) => item.id === galpon.id)?.sensores ?? []),
      }
    })
}
