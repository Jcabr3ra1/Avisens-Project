import type { EstadoLote, Lote } from '../api/lotes'

export type FiltroEstadoLote = EstadoLote | 'todos'

export interface ResumenLotesDatos {
  total: number
  activos: number
  finalizados: number
  inactivos: number
  avesAlojadas: number
}

export function calcularResumenLotes(lotes: Lote[]): ResumenLotesDatos {
  const activos = lotes.filter((lote) => lote.estado === 'activo')
  return {
    total: lotes.length,
    activos: activos.length,
    finalizados: lotes.filter((lote) => lote.estado === 'finalizado').length,
    inactivos: lotes.filter((lote) => lote.estado === 'inactivo').length,
    // Las que ingresaron a los lotes activos, no las que siguen vivas: la
    // mortalidad vive en los indicadores del lote y aquí no se consulta.
    // Se llamaba "avesActivas" y la pantalla decía "Aves activas", así que
    // con 5 % de mortalidad afirmaba tener 20.000 vivas habiendo 19.000.
    avesAlojadas: activos.reduce((total, lote) => total + lote.cantidad_inicial, 0),
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
      lote.galpon.nombre.toLowerCase().includes(termino)
    return coincideEstado && coincideBusqueda
  })
}

// Requisitos para dar de alta un lote: un galpón ACTIVO.
// Vive aquí, y no suelto en la página, porque la condición que habilita el
// botón y la que abre el formulario tienen que ser exactamente la misma.
// Cuando divergieron, un galpón inactivo dejaba el botón habilitado y el
// clic no hacía nada, sin decir por qué.
export type AltaDeLote = {
  puedeCrear: boolean
  motivoBloqueo: string | null
}

export function evaluarAltaDeLote(
  galponesDisponibles: { id?: number; activo: boolean }[],
  lotes?: Pick<Lote, 'estado' | 'galpon'>[],
): AltaDeLote {
  const galponesActivos = galponesDisponibles.filter((galpon) => galpon.activo)

  if (galponesActivos.length === 0) {
    return {
      puedeCrear: false,
      motivoBloqueo:
        galponesDisponibles.length > 0
          ? 'El galpón está inactivo. Actívalo desde Galpones para poder registrarle lotes.'
          : 'Necesitas un galpón activo antes de registrar lotes.',
    }
  }

  if (lotes) {
    const galponesConActivo = new Set(
      lotes.filter((lote) => lote.estado === 'activo').map((lote) => lote.galpon.id),
    )
    const disponiblesSinLote = galponesActivos.filter(
      (galpon) => galpon.id === undefined || !galponesConActivo.has(galpon.id),
    )
    if (disponiblesSinLote.length === 0) {
      return {
        puedeCrear: false,
        motivoBloqueo:
          galponesActivos.length === 1
            ? 'Este galpón ya tiene un lote activo. Debes cerrar el lote vigente antes de iniciar uno nuevo.'
            : 'Todos los galpones activos ya tienen un lote vigente. Cierra un lote antes de iniciar uno nuevo.',
      }
    }
  }

  return { puedeCrear: true, motivoBloqueo: null }
}
