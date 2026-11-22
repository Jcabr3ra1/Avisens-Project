import type { GalponMonitoreoVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { tieneLecturaUtil } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { estadoGranja } from './estadoGranja'
import type { FilaGalpon, ItemAtencionGranja } from './resumenGranja'
import { lecturaVigente } from './tiempo'

export type TonoSemaforo = 'ok' | 'atencion' | 'critico' | 'sin_datos' | 'revisando'

export type EstadoSensores =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'listo'; total: number; vigentes: number }

export type Semaforo = {
  tono: TonoSemaforo
  titulo: string
  frase: string
  principal: ItemAtencionGranja | null
  otros: ItemAtencionGranja[]
  textoBoton: string | null
}

export function contarSensores(monitoreo: GalponMonitoreoVista[], ahora: number = Date.now()): { total: number; vigentes: number } {
  const sensores = monitoreo.flatMap((galpon) => galpon.sensores).filter((sensor) => !sensor.esEstado)
  return {
    total: sensores.length,
    vigentes: sensores.filter((sensor) => tieneLecturaUtil(sensor.estado) && lecturaVigente(sensor.ultimaLecturaTs, ahora)).length,
  }
}

export function fraseDePendiente(item: ItemAtencionGranja): string {
  const galpon = item.galponNombre ?? 'Galpón'
  const { lectura } = item

  if (item.tipo === 'sensor' && lectura) {
    const tipo = lectura.tipo.toLowerCase()
    if (lectura.sinSenal) return `${galpon}: sensor de ${tipo} sin señal`
    if (lectura.clase === 'temperatura' && lectura.direccion === 'alto') {
      return `${galpon}: temperatura ${item.critico ? 'muy alta' : 'alta'} (${lectura.valorTexto})`
    }
    if (lectura.clase === 'temperatura' && lectura.direccion === 'bajo') {
      return `${galpon}: temperatura ${item.critico ? 'muy baja' : 'baja'} (${lectura.valorTexto})`
    }
    if (lectura.clase === 'humedad' && lectura.direccion === 'alto') {
      return `${galpon}: humedad ${item.critico ? 'muy alta' : 'alta'} (${lectura.valorTexto})`
    }
    if (lectura.clase === 'humedad' && lectura.direccion === 'bajo') {
      return `${galpon}: humedad ${item.critico ? 'muy baja' : 'baja'} (${lectura.valorTexto})`
    }
    return `${galpon}: ${tipo} fuera de rango (${lectura.valorTexto})`
  }

  if (item.galponNombre && !item.titulo.includes(item.galponNombre)) return `${item.galponNombre}: ${item.titulo}`
  return item.titulo
}

export function textoBotonPendiente(item: ItemAtencionGranja): string {
  if (item.tipo === 'crecimiento' && item.regla === 'pesaje_atrasado') return 'Registrar pesaje'
  if (item.tipo === 'crecimiento') return 'Ver guía de crecimiento'
  return item.galponNombre ? `Revisar ${item.galponNombre}` : 'Revisar'
}

export function destinoPendiente(item: ItemAtencionGranja, granjaId: number | null): string {
  const enGalpon = (pestana: string, extra = '') =>
    `/granjas?granjaId=${granjaId ?? ''}&galpon=${item.galponId}&pestana=${pestana}${extra}`
  if (item.tipo === 'crecimiento' && item.regla === 'pesaje_atrasado') return enGalpon('bitacora', '&vista=peso')
  if (item.tipo === 'crecimiento') {
    return item.loteId !== undefined ? `/guia-crecimiento?lote=${item.loteId}` : '/guia-crecimiento'
  }
  return enGalpon(item.tipo === 'alerta' ? 'alertas' : 'ambiente')
}

export function semaforoGeneral({ atencion, filas, sensores, revisando = false }: {
  atencion: ItemAtencionGranja[]
  filas: FilaGalpon[]
  sensores: EstadoSensores
  revisando?: boolean
}): Semaforo {
  const base = estadoGranja({
    atencion,
    filas,
    sensores: sensores.estado === 'listo' ? sensores.total : undefined,
  })
  const principalBase = base.accion?.tipo === 'atencion' ? base.accion.item : null
  const otrosDe = (principal: ItemAtencionGranja | null) => atencion.filter((item) => item !== principal)

  if (base.tono === 'critico' && principalBase) {
    return {
      tono: 'critico',
      titulo: 'Atención urgente',
      frase: fraseDePendiente(principalBase),
      principal: principalBase,
      otros: otrosDe(principalBase),
      textoBoton: textoBotonPendiente(principalBase),
    }
  }

  const hayLote = filas.some((fila) => fila.activo && fila.lote)
  const soloSensores = atencion.every((item) => item.tipo === 'sensor')
  const sinSenal = sensores.estado === 'error'
    || (sensores.estado === 'listo' && (sensores.total === 0 || sensores.vigentes === 0))
  const sinDatos = sinSenal && soloSensores && hayLote

  if (atencion.length > 0 && !sinDatos) {
    const principal = principalBase ?? atencion[0]
    return {
      tono: 'atencion',
      titulo: 'Requiere revisión',
      frase: fraseDePendiente(principal),
      principal,
      otros: otrosDe(principal),
      textoBoton: textoBotonPendiente(principal),
    }
  }

  if (revisando || sensores.estado === 'cargando') {
    return {
      tono: 'revisando',
      titulo: 'Revisando galpones…',
      frase: 'Consultando sensores y alertas.',
      principal: null,
      otros: [],
      textoBoton: null,
    }
  }

  if (sinDatos) {
    const principal = principalBase ?? atencion[0] ?? null
    const frase = sensores.estado === 'error'
      ? 'No fue posible consultar los sensores. Verifica el lote en persona.'
      : sensores.total === 0
        ? 'Los galpones no tienen sensores conectados.'
        : 'Los sensores no reportan desde hace más de 30 min. Revisa el Wi-Fi o la energía.'
    return {
      tono: 'sin_datos',
      titulo: 'Sin datos de sensores',
      frase,
      principal,
      otros: otrosDe(principal),
      textoBoton: principal ? textoBotonPendiente(principal) : null,
    }
  }

  if (!hayLote) {
    return {
      tono: 'ok',
      titulo: 'Sin lotes en curso',
      frase: 'Ningún galpón tiene un lote activo.',
      principal: null,
      otros: [],
      textoBoton: null,
    }
  }

  return {
    tono: 'ok',
    titulo: 'Todo en orden',
    frase: 'Ningún galpón requiere atención.',
    principal: null,
    otros: [],
    textoBoton: null,
  }
}
