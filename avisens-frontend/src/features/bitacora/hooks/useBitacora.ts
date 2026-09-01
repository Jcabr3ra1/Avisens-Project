import { useCallback, useEffect, useState } from 'react'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import { listarConsumosDiarios, type ConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import { mensajeDeError } from '@shared/utils/errores'
import { crearEventoSanitario, crearMortalidad, crearPesaje, eliminarEventoSanitario, eliminarMortalidad, eliminarPesaje, listarEventosSanitarios, listarMortalidad, listarPesajes } from '../api/bitacora'
import type { EventoSanitario, Mortalidad, Pesaje, TipoRegistro } from '../model/bitacora'

export function useBitacora() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [pesajes, setPesajes] = useState<Pesaje[]>([])
  const [mortalidad, setMortalidad] = useState<Mortalidad[]>([])
  const [sanitarios, setSanitarios] = useState<EventoSanitario[]>([])
  const [consumos, setConsumos] = useState<ConsumoDiario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')

    const [resultadoLotes, resultadoPesajes, resultadoMortalidad, resultadoSanitarios, resultadoConsumos] = await Promise.allSettled([
      listarLotes(),
      listarPesajes(),
      listarMortalidad(),
      listarEventosSanitarios(),
      listarConsumosDiarios(),
    ])

    if (resultadoLotes.status === 'fulfilled') {
      setLotes(resultadoLotes.value.filter((lote) => lote.estado === 'activo'))
    } else {
      setLotes([])
      setError(mensajeDeError(resultadoLotes.reason, 'No se pudieron cargar los lotes activos.'))
    }

    if (resultadoPesajes.status === 'fulfilled') setPesajes(resultadoPesajes.value)
    if (resultadoMortalidad.status === 'fulfilled') setMortalidad(resultadoMortalidad.value)
    if (resultadoSanitarios.status === 'fulfilled') setSanitarios(resultadoSanitarios.value)
    if (resultadoConsumos.status === 'fulfilled') setConsumos(resultadoConsumos.value)

    if (
      resultadoLotes.status === 'fulfilled' &&
      [resultadoPesajes, resultadoMortalidad, resultadoSanitarios, resultadoConsumos].some(
        (resultado) => resultado.status === 'rejected',
      )
    ) {
      setError('Algunos registros no se pudieron cargar. El lote activo sigue disponible.')
    }

    setCargando(false)
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const crear = async (tipo: TipoRegistro, datos: object) => {
    if (tipo === 'peso') {
      const registro = await crearPesaje(datos)
      setPesajes((actuales) => [registro, ...actuales])
    } else if (tipo === 'mortalidad') {
      const registro = await crearMortalidad(datos)
      setMortalidad((actuales) => [registro, ...actuales])
    } else {
      const registro = await crearEventoSanitario(datos)
      setSanitarios((actuales) => [registro, ...actuales])
    }
  }

  const eliminar = async (tipo: TipoRegistro, id: number) => {
    if (tipo === 'peso') {
      await eliminarPesaje(id)
      setPesajes((actuales) => actuales.filter((registro) => registro.id !== id))
    } else if (tipo === 'mortalidad') {
      await eliminarMortalidad(id)
      setMortalidad((actuales) => actuales.filter((registro) => registro.id !== id))
    } else {
      await eliminarEventoSanitario(id)
      setSanitarios((actuales) => actuales.filter((registro) => registro.id !== id))
    }
  }

  return { lotes, pesajes, mortalidad, sanitarios, consumos, cargando, error, recargar, crear, eliminar }
}
