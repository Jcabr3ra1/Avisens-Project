import { listarTodasLasPaginas } from '@shared/api/paginacion'

export interface LineaGenetica {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  activo: boolean
  fecha_actualizacion: string
}

// Sin filtro de activo: el backend no lo ofrece, y FormularioLote necesita
// las inactivas igual para poder mostrar la que ya tiene asignada un lote
// (ver model/formularioLote.ts, opcionesLineaGenetica).
export async function listarLineasGeneticas(): Promise<LineaGenetica[]> {
  return listarTodasLasPaginas<LineaGenetica>('/lineas-geneticas')
}
