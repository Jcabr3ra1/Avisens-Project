import { useCallback, useEffect, useMemo, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import {
  listarGalponesOperario,
  listarLotesOperario,
  registrarConsumoOperario,
  registrarMortalidadOperario,
  type RegistroConsumoOperario,
  type RegistroMortalidadOperario,
} from '../api/operario'
import { crearJornadasOperario } from '../model/jornadaOperario'

export function useJornadaOperario() {
  const [galpones, setGalpones] = useState<Awaited<ReturnType<typeof listarGalponesOperario>>>([])
  const [lotes, setLotes] = useState<Awaited<ReturnType<typeof listarLotesOperario>>>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')

    try {
      const [galponesData, lotesData] = await Promise.all([
        listarGalponesOperario(),
        listarLotesOperario(),
      ])
      setGalpones(galponesData)
      setLotes(lotesData)
    } catch (err) {
      setError(mensajeDeError(err, 'No fue posible cargar tu jornada.'))
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const registrarMortalidad = useCallback(async (
    loteId: number,
    registro: RegistroMortalidadOperario,
  ) => {
    setGuardando(true)
    setError('')
    setMensaje('')

    try {
      await registrarMortalidadOperario(loteId, registro)
      setMensaje('Mortalidad registrada correctamente.')
    } catch (err) {
      const mensajeError = mensajeDeError(err, 'No fue posible registrar la mortalidad.')
      setError(mensajeError)
      throw new Error(mensajeError)
    } finally {
      setGuardando(false)
    }
  }, [])

  const registrarConsumo = useCallback(async (
    loteId: number,
    registro: RegistroConsumoOperario,
  ) => {
    setGuardando(true)
    setError('')
    setMensaje('')

    try {
      await registrarConsumoOperario(loteId, registro)
      setMensaje('Consumo registrado correctamente.')
    } catch (err) {
      const mensajeError = mensajeDeError(err, 'No fue posible registrar el consumo.')
      setError(mensajeError)
      throw new Error(mensajeError)
    } finally {
      setGuardando(false)
    }
  }, [])

  const jornadas = useMemo(() => crearJornadasOperario(galpones, lotes), [galpones, lotes])

  return {
    jornadas,
    cargando,
    guardando,
    error,
    mensaje,
    recargar,
    registrarMortalidad,
    registrarConsumo,
  }
}
