import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  eliminarFirmware, listarFirmware, publicarFirmware, retirarFirmware, subirFirmware, type VersionFirmware,
} from '../api/firmware'

export function useFirmware() {
  const [versiones, setVersiones] = useState<VersionFirmware[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setVersiones(await listarFirmware())
    } catch (problema) {
      setError(mensajeDeError(problema, 'No se pudieron cargar las versiones de firmware.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const ejecutar = useCallback(async (accion: () => Promise<unknown>, respaldo: string) => {
    setError('')
    try {
      await accion()
      await recargar()
      return true
    } catch (problema) {
      setError(mensajeDeError(problema, respaldo))
      return false
    }
  }, [recargar])

  return {
    versiones,
    cargando,
    error,
    recargar,
    subir: (archivo: File, version: string, notas: string) =>
      ejecutar(() => subirFirmware(archivo, version, notas), 'No se pudo subir el firmware.'),
    publicar: (id: number) => ejecutar(() => publicarFirmware(id), 'No se pudo publicar la versión.'),
    retirar: (id: number) => ejecutar(() => retirarFirmware(id), 'No se pudo retirar la publicación.'),
    eliminar: (id: number) => ejecutar(() => eliminarFirmware(id), 'No se pudo eliminar la versión.'),
  }
}
