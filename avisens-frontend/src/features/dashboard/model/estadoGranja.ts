import type { FilaGalpon, ItemAtencionGranja } from './resumenGranja'

export type TonoGranja = 'ok' | 'atencion' | 'critico'

export type AccionGranja =
  | { tipo: 'atencion'; item: ItemAtencionGranja }
  | { tipo: 'guia'; loteCodigo: string }

export type EstadoGranja = {
  tono: TonoGranja
  titulo: string
  detalle: string
  accion: AccionGranja | null
}

const enteros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

function cosas(cantidad: number): string {
  return cantidad === 1 ? '1 cosa' : `${cantidad} cosas`
}

function masUrgente(items: ItemAtencionGranja[]): ItemAtencionGranja | null {
  if (items.length === 0) return null
  return [...items].sort((a, b) => Number(b.critico) - Number(a.critico) || a.orden - b.orden)[0]
}

export function estadoGranja({ atencion, filas }: {
  atencion: ItemAtencionGranja[]
  filas: FilaGalpon[]
}): EstadoGranja {
  const principal = masUrgente(atencion)
  const urgentes = atencion.filter((item) => item.critico).length

  if (principal && urgentes > 0) {
    return {
      tono: 'critico',
      titulo: `Hay ${cosas(urgentes)} ${urgentes === 1 ? 'urgente' : 'urgentes'} en tu granja`,
      detalle: principal.titulo,
      accion: { tipo: 'atencion', item: principal },
    }
  }

  if (principal) {
    return {
      tono: 'atencion',
      titulo: `Hay ${cosas(atencion.length)} por revisar`,
      detalle: principal.titulo,
      accion: { tipo: 'atencion', item: principal },
    }
  }

  const conLote = filas.filter((fila) => fila.activo && fila.lote)
  if (conLote.length === 0) {
    return {
      tono: 'ok',
      titulo: 'Tu granja está lista para un lote nuevo',
      detalle: 'Todavía no hay un lote activo en tus galpones.',
      accion: null,
    }
  }

  const aves = conLote.reduce((total, fila) => total + (fila.lote?.aves ?? 0), 0)
  const unico = conLote.length === 1 ? conLote[0].lote : null
  return {
    tono: 'ok',
    titulo: 'Todo va bien hoy',
    detalle: unico
      ? `${unico.codigo} va en el día ${unico.dia} · ${enteros.format(unico.aves)} aves`
      : `${conLote.length} lotes activos · ${enteros.format(aves)} aves`,
    accion: unico ? { tipo: 'guia', loteCodigo: unico.codigo } : null,
  }
}
