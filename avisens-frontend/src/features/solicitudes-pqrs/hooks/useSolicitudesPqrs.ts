import { useCallback, useEffect, useState } from 'react'
import {
  eliminarSolicitudPqrs,
  listarSolicitudesPqrs,
  responderSolicitudPqrs,
} from '../api/solicitudesPqrs'
import type {
  ResponderSolicitudPqrsDto,
  SolicitudPqrs,
  SolicitudesPqrsQuery,
} from '../model/solicitudPqrs'

const POR_PAGINA = 100

export function useSolicitudesPqrs() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPqrs[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [filtros, setFiltros] = useState<SolicitudesPqrsQuery>({})

  const cargar = useCallback(async (query: SolicitudesPqrsQuery) => {
    setCargando(true)
    setError('')

    try {
      const { data } = await listarSolicitudesPqrs({
        ...query,
        limit: POR_PAGINA,
      })
      setSolicitudes(data)
    } catch {
      setError('No se pudieron cargar las solicitudes. Intenta actualizar la página.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar(filtros)
  }, [cargar, filtros])

  const aplicarFiltros = useCallback((nuevosFiltros: SolicitudesPqrsQuery) => {
    setMensaje('')
    setFiltros(nuevosFiltros)
  }, [])

  const recargar = useCallback(async () => {
    await cargar(filtros)
  }, [cargar, filtros])

  const responder = useCallback(
    async (id: number, datos: ResponderSolicitudPqrsDto) => {
      setError('')
      setMensaje('')

      try {
        await responderSolicitudPqrs(id, datos)
        await cargar(filtros)
        setMensaje('La solicitud fue actualizada correctamente.')
      } catch {
        setError('No se pudo actualizar la solicitud. Revisa la información e inténtalo de nuevo.')
        throw new Error('No se pudo actualizar la solicitud.')
      }
    },
    [cargar, filtros],
  )

  const eliminar = useCallback(
    async (id: number) => {
      setError('')
      setMensaje('')

      try {
        await eliminarSolicitudPqrs(id)
        await cargar(filtros)
        setMensaje('La solicitud fue eliminada correctamente.')
      } catch {
        setError('No se pudo eliminar la solicitud. Inténtalo de nuevo.')
        throw new Error('No se pudo eliminar la solicitud.')
      }
    },
    [cargar, filtros],
  )

  return {
    solicitudes,
    cargando,
    error,
    mensaje,
    filtros,
    aplicarFiltros,
    recargar,
    responder,
    eliminar,
  }
}
