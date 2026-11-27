import type { GalponMonitoreoVista, SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { tieneLecturaUtil } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { DashboardLote } from './dashboard'
import { ventaDelLote } from './faena'
import { juicioTemperatura, type TonoJuicio } from './juicios'
import type { FilaGalpon } from './resumenGranja'
import { lecturaVigente, tiempoRelativo } from './tiempo'

export type TonoTarjeta = 'ok' | 'atencion' | 'critico' | 'sin_datos' | 'vacio'

export type TemperaturaTarjeta = {
  valorTexto: string
  palabra: string
  tono: TonoJuicio
  actualizado: string
  vigente: boolean
}

export type TarjetaGalpon = {
  id: number
  nombre: string
  tono: TonoTarjeta
  estado: string
  lote: { codigo: string; dia: number; diaTotal: number | null; aves: number } | null
  temperatura: TemperaturaTarjeta | null
}

const unDecimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

const GRAVEDAD: Partial<Record<SensorVista['estado'], number>> = { critico: 3, advertencia: 2 }

function sensorDeTemperatura(sensores: SensorVista[]): SensorVista | null {
  const candidatos = sensores.filter((sensor) =>
    !sensor.esEstado && sensor.variableUmbral === 'temperatura' && sensor.valor !== null && tieneLecturaUtil(sensor.estado))
  if (candidatos.length === 0) return null
  return [...candidatos].sort((a, b) =>
    (GRAVEDAD[b.estado] ?? 1) - (GRAVEDAD[a.estado] ?? 1) || (b.ultimaLecturaTs ?? 0) - (a.ultimaLecturaTs ?? 0))[0]
}

function textoActualizado(valorTexto: string, ts: number | null, vigente: boolean, ahora: number): string {
  if (vigente && ts !== null) return `Actualizado ${tiempoRelativo(ts, ahora)}`
  return ts === null ? `Última: ${valorTexto}` : `Última: ${valorTexto} · ${tiempoRelativo(ts, ahora)}`
}

export function temperaturaDeGalpon(sensores: SensorVista[], ahora: number = Date.now()): TemperaturaTarjeta | null {
  const sensor = sensorDeTemperatura(sensores)
  if (!sensor || sensor.valor === null) return null
  const vigente = lecturaVigente(sensor.ultimaLecturaTs, ahora)
  const juicio = juicioTemperatura({
    valor: sensor.valor,
    min: sensor.minUmbral,
    max: sensor.maxUmbral,
    severo: sensor.estado === 'critico',
  })
  const valorTexto = `${unDecimal.format(sensor.valor)} ${sensor.unidad}`.trim()
  return {
    valorTexto,
    palabra: vigente ? juicio.palabra : 'Sin señal',
    tono: vigente ? juicio.tono : 'sin_datos',
    actualizado: textoActualizado(valorTexto, sensor.ultimaLecturaTs, vigente, ahora),
    vigente,
  }
}

const ESTADO_TEXTO: Record<Exclude<TonoTarjeta, 'sin_datos'>, string> = {
  ok: 'En rango',
  atencion: 'Revisar',
  critico: 'Urgente',
  vacio: 'Sin lote',
}

function textoSinDatos(sensores: SensorVista[], ahora: number): string {
  const ambiente = sensores.filter((sensor) => !sensor.esEstado)
  if (ambiente.length === 0) return 'Sin sensores'
  const reportan = ambiente.some((sensor) => tieneLecturaUtil(sensor.estado) && lecturaVigente(sensor.ultimaLecturaTs, ahora))
  return reportan ? 'Sin temperatura' : 'Sin señal'
}

export function tarjetasGalpones({ filas, monitoreo, lotes, ahora = Date.now() }: {
  filas: FilaGalpon[]
  monitoreo: GalponMonitoreoVista[]
  lotes: DashboardLote[]
  ahora?: number
}): TarjetaGalpon[] {
  return filas
    .filter((fila) => fila.activo || fila.lote !== null)
    .map((fila) => {
      const sensores = monitoreo.find((galpon) => galpon.id === fila.id)?.sensores ?? []
      const temperatura = temperaturaDeGalpon(sensores, ahora)
      const loteActivo = lotes.find((lote) => lote.galponId === fila.id && lote.estado === 'activo') ?? null
      const venta = loteActivo ? ventaDelLote(loteActivo.fechaIngreso, loteActivo.fechaSalidaEstimada, new Date(ahora)) : null

      let tono: TonoTarjeta
      if (fila.urgentes > 0 || temperatura?.tono === 'critico') tono = 'critico'
      else if (fila.alertas > 0 || temperatura?.tono === 'atencion') tono = 'atencion'
      else if (!fila.lote) tono = 'vacio'
      else if (!temperatura || !temperatura.vigente) tono = 'sin_datos'
      else tono = 'ok'

      return {
        id: fila.id,
        nombre: fila.nombre,
        tono,
        estado: tono === 'sin_datos' ? textoSinDatos(sensores, ahora) : ESTADO_TEXTO[tono],
        lote: fila.lote
          ? { codigo: fila.lote.codigo, dia: fila.lote.dia, diaTotal: venta?.diaVenta ?? null, aves: fila.lote.aves }
          : null,
        temperatura,
      }
    })
}
