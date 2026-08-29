import { listarUsuarios, type Usuario } from '@shared/api'
import { listarProspectos, type Prospecto } from '@features/crm/api/prospectos'
import { listarGranjas, type Granja } from '@features/granjas/api/granjas'

export function cargarGestionAdmin(): Promise<[Usuario[], Granja[]]> {
  return Promise.all([listarUsuarios(), listarGranjas()])
}

export function cargarProspectosAdmin(): Promise<{ data: Prospecto[] }> {
  return listarProspectos()
}
