import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import { listarInsumos, type Insumo } from '@features/inventario/api/insumos'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import {
  actualizarEventoSanitario,
  crearEventoSanitario,
  eliminarEventoSanitario,
  listarEventosSanitarios,
  type ActualizarEventoSanitarioPayload,
  type CrearEventoSanitarioPayload,
  type EventoSanitario,
} from '../api/medicinas'

export function useMedicinas() {
  const [eventos, setEventos] = useState<EventoSanitario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [lotes, setLotes] = useState<Lote[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [avisoCatalogos, setAvisoCatalogos] = useState('')
  const [catalogosListos, setCatalogosListos] = useState(false)

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setEventos(await listarEventosSanitarios())
    } catch (errorCarga) {
      setError(mensajeDeError(errorCarga, 'No se pudo cargar el historial sanitario.'))
    } finally {
      setCargando(false)
    }
  }, [])

  const cargarCatalogos = useCallback(async () => {
    setAvisoCatalogos('')
    const [resultadoLotes, resultadoInsumos] = await Promise.allSettled([
      listarLotes(),
      listarInsumos(),
    ])
    if (resultadoLotes.status === 'fulfilled') setLotes(resultadoLotes.value)
    if (resultadoInsumos.status === 'fulfilled') setInsumos(resultadoInsumos.value)

    if (resultadoLotes.status === 'rejected') {
      setAvisoCatalogos('No se pudieron cargar los lotes, así que por ahora no se puede registrar.')
    } else if (resultadoInsumos.status === 'rejected') {
      setAvisoCatalogos('No se pudo cargar la bodega. Puedes registrar escribiendo el producto a mano.')
    }
    setCatalogosListos(true)
  }, [])

  useEffect(() => {
    void recargar()
    void cargarCatalogos()
  }, [recargar, cargarCatalogos])

  const guardar = useCallback(
    async (
      datos: CrearEventoSanitarioPayload | ActualizarEventoSanitarioPayload,
      editandoId: number | null,
    ) => {
      if (editandoId === null) await crearEventoSanitario(datos as CrearEventoSanitarioPayload)
      else await actualizarEventoSanitario(editandoId, datos)
      await recargar()
    },
    [recargar],
  )

  const eliminar = useCallback(
    async (evento: EventoSanitario) => {
      setError('')
      try {
        await eliminarEventoSanitario(evento.id)
        await recargar()
      } catch (errorAccion) {
        setError(mensajeDeError(errorAccion, 'No se pudo eliminar el registro.'))
      }
    },
    [recargar],
  )

  return {
    eventos,
    lotes,
    insumos,
    cargando,
    error,
    avisoCatalogos,
    catalogosListos,
    recargar,
    recargarCatalogos: cargarCatalogos,
    guardar,
    eliminar,
  }
}
