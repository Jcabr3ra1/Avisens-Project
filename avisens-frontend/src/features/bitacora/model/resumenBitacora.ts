import type { ConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
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
      principal: `${registro.peso_promedio_g.toLocaleString('es-CO')} g`,
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
