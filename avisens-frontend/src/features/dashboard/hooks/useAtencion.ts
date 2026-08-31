import { useEffect, useMemo, useState } from 'react'
import { compararConCurva } from '@features/indicadores/api/indicadores'
import { useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { obtenerIndicadoresDeLote } from '../api/dashboard'
import type { DashboardAlerta, DashboardIndicador } from '../model/dashboard'
import {
  detallePorCriticidad,
  detallePorDesvio,
  detallePorSensores,
  detallePorTendencia,
  tonoPorAlertas,
  tonoPorDesvio,
  tonoPorMortalidad,
  tonoPorSensores,
  type ChipAtencion,
} from '../model/atencion'

type Args = {
  alertas: DashboardAlerta[]
  galponId: number | null
  loteId: number | null
}

export function useAtencion({ alertas, galponId, loteId }: Args) {
  const { galpones } = useMonitoreoAmbiental()
  const [indicadores, setIndicadores] = useState<DashboardIndicador[]>([])
  const [desvioPesoPct, setDesvioPesoPct] = useState<number | null>(null)

  useEffect(() => {
    if (loteId === null) {
      setIndicadores([])
      setDesvioPesoPct(null)
      return
    }
    let vigente = true

    void obtenerIndicadoresDeLote(loteId)
      .then((lista) => { if (vigente) setIndicadores(lista) })
      .catch(() => { if (vigente) setIndicadores([]) })

    // Sin curva objetivo sembrada el backend no puede comparar: se muestra
    // "sin curva objetivo", no un 0% que parecería estar en la meta.
    void compararConCurva(loteId)
      .then((c) => { if (vigente) setDesvioPesoPct(c.desvio_peso_pct) })
      .catch(() => { if (vigente) setDesvioPesoPct(null) })

    return () => { vigente = false }
  }, [loteId])

  return useMemo<ChipAtencion[]>(() => {
    const activas = alertas.filter((alerta) => alerta.estado !== 'cerrada')
    const altas = activas.filter((alerta) => alerta.criticidad === 'alta').length
    const medias = activas.filter((alerta) => alerta.criticidad === 'media').length

    const sensores = galpones.find((g) => g.id === galponId)?.sensores ?? []
    const fueraDeRango = sensores.filter(
      (s) => s.estado === 'critico' || s.estado === 'advertencia',
    ).length
    const offline = sensores.filter((s) => s.estado === 'offline').length

    const mortalidadHoy = indicadores[0]?.mortalidadAcumuladaPct ?? null
    const mortalidadAyer = indicadores[1]?.mortalidadAcumuladaPct ?? null

    return [
      {
        id: 'alertas',
        tono: tonoPorAlertas(activas.length),
        valor: String(activas.length),
        etiqueta: activas.length === 1 ? 'alerta activa' : 'alertas activas',
        detalle: detallePorCriticidad(altas, medias),
        destino: '/alertas',
      },
      {
        id: 'sensores',
        tono: tonoPorSensores(fueraDeRango, offline),
        valor: String(sensores.length),
        etiqueta: sensores.length === 1 ? 'sensor' : 'sensores',
        detalle: detallePorSensores(fueraDeRango, offline),
        destino: '/monitoreo',
      },
      {
        id: 'mortalidad',
        tono: tonoPorMortalidad(mortalidadHoy),
        valor: mortalidadHoy === null ? '—' : `${mortalidadHoy}%`,
        etiqueta: 'mortalidad',
        detalle: detallePorTendencia(mortalidadHoy, mortalidadAyer),
        destino: '/bitacora',
      },
      {
        id: 'curva',
        tono: tonoPorDesvio(desvioPesoPct),
        valor: desvioPesoPct === null ? '—' : `${desvioPesoPct > 0 ? '+' : ''}${desvioPesoPct}%`,
        etiqueta: 'vs. curva',
        detalle: detallePorDesvio(desvioPesoPct),
        destino: '/bitacora',
      },
    ]
  }, [alertas, galpones, galponId, indicadores, desvioPesoPct])
}
