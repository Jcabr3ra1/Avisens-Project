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
      detalle: `Tienes ${pesajes} de ${PESAJES_PARA_PROYECTAR} pesajes. Con pesajes de tres días distintos se proyecta la curva del lote hasta el día de salida.`,
      accion: 'Ir a la bitácora',
      destino: { tipo: 'ruta', ruta: '/bitacora' },
    }
  }
  return {
    tono: 'ok',
    titulo: 'Todo al día',
    detalle: `Tienes ${pesajes} de ${PESAJES_PARA_PROYECTAR} pesajes. Revisa en la Guía de peso cómo va la curva frente al estándar.`,
    accion: 'Abrir guía de peso',
    destino: { tipo: 'ruta', ruta: `/guia-crecimiento?lote=${lote.id}` },
  }
}

export function lotesActivosDeGalpon(galpon: GalponConLotes): Lote[] {
  if (Array.isArray(galpon.lotesEnCurso)) return galpon.lotesEnCurso
  return galpon.loteEnCurso ? [galpon.loteEnCurso] : []
}

export function progresoDatos(granja: GranjaConEstructura): ProgresoDatos {
  const pendientes: PendienteDatos[] = []
  let total = 1
  if (faltantesGranja(granja.granja).length > 0) pendientes.push({ tipo: 'granja' })
  for (const galpon of granja.galpones) {
    if (!galpon.activo) continue
    for (const lote of lotesActivosDeGalpon(galpon)) {
      total += 1
      if (faltantesLote(lote).length > 0) pendientes.push({ tipo: 'lote', lote })
    }
  }
  return { completos: total - pendientes.length, total, pendientes }
}

export function tarjetaGalpon(galpon: GalponConLotes): TarjetaGalpon {
  const temperatura = lecturaPorTipo(galpon.sensores, 'temp')
  const humedad = lecturaPorTipo(galpon.sensores, 'hum')
  const activos = lotesActivosDeGalpon(galpon)
  const lote = activos[0] ?? null
  const aves = activos.reduce((total, item) => total + item.cantidad_inicial, 0)
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
    lote:
      activos.length === 0
        ? null
        : activos.length === 1
          ? `${activos[0].codigo} · día ${diasDeVida(activos[0].fecha_ingreso)}`
          : `${activos.length} lotes activos`,
    temperatura: temperatura?.valor != null ? `${decimal.format(temperatura.valor)} ${temperatura.unidad}` : null,
    humedad: humedad?.valor != null ? `${decimal.format(humedad.valor)} ${humedad.unidad}` : null,
    ocupacion: activos.length > 0 ? porcentajeOcupacion(aves, galpon.capacidadAves) : null,
    aves,
  }
}

export function sensoresReportando(galpon: GalponConLotes): { reportando: number; total: number } {
  return {
    reportando: galpon.sensores.filter((sensor) => tieneLecturaUtil(sensor.estado)).length,
    total: galpon.sensores.length,
  }
}

export type FiltroGalponPropietario = 'todos' | 'con_lote' | 'alertas' | 'disponibles'

export type ResumenGalponesGranja = {
  total: number
  conLote: number
  conAlertas: number
  disponibles: number
  sensoresActivos: number
  sensoresTotal: number
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function tieneAlertaOAtencion(galpon: GalponConLotes): boolean {
  return galpon.alertasAbiertas > 0 || galpon.estadoOperativo === 'alerta' || galpon.estadoOperativo === 'atencion'
}

export function resumenGalponesGranja(galpones: GalponConLotes[]): ResumenGalponesGranja {
  let conLote = 0
  let conAlertas = 0
  let disponibles = 0
  let sensoresActivos = 0
  let sensoresTotal = 0

  for (const galpon of galpones) {
    if (galpon.loteEnCurso !== null) conLote += 1
    if (tieneAlertaOAtencion(galpon)) conAlertas += 1
    if (galpon.activo && galpon.loteEnCurso === null) disponibles += 1
    const cuenta = sensoresReportando(galpon)
    sensoresActivos += cuenta.reportando
    sensoresTotal += cuenta.total
  }

  return {
    total: galpones.length,
    conLote,
    conAlertas,
    disponibles,
    sensoresActivos,
    sensoresTotal,
  }
}

export function filtrarGalpones(
  galpones: GalponConLotes[],
  filtro: FiltroGalponPropietario,
  busqueda: string,
): GalponConLotes[] {
  const termino = normalizarTexto(busqueda)
  return galpones.filter((galpon) => {
    if (filtro === 'con_lote' && galpon.loteEnCurso === null) return false
    if (filtro === 'alertas' && !tieneAlertaOAtencion(galpon)) return false
    if (filtro === 'disponibles' && (!galpon.activo || galpon.loteEnCurso !== null)) return false
    if (!termino) return true
    const codigosLotes = lotesActivosDeGalpon(galpon).map((item) => item.codigo).join(' ')
    const texto = normalizarTexto([galpon.nombre, galpon.codigo, codigosLotes].join(' '))
    return texto.includes(termino)
  })
}

export function siguienteGalponPropietario(
  galpones: GalponConLotes[],
  actualId: number | null,
  tecla: string,
): number | null {
  if (galpones.length === 0) return null
  if (tecla === 'Home') return galpones[0].id
  if (tecla === 'End') return galpones[galpones.length - 1].id
  if (tecla !== 'ArrowDown' && tecla !== 'ArrowUp') return null
  const indice = galpones.findIndex((g) => g.id === actualId)
  if (indice === -1) return galpones[0].id
  const siguiente = tecla === 'ArrowDown'
    ? Math.min(galpones.length - 1, indice + 1)
    : Math.max(0, indice - 1)
  return galpones[siguiente].id
}
