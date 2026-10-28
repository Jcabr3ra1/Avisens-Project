import type { Lote } from '@features/lotes/api/lotes'
import { tieneLecturaUtil } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { DashboardIndicador } from '@features/dashboard/model/dashboard'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import type { ProblemaCurva } from '@features/guia-crecimiento/model/proyeccion'
import type { GalponConLotes, GranjaConEstructura } from '../hooks/useEstructuraGranjas'
import { faltantesGranja, faltantesLote, textoFaltantes } from '../model/datosDescriptivos'
import { diasDeVida, lecturaPorTipo, porcentajeOcupacion } from '../model/estructura'

export type DestinoPaso =
  | { tipo: 'datos-lote'; lote: Lote }
  | { tipo: 'ruta'; ruta: string }
  | { tipo: 'ninguno' }

export type ProximoPaso = {
  tono: 'ok' | 'atencion' | 'alerta' | 'info'
  titulo: string
  detalle: string
  accion: string | null
  destino: DestinoPaso
}

export type PendienteDatos =
  | { tipo: 'granja' }
  | { tipo: 'lote'; lote: Lote }

export type ProgresoDatos = { completos: number; total: number; pendientes: PendienteDatos[] }

export type TarjetaGalpon = {
  estado: 'ok' | 'atencion' | 'alerta' | 'vacio' | 'inactivo'
  etiquetaEstado: string
  lote: string | null
  temperatura: string | null
  humedad: string | null
  ocupacion: number | null
  aves: number
}

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

const PESAJES_PARA_PROYECTAR = 3

export function pesajesDelLote(estado: {
  curva: CurvaCrecimiento | null
  problema: ProblemaCurva | null
  cargando: boolean
}): number | null {
  if (estado.cargando) return null
  if (estado.problema?.tipo === 'sin_pesajes') return 0
  return estado.curva ? estado.curva.modelo.puntos_usados : null
}

export function proximoPaso(
  galpon: GalponConLotes,
  indicador: DashboardIndicador | null,
  pesajesRegistrados: number | null = null,
): ProximoPaso {
  const lote = galpon.loteEnCurso
  if (!galpon.activo) {
    return { tono: 'info', titulo: 'Galpón inactivo', detalle: 'No recibe lotes ni registra lecturas.', accion: null, destino: { tipo: 'ninguno' } }
  }
  if (!lote) {
    return {
      tono: 'info',
      titulo: 'Galpón vacío',
      detalle: 'Cuando llegue el próximo lote, el administrador lo registrará y aparecerá aquí.',
      accion: null,
      destino: { tipo: 'ninguno' },
    }
  }
  const faltanLote = faltantesLote(lote)
  if (faltanLote.length > 0) {
    return {
      tono: 'atencion',
      titulo: 'Completa los datos del lote',
      detalle: `${textoFaltantes(faltanLote)}. Sin ellos la proyección no tiene contra qué compararse.`,
      accion: 'Completar datos',
      destino: { tipo: 'datos-lote', lote },
    }
  }
  if (galpon.alertasAbiertas > 0) {
    return {
      tono: 'alerta',
      titulo: galpon.alertasAbiertas === 1 ? 'Hay una alerta abierta' : `Hay ${galpon.alertasAbiertas} alertas abiertas`,
      detalle: 'Revísala y registra lo que hiciste para cerrarla.',
      accion: 'Ver alertas',
      destino: { tipo: 'ruta', ruta: '/alertas' },
    }
  }
  const pesajes = pesajesRegistrados ?? (indicador?.pesoPromedioG == null ? 0 : PESAJES_PARA_PROYECTAR)
  if (pesajes === 0) {
    return {
      tono: 'atencion',
      titulo: 'Registra el primer pesaje',
      detalle: 'Con tres pesajes en días distintos se proyecta la curva del lote hasta el día de salida.',
      accion: 'Ir a la bitácora',
      destino: { tipo: 'ruta', ruta: '/bitacora' },
    }
  }
  if (pesajes < PESAJES_PARA_PROYECTAR) {
    const faltan = PESAJES_PARA_PROYECTAR - pesajes
    return {
      tono: 'atencion',
      titulo: faltan === 1 ? 'Registra 1 pesaje más' : `Registra ${faltan} pesajes más`,
      detalle: `Llevas ${pesajes} ${pesajes === 1 ? 'pesaje' : 'pesajes'}. Con pesajes de tres días distintos se proyecta la curva del lote hasta el día de salida.`,
      accion: 'Ir a la bitácora',
      destino: { tipo: 'ruta', ruta: '/bitacora' },
    }
  }
  return {
    tono: 'ok',
    titulo: 'Todo al día',
    detalle: 'Revisa en la Guía de peso cómo va la curva frente al estándar.',
    accion: 'Abrir guía de peso',
    destino: { tipo: 'ruta', ruta: `/guia-crecimiento?lote=${lote.id}` },
  }
}

export function progresoDatos(granja: GranjaConEstructura): ProgresoDatos {
  const pendientes: PendienteDatos[] = []
  let total = 1
  if (faltantesGranja(granja.granja).length > 0) pendientes.push({ tipo: 'granja' })
  for (const galpon of granja.galpones) {
    if (!galpon.activo) continue
    if (galpon.loteEnCurso) {
      total += 1
      if (faltantesLote(galpon.loteEnCurso).length > 0) pendientes.push({ tipo: 'lote', lote: galpon.loteEnCurso })
    }
  }
  return { completos: total - pendientes.length, total, pendientes }
}

export function tarjetaGalpon(galpon: GalponConLotes): TarjetaGalpon {
  const temperatura = lecturaPorTipo(galpon.sensores, 'temp')
  const humedad = lecturaPorTipo(galpon.sensores, 'hum')
  const lote = galpon.loteEnCurso
  const aves = lote?.cantidad_inicial ?? 0
  const estado: TarjetaGalpon['estado'] = !galpon.activo
    ? 'inactivo'
    : galpon.alertasAbiertas > 0 || galpon.estadoOperativo === 'alerta'
      ? 'alerta'
      : galpon.estadoOperativo === 'atencion'
        ? 'atencion'
        : lote ? 'ok' : 'vacio'
  const etiquetas: Record<TarjetaGalpon['estado'], string> = {
    ok: 'En orden',
    atencion: 'Atención',
    alerta: galpon.alertasAbiertas > 0 ? `${galpon.alertasAbiertas} ${galpon.alertasAbiertas === 1 ? 'alerta' : 'alertas'}` : 'Alerta',
    vacio: 'Sin lote',
    inactivo: 'Inactivo',
  }
  return {
    estado,
    etiquetaEstado: etiquetas[estado],
    lote: lote ? `${lote.codigo} · día ${diasDeVida(lote.fecha_ingreso)}` : null,
    temperatura: temperatura?.valor != null ? `${decimal.format(temperatura.valor)} ${temperatura.unidad}` : null,
    humedad: humedad?.valor != null ? `${decimal.format(humedad.valor)} ${humedad.unidad}` : null,
    ocupacion: lote ? porcentajeOcupacion(aves, galpon.capacidadAves) : null,
    aves,
  }
}

export function sensoresReportando(galpon: GalponConLotes): { reportando: number; total: number } {
  return {
    reportando: galpon.sensores.filter((sensor) => tieneLecturaUtil(sensor.estado)).length,
    total: galpon.sensores.length,
  }
}
