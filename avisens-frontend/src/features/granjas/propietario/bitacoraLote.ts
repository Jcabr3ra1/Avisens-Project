import type { ConsumoDiario, CrearConsumoDiarioPayload } from '@features/consumos-diarios/api/consumosDiarios'
import type { FormularioConsumo } from '@features/consumos-diarios/model/consumoDiario'
import type { EventoSanitario, Mortalidad, Pesaje } from '@features/bitacora/model/bitacora'

export type TipoMovimiento = 'peso' | 'mortalidad' | 'sanitario' | 'consumo'

export type Movimiento = {
  clave: string
  tipo: TipoMovimiento
  id: number
  fecha: string
  titulo: string
  detalle: string
}

export type DiaMovimientos = { fecha: string; etiqueta: string; movimientos: Movimiento[] }

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

const EVENTOS: Record<string, string> = {
  vacunacion: 'Vacunación',
  medicacion: 'Medicación',
  tratamiento: 'Tratamiento',
  diagnostico: 'Diagnóstico',
  revision: 'Revisión',
}

export function lineaDeTiempo(
  loteId: number,
  pesajes: Pesaje[],
  mortalidad: Mortalidad[],
  sanitarios: EventoSanitario[],
  consumos: ConsumoDiario[],
): Movimiento[] {
  const delLote = <T extends { lote_id: number }>(lista: T[]) => lista.filter((item) => item.lote_id === loteId)
  const movimientos: Movimiento[] = [
    ...delLote(pesajes).map((p) => ({
      clave: `peso-${p.id}`, tipo: 'peso' as const, id: p.id, fecha: p.fecha.slice(0, 10),
      titulo: `Pesaje · ${entero.format(p.peso_promedio_g)} g por ave`,
      detalle: [p.cantidad_aves_pesadas ? `${entero.format(p.cantidad_aves_pesadas)} aves pesadas` : null, p.observaciones]
        .filter(Boolean).join(' · ') || 'Sin observaciones',
    })),
    ...delLote(mortalidad).map((m) => ({
      clave: `mortalidad-${m.id}`, tipo: 'mortalidad' as const, id: m.id, fecha: m.fecha.slice(0, 10),
      titulo: `Mortalidad · ${entero.format(m.cantidad_aves)} ${m.cantidad_aves === 1 ? 'ave' : 'aves'}`,
      detalle: m.causa_presuntiva || 'Sin causa registrada',
    })),
    ...delLote(sanitarios).map((s) => ({
      clave: `sanitario-${s.id}`, tipo: 'sanitario' as const, id: s.id, fecha: s.fecha.slice(0, 10),
      titulo: EVENTOS[s.tipo] ?? s.tipo,
      detalle: [s.producto, s.diagnostico].filter(Boolean).join(' · ') || 'Sin detalle',
    })),
    ...delLote(consumos).map((c) => ({
      clave: `consumo-${c.id}`, tipo: 'consumo' as const, id: c.id, fecha: c.fecha.slice(0, 10),
      titulo: `Consumo${c.alimento_kg ? ` · ${decimal.format(c.alimento_kg)} kg de alimento` : ''}`,
      detalle: [c.tipo_alimento?.nombre, c.agua_litros ? `${decimal.format(c.agua_litros)} L de agua` : null]
        .filter(Boolean).join(' · ') || 'Sin detalle',
    })),
  ]
  return movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
}

function etiquetaDia(fecha: string, hoy: Date): string {
  const dia = new Date(`${fecha}T12:00:00`)
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12)
  const diferencia = Math.round((base.getTime() - dia.getTime()) / 86_400_000)
  if (diferencia === 0) return 'Hoy'
  if (diferencia === 1) return 'Ayer'
  return dia.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function agruparPorDia(movimientos: Movimiento[], hoy: Date = new Date()): DiaMovimientos[] {
  const grupos: DiaMovimientos[] = []
  for (const movimiento of movimientos) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.fecha === movimiento.fecha) ultimo.movimientos.push(movimiento)
    else grupos.push({ fecha: movimiento.fecha, etiqueta: etiquetaDia(movimiento.fecha, hoy), movimientos: [movimiento] })
  }
  return grupos
}

export function formConsumoDesde(consumo: ConsumoDiario): FormularioConsumo {
  return {
    lote_id: String(consumo.lote_id),
    tipo_alimento_id: consumo.tipo_alimento_id ? String(consumo.tipo_alimento_id) : '',
    fecha: consumo.fecha.slice(0, 10),
    alimento_kg: consumo.alimento_kg?.toString() ?? '',
    agua_litros: consumo.agua_litros?.toString() ?? '',
  }
}

export function payloadConsumo(
  form: FormularioConsumo,
  loteId: number,
): { payload: CrearConsumoDiarioPayload; error: null } | { payload: null; error: string } {
  const alimento = form.alimento_kg ? Number(form.alimento_kg) : undefined
  const agua = form.agua_litros ? Number(form.agua_litros) : undefined
  if (!alimento && !agua) return { payload: null, error: 'Registra al menos el alimento o el agua consumida.' }
  if (alimento && !form.tipo_alimento_id) return { payload: null, error: 'Selecciona el tipo de alimento consumido.' }
  return {
    error: null,
    payload: {
      lote_id: loteId,
      fecha: form.fecha,
      tipo_alimento_id: form.tipo_alimento_id ? Number(form.tipo_alimento_id) : undefined,
      alimento_kg: alimento,
      agua_litros: agua,
      metodo_registro: 'manual',
    },
  }
}
