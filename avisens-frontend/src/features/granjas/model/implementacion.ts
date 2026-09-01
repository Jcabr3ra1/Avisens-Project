import type { GalponMonitoreoVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { Granja, PropietarioGranja } from '../api/granjas'

// En qué punto de la puesta en marcha está cada propietario.
// El avance no se declara a mano: se deduce de lo que hay registrado
// —granja activa, galpones, lote en curso—, así que el tablero no puede
// desfasarse de la realidad.

export type EstadoImplementacionGranja = 'sin_granja' | 'sin_galpon' | 'sin_lote' | 'operativa'

export type TarjetaImplementacionGranja = {
  id: number
  nombre: string
  granjaId: number | null
  granjasActivas: number
  totalGalpones: number
  lotesActivos: number
}

export type EtapaImplementacionGranja = {
  id: EstadoImplementacionGranja
  titulo: string
  descripcion: string
  accion: string
  tarjetas: TarjetaImplementacionGranja[]
}

export function calcularEtapasImplementacionGranjas(
  propietarios: PropietarioGranja[],
  granjas: Granja[],
  galpones: GalponMonitoreoVista[],
): EtapaImplementacionGranja[] {
  const etapas: EtapaImplementacionGranja[] = [
    { id: 'sin_granja', titulo: 'Sin granja activa', descripcion: 'Requieren una asignación o activación.', accion: 'Asignar granja', tarjetas: [] },
    { id: 'sin_galpon', titulo: 'Pendiente de galpones', descripcion: 'La granja ya está asignada.', accion: 'Registrar galpón', tarjetas: [] },
    { id: 'sin_lote', titulo: 'Pendiente de lote', descripcion: 'Ya hay estructura física.', accion: 'Registrar lote', tarjetas: [] },
    { id: 'operativa', titulo: 'Producción activa', descripcion: 'Tienen al menos un lote activo.', accion: 'Ver producción', tarjetas: [] },
  ]
  const etapaPorId = new Map(etapas.map((etapa) => [etapa.id, etapa]))

  propietarios.forEach((propietario) => {
    const granjasActivas = granjas.filter((granja) => granja.propietario.id === propietario.id && granja.activa)
    const idsGranjasActivas = new Set(granjasActivas.map((granja) => granja.id))
    const galponesDelPropietario = galpones.filter((galpon) => idsGranjasActivas.has(galpon.granjaId))
    const lotesActivos = galponesDelPropietario.filter((galpon) => galpon.loteActivo !== null).length
    const estado: EstadoImplementacionGranja = granjasActivas.length === 0
      ? 'sin_granja'
      : galponesDelPropietario.length === 0
        ? 'sin_galpon'
        : lotesActivos === 0
          ? 'sin_lote'
          : 'operativa'

    etapaPorId.get(estado)?.tarjetas.push({
      id: propietario.id,
      nombre: propietario.nombre_completo,
      granjaId: granjasActivas[0]?.id ?? null,
      granjasActivas: granjasActivas.length,
      totalGalpones: galponesDelPropietario.length,
      lotesActivos,
    })
  })

  etapas.forEach((etapa) => etapa.tarjetas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CO')))
  return etapas
}
