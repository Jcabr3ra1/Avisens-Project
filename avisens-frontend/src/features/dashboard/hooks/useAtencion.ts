import { useMemo } from 'react'
import { useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { ComparacionIndicador } from '@features/indicadores/api/indicadores'
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
  indicadores: DashboardIndicador[]
  comparacion: ComparacionIndicador | null
}

export function useAtencion({ alertas, galponId, indicadores, comparacion }: Args) {
  const { galpones } = useMonitoreoAmbiental()
  const desvioPesoPct = comparacion?.desvio_peso_pct ?? null

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
