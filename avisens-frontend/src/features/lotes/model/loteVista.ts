import type { EstadoLote, Lote } from '../api/lotes'

export type FiltroEstadoLote = EstadoLote | 'todos'

export interface ResumenLotesDatos {
  total: number
  activos: number
  finalizados: number
  inactivos: number
  avesActivas: number
}

export function calcularResumenLotes(lotes: Lote[]): ResumenLotesDatos {
  const activos = lotes.filter((lote) => lote.estado === 'activo')
  return {
    total: lotes.length,
    activos: activos.length,
    finalizados: lotes.filter((lote) => lote.estado === 'finalizado').length,
    inactivos: lotes.filter((lote) => lote.estado === 'inactivo').length,
    avesActivas: activos.reduce((total, lote) => total + lote.cantidad_inicial, 0),
  }
}

export function filtrarLotes(
  lotes: Lote[],
  busqueda: string,
  estado: FiltroEstadoLote,
): Lote[] {
  const termino = busqueda.trim().toLowerCase()
  return lotes.filter((lote) => {
    const coincideEstado = estado === 'todos' || lote.estado === estado
    const coincideBusqueda =
      !termino ||
      lote.codigo.toLowerCase().includes(termino) ||
      lote.galpon.nombre.toLowerCase().includes(termino) ||
      lote.proveedor.nombre.toLowerCase().includes(termino)
    return coincideEstado && coincideBusqueda
  })
}

// Requisitos para dar de alta un lote: un galpón ACTIVO y un proveedor.
// Vive aquí, y no suelto en la página, porque la condición que habilita el
// botón y la que abre el formulario tienen que ser exactamente la misma.
// Cuando divergieron, un galpón inactivo dejaba el botón habilitado y el
// clic no hacía nada, sin decir por qué.
export type AltaDeLote = {
  puedeCrear: boolean
  motivoBloqueo: string | null
}

export function evaluarAltaDeLote(
  galponesDisponibles: { activo: boolean }[],
  hayProveedor: boolean,
): AltaDeLote {
  const hayGalponActivo = galponesDisponibles.some((galpon) => galpon.activo)

  if (!hayGalponActivo) {
    return {
      puedeCrear: false,
      motivoBloqueo:
        galponesDisponibles.length > 0
          ? 'El galpón está inactivo. Actívalo desde Galpones para poder registrarle lotes.'
          : 'Necesitas un galpón activo antes de registrar lotes.',
    }
  }

  if (!hayProveedor) {
    return {
      puedeCrear: false,
      motivoBloqueo:
        'No hay proveedores activos. Un administrador debe registrar uno antes de crear lotes.',
    }
  }

  return { puedeCrear: true, motivoBloqueo: null }
}
