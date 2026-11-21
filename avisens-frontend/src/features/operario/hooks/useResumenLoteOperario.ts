import { useCallback, useEffect, useState } from 'react'
import {
  listarConsumosOperario,
  listarEventosSanitariosOperario,
  listarMortalidadOperario,
} from '../api/operario'
import type { ConsumoLote, EventoSanitarioLote, MortalidadLote } from '../model/resumenLoteOperario'

// Mortalidad, consumos y eventos sanitarios de los galpones del operario. Se
// cargan una vez para todos sus lotes: cambiar de galpón no vuelve a pedir
// nada, solo filtra (resumenLoteOperario).
export function useResumenLoteOperario() {
  const [mortalidad, setMortalidad] = useState<MortalidadLote[]>([])
  const [consumos, setConsumos] = useState<ConsumoLote[]>([])
  const [eventos, setEventos] = useState<EventoSanitarioLote[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  const recargar = useCallback(async () => {
    setCargando(true)
    setError(false)
    // Cada fuente por separado: si una falla, las otras tarjetas se muestran.
    const [m, c, e] = await Promise.allSettled([
      listarMortalidadOperario(),
      listarConsumosOperario(),
      listarEventosSanitariosOperario(),
    ])
    if (m.status === 'fulfilled') setMortalidad(m.value)
    if (c.status === 'fulfilled') setConsumos(c.value)
    if (e.status === 'fulfilled') setEventos(e.value)
    setError([m, c, e].some((resultado) => resultado.status === 'rejected'))
    setCargando(false)
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { mortalidad, consumos, eventos, cargando, error, recargar }
}
