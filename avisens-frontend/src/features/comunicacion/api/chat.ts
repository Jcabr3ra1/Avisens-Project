import { api } from '@shared/api/client'

export interface ContactoChat {
  id: number
  nombre_completo: string
  rol: string
  // Las iniciales vienen resueltas del backend: el avatar aparece en la lista
  // de contactos, en la de conversaciones y en cada burbuja, y calcularlo en
  // tres sitios es tres formas de que el mismo nombre salga distinto.
  iniciales: string
  organizacion_id: number | null
}

// Sin paginar: son las personas de una organización, no un listado abierto.
// Ya viene ordenado alfabéticamente y sin el propio solicitante.
export async function listarContactosChat(): Promise<ContactoChat[]> {
  const { data } = await api.get<ContactoChat[]>('/chat/contactos')
  return data
}
