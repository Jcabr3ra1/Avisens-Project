import { type Usuario } from '@shared/api'
import { listarUsuarios } from '@features/usuarios/api/usuarios'
import { listarProspectos, type Prospecto } from '@features/crm/api/prospectos'
import { listarGranjas, type Granja } from '@features/granjas/api/granjas'

export function cargarGestionAdmin(): Promise<[Usuario[], Granja[]]> {
  return Promise.all([listarUsuarios(), listarGranjas()])
}

export function cargarProspectosAdmin(): Promise<{ data: Prospecto[] }> {
  return listarProspectos()
}
