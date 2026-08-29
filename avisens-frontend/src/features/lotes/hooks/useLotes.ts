import { useCallback, useEffect, useState } from 'react'
import { listarGalpones, type Galpon } from '@features/galpones/api/galpones'
import { listarProveedores, type Proveedor } from '@features/proveedores/api/proveedores'
import {
  activarLote,
  actualizarLote,
  crearLote,
  desactivarLote,
  eliminarLotePermanente,
  listarLotes,
  type ActualizarLotePayload,
  type CrearLotePayload,
  type Lote,
} from '../api/lotes'
import { obtenerMensajeError } from '../model/errorApi'

export function useLotes() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [lotesData, galponesData, proveedoresData] = await Promise.all([
        listarLotes(),
        listarGalpones(),
        listarProveedores(),
      ])
      setLotes(lotesData)
      setGalpones(galponesData)
      setProveedores(proveedoresData.filter((proveedor) => proveedor.activo))
    } catch (errorCarga) {
      setError(obtenerMensajeError(errorCarga, 'No se pudieron cargar los lotes.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const guardar = useCallback(
    async (
      datos: CrearLotePayload | ActualizarLotePayload,
      editandoId: number | null,
    ) => {
      if (editandoId === null) await crearLote(datos as CrearLotePayload)
      else await actualizarLote(editandoId, datos)
      await recargar()
    },
    [recargar],
  )

  const alternarActivo = useCallback(
    async (lote: Lote) => {
      setError('')
      try {
        if (lote.estado === 'activo') await desactivarLote(lote.id)
        else await activarLote(lote.id)
        await recargar()
      } catch (errorAccion) {
        setError(obtenerMensajeError(errorAccion, 'No se pudo cambiar el estado del lote.'))
      }
    },
    [recargar],
  )

  const eliminar = useCallback(
    async (lote: Lote) => {
      setError('')
      try {
        await eliminarLotePermanente(lote.id)
        await recargar()
      } catch (errorAccion) {
        setError(obtenerMensajeError(errorAccion, 'No se pudo eliminar el lote.'))
      }
    },
    [recargar],
  )

  return {
    lotes,
    galpones,
    proveedores,
    cargando,
    error,
    recargar,
    guardar,
    alternarActivo,
    eliminar,
  }
}
