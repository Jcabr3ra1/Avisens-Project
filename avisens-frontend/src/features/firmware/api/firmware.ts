import { api } from '@shared/api/client'

export interface VersionFirmware {
  id: number
  version: string
  sha256: string
  tamano: number
  notas: string | null
  vigente: boolean
  fecha_creacion: string
}

export async function listarFirmware(): Promise<VersionFirmware[]> {
  const { data } = await api.get<VersionFirmware[]>('/firmware')
  return data
}

export async function subirFirmware(archivo: File, version: string, notas: string): Promise<VersionFirmware> {
  const { data } = await api.post<VersionFirmware>('/firmware', archivo, {
    params: { version, notas: notas.trim() || undefined },
    headers: { 'Content-Type': 'application/octet-stream' },
  })
  return data
}

export async function publicarFirmware(id: number): Promise<VersionFirmware> {
  const { data } = await api.patch<VersionFirmware>(`/firmware/${id}/publicar`)
  return data
}

export async function retirarFirmware(id: number): Promise<VersionFirmware> {
  const { data } = await api.patch<VersionFirmware>(`/firmware/${id}/retirar`)
  return data
}

export async function eliminarFirmware(id: number): Promise<void> {
  await api.delete(`/firmware/${id}`)
}
