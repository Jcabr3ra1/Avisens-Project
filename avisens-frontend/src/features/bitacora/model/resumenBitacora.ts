import type { ConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import { formatearPeso } from '@features/guia-crecimiento/model/proyeccion'
import type { EventoSanitario, Mortalidad, Pesaje, TipoRegistro } from './bitacora'

export type VistaBitacora = 'resumen' | TipoRegistro | 'consumo'

export type ResumenBitacora = {
  ultimoPeso: Pesaje | undefined
  alimentoKg: number
  aguaLitros: number
  avesMuertas: number
  totalRegistros: number
}

export type FilaRegistro = {
  id: number
  fecha: string
  principal: string
  detalle: string
}

export type EventoRecienteBitacora = {
  clave: string
  tipo: Exclude<VistaBitacora, 'resumen'>
  etiqueta: string
  fecha: string
  principal: string
  detalle: string
  tono: 'primario' | 'peligro' | 'info' | 'ok'
}

export type SaludCicloLote = {
  diasCiclo: number
  progresoCicloPct: number
  avesVivas: number
  supervivenciaPct: number
  tonoSupervivencia: 'ok' | 'alerta' | 'peligro'
}

const DIAS_CICLO_REFERENCIA = 42

export function filtrarRegistrosPorLote<T extends { lote_id: number }>(
  registros: T[],
  loteId: number | null,
) {
  return registros.filter((registro) => registro.lote_id === loteId)
}

export function calcularResumenBitacora(
  pesajes: Pesaje[],
  mortalidad: Mortalidad[],
  sanitarios: EventoSanitario[],
  consumos: ConsumoDiario[],
): ResumenBitacora {
  return {
    ultimoPeso: pesajes[0],
    alimentoKg: consumos.reduce((total, consumo) => total + Number(consumo.alimento_kg ?? 0), 0),
    aguaLitros: consumos.reduce((total, consumo) => total + Number(consumo.agua_litros ?? 0), 0),
    avesMuertas: mortalidad.reduce((total, registro) => total + registro.cantidad_aves, 0),
    totalRegistros: pesajes.length + mortalidad.length + sanitarios.length + consumos.length,
  }
}

export function calcularSaludCicloLote(
  fechaIngreso: string,
  cantidadInicial: number,
  avesMuertas: number,
  hoy: Date = new Date(),
): SaludCicloLote {
  const inicio = new Date(`${fechaIngreso.slice(0, 10)}T12:00:00`)
  const msPorDia = 86_400_000
  const diferencia = Number.isNaN(inicio.getTime())
    ? 1
    : Math.floor((hoy.getTime() - inicio.getTime()) / msPorDia) + 1
  const diasCiclo = Math.max(1, diferencia)
  const progresoCicloPct = Math.min(100, Math.max(4, Math.round((diasCiclo / DIAS_CICLO_REFERENCIA) * 100)))
  const avesVivas = Math.max(0, cantidadInicial - avesMuertas)
  const supervivenciaPct =
    cantidadInicial > 0
      ? Math.max(0, Math.min(100, Number(((avesVivas / cantidadInicial) * 100).toFixed(1))))
      : 100
  const tonoSupervivencia =
    supervivenciaPct >= 96 ? 'ok' : supervivenciaPct >= 92 ? 'alerta' : 'peligro'

  return {
    diasCiclo,
    progresoCicloPct,
    avesVivas,
    supervivenciaPct,
    tonoSupervivencia,
  }
}

export function crearFilasRegistro(
  vista: VistaBitacora,
  pesajes: Pesaje[],
  mortalidad: Mortalidad[],
  sanitarios: EventoSanitario[],
): FilaRegistro[] {
  if (vista === 'peso') {
    return pesajes.map((registro) => ({
      id: registro.id,
      fecha: registro.fecha,
      principal: formatearPeso(registro.peso_promedio_g),
      detalle: registro.observaciones || 'Sin observaciones',
    }))
  }

  if (vista === 'mortalidad') {
    return mortalidad.map((registro) => ({
      id: registro.id,
      fecha: registro.fecha,
      principal: `${registro.cantidad_aves} aves`,
      detalle: registro.causa_presuntiva || 'Sin causa registrada',
    }))
  }

  if (vista === 'sanitario') {
    return sanitarios.map((registro) => ({
      id: registro.id,
      fecha: registro.fecha,
      principal: registro.tipo,
      detalle: registro.producto || registro.diagnostico || 'Sin detalle',
    }))
  }

  return []
}

export function crearActividadReciente(
  pesajes: Pesaje[],
  mortalidad: Mortalidad[],
  sanitarios: EventoSanitario[],
  consumos: ConsumoDiario[],
  limite = 6,
): EventoRecienteBitacora[] {
  const eventos: Array<EventoRecienteBitacora & { ordenId: number }> = [
    ...pesajes.map((item) => ({
      clave: `peso-${item.id}`,
      tipo: 'peso' as const,
      etiqueta: 'Pesaje',
      fecha: item.fecha,
      principal: formatearPeso(item.peso_promedio_g),
      detalle: item.observaciones || 'Control de crecimiento',
      tono: 'primario' as const,
      ordenId: item.id,
    })),
    ...mortalidad.map((item) => ({
      clave: `mortalidad-${item.id}`,
      tipo: 'mortalidad' as const,
      etiqueta: 'Mortalidad',
      fecha: item.fecha,
      principal: `${item.cantidad_aves.toLocaleString('es-CO')} ${item.cantidad_aves === 1 ? 'ave' : 'aves'}`,
      detalle: item.causa_presuntiva || 'Sin causa registrada',
      tono: 'peligro' as const,
      ordenId: item.id,
    })),
    ...sanitarios.map((item) => ({
      clave: `sanitario-${item.id}`,
      tipo: 'sanitario' as const,
      etiqueta: 'Sanidad',
      fecha: item.fecha,
      principal: item.tipo,
      detalle: item.producto || item.diagnostico || 'Evento sanitario registrado',
      tono: 'info' as const,
      ordenId: item.id,
    })),
    ...consumos.map((item) => {
      const partes: string[] = []
      if (item.alimento_kg !== null) partes.push(`${Number(item.alimento_kg).toLocaleString('es-CO')} kg`)
      if (item.agua_litros !== null) partes.push(`${Number(item.agua_litros).toLocaleString('es-CO')} L`)
      return {
        clave: `consumo-${item.id}`,
        tipo: 'consumo' as const,
        etiqueta: 'Consumo',
        fecha: item.fecha,
        principal: partes.length ? partes.join(' · ') : 'Consumo diario',
        detalle: item.tipo_alimento?.nombre || 'Alimento y agua diaria',
        tono: 'ok' as const,
        ordenId: item.id,
      }
    }),
  ]

  return eventos
    .sort((a, b) => {
      const fechaCmp = b.fecha.slice(0, 10).localeCompare(a.fecha.slice(0, 10))
      if (fechaCmp !== 0) return fechaCmp
      return b.ordenId - a.ordenId
    })
    .slice(0, limite)
    .map((item): EventoRecienteBitacora => ({
      clave: item.clave,
      tipo: item.tipo,
      etiqueta: item.etiqueta,
      fecha: item.fecha,
      principal: item.principal,
      detalle: item.detalle,
      tono: item.tono,
    }))
}
