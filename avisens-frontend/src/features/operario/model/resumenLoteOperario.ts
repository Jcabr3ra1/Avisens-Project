import { esDatoVerificado, fcrCreible } from '@features/dashboard/model/estadoLote'
import type { DashboardAlerta, DashboardIndicador } from '@features/dashboard/model/dashboard'

// Resumen del lote que la app Android muestra en el inicio del operario:
// aves vivas y muertas, último consumo, calidad de crianza (EPEF) y salud.
// Solo cálculos: los datos llegan de useResumenLoteOperario.

export type MortalidadLote = { id: number; lote_id: number; fecha: string; cantidad_aves: number }

export type ConsumoLote = {
  id: number
  lote_id: number
  fecha: string
  alimento_kg: number | string | null
  agua_litros: number | string | null
  alerta_agua_baja: boolean
}

export type EventoSanitarioLote = { id: number; lote_id: number; fecha: string; cantidad_aves: number | null }

export type EstadoSalud = 'sin_datos' | 'critico' | 'atencion' | 'seguimiento' | 'estable'

export type SaludLote = {
  estado: EstadoSalud
  etiqueta: string
  // Cuánto se llena la barra (0-100). Más lleno = mejor.
  progreso: number
  alertasActivas: number
  avesEnSeguimiento: number
}

const SALUD: Record<EstadoSalud, { etiqueta: string; progreso: number }> = {
  sin_datos: { etiqueta: 'Sin datos', progreso: 0 },
  critico: { etiqueta: 'Crítico', progreso: 25 },
  atencion: { etiqueta: 'Atención', progreso: 50 },
  seguimiento: { etiqueta: 'Seguimiento', progreso: 72 },
  estable: { etiqueta: 'Estable', progreso: 100 },
}

// Días que un evento sanitario mantiene el lote «en seguimiento».
export const DIAS_SEGUIMIENTO_SANITARIO = 7

const dia = (fecha: string) => fecha.slice(0, 10)

export function avesMuertasDelLote(loteId: number, registros: MortalidadLote[]): number {
  return registros
    .filter((registro) => registro.lote_id === loteId)
    .reduce((total, registro) => total + Number(registro.cantidad_aves || 0), 0)
}

export function avesVivas(cantidadInicial: number, muertas: number): number {
  return Math.max(0, cantidadInicial - muertas)
}

// El más reciente por fecha; si dos son del mismo día, el último anotado.
export function ultimoConsumoDelLote(loteId: number, consumos: ConsumoLote[]): ConsumoLote | null {
  return consumos
    .filter((consumo) => consumo.lote_id === loteId)
    .reduce<ConsumoLote | null>((ultimo, consumo) => {
      if (!ultimo) return consumo
      const comparacion = dia(consumo.fecha).localeCompare(dia(ultimo.fecha))
      return comparacion > 0 || (comparacion === 0 && consumo.id > ultimo.id) ? consumo : ultimo
    }, null)
}

export function numeroOpcional(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

export type CalidadCrianza =
  | { tipo: 'valor'; valor: number }
  | { tipo: 'fuera_de_rango' }
  | { tipo: 'sin_dato' }

// El EPEF sale del mismo cálculo que la conversión: si la conversión es
// imposible (p. ej. un consumo de prueba de 121.212 kg), el EPEF también lo
// es y no se muestra como cifra válida.
export function calidadCrianza(reciente: DashboardIndicador | null): CalidadCrianza {
  if (!reciente || !esDatoVerificado(reciente.estadoCalculo) || reciente.epef === null) return { tipo: 'sin_dato' }
  if (reciente.fcr !== null && !fcrCreible(reciente.fcr)) return { tipo: 'fuera_de_rango' }
  if (!Number.isFinite(reciente.epef) || reciente.epef < 0) return { tipo: 'fuera_de_rango' }
  return { tipo: 'valor', valor: Math.round(reciente.epef) }
}

function restarDias(fechaIso: string, dias: number): string {
  const fecha = new Date(`${fechaIso}T12:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() - dias)
  return fecha.toISOString().slice(0, 10)
}

// Misma regla que la app: manda la alerta activa más grave; sin alertas, un
// evento sanitario de los últimos 7 días deja el lote en seguimiento.
export function saludDelLote(params: {
  loteId: number
  galponId: number
  alertas: DashboardAlerta[]
  eventos: EventoSanitarioLote[]
  reciente: DashboardIndicador | null
  hoy: string
}): SaludLote {
  const { loteId, galponId, alertas, eventos, reciente, hoy } = params
  const activas = alertas.filter((alerta) => alerta.galponId === galponId && alerta.estado !== 'cerrada')
  const eventosLote = eventos.filter((evento) => evento.lote_id === loteId)
  const desde = restarDias(hoy, DIAS_SEGUIMIENTO_SANITARIO)
  const recientes = eventosLote.filter((evento) => dia(evento.fecha) >= desde && dia(evento.fecha) <= hoy)
  const critica = activas.some((alerta) => ['alta', 'critica'].includes(alerta.criticidad.toLowerCase()))

  let estado: EstadoSalud
  if (activas.length === 0 && eventosLote.length === 0 && !reciente) estado = 'sin_datos'
  else if (critica) estado = 'critico'
  else if (activas.length > 0) estado = 'atencion'
  else if (recientes.length > 0) estado = 'seguimiento'
  else estado = 'estable'

  return {
    estado,
    ...SALUD[estado],
    alertasActivas: activas.length,
    avesEnSeguimiento: recientes.reduce((total, evento) => total + (evento.cantidad_aves ?? 0), 0),
  }
}
