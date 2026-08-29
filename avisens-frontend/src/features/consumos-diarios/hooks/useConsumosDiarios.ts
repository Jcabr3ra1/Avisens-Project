import { useCallback, useEffect, useState } from 'react'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import { listarTiposAlimento, type TipoAlimento } from '@shared/api/tipos-alimento'
import { mensajeDeError } from '@shared/utils/errores'
import { actualizarConsumoDiario, crearConsumoDiario, eliminarConsumoDiario, listarConsumosDiarios } from '../api/consumosDiarios'
import type { ConsumoDiario, CrearConsumoDiarioPayload } from '../model/consumoDiario'

export function useConsumosDiarios() {
  const [consumos, setConsumos] = useState<ConsumoDiario[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [tiposAlimento, setTiposAlimento] = useState<TipoAlimento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const recargar = useCallback(async () => {
    setCargando(true); setError('')
    try {
      const [consumosData, lotesData, tiposData] = await Promise.all([listarConsumosDiarios(), listarLotes(), listarTiposAlimento()])
      setConsumos(consumosData); setLotes(lotesData.filter((lote) => lote.estado === 'activo')); setTiposAlimento(tiposData.filter((tipo) => tipo.activo))
    } catch (err) { setError(mensajeDeError(err, 'No se pudieron cargar los consumos diarios.')) } finally { setCargando(false) }
  }, [])
  useEffect(() => { void recargar() }, [recargar])
  const crear = useCallback(async (payload: CrearConsumoDiarioPayload) => { const consumo = await crearConsumoDiario(payload); setConsumos((actuales) => [consumo, ...actuales]); return consumo }, [])
  const actualizar = useCallback(async (id: number, payload: CrearConsumoDiarioPayload) => { const consumo = await actualizarConsumoDiario(id, payload); setConsumos((actuales) => actuales.map((actual) => actual.id === id ? consumo : actual)); return consumo }, [])
  const eliminar = useCallback(async (id: number) => { await eliminarConsumoDiario(id); setConsumos((actuales) => actuales.filter((actual) => actual.id !== id)) }, [])
  return { consumos, lotes, tiposAlimento, cargando, error, recargar, crear, actualizar, eliminar }
}
