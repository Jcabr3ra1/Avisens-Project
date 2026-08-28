import { useMemo } from 'react'
import { ETAPAS, type EtapaProspecto, type ProspectoVista } from '../model/prospectoVista'
import { diasDesde } from '../model/urgencia'

const DIAS_SIN_CONTACTO_URGENTE = 4

export type ResumenProspectos = {
  porEtapa: Record<EtapaProspecto, number>
  total: number
  activos: number
  conversionPct: number
  puntajePromedio: string
  urgentes: number
}

export function useResumenProspectos(prospectos: ProspectoVista[]): ResumenProspectos {
  return useMemo(() => {
    const porEtapa = Object.fromEntries(
      ETAPAS.map((etapa) => [etapa, prospectos.filter((p) => p.etapa === etapa).length]),
    ) as Record<EtapaProspecto, number>

    const activos = prospectos.filter((p) => p.etapa !== 'descartado')
    const enNegociacion = activos.filter((p) => p.etapa !== 'cerrado')

    const sumaPuntajes = enNegociacion.reduce((suma, p) => suma + p.puntaje, 0)

    return {
      porEtapa,
      total: prospectos.length,
      activos: activos.length,
      conversionPct: activos.length
        ? Math.round((porEtapa.cerrado / activos.length) * 100)
        : 0,
      puntajePromedio: enNegociacion.length
        ? (sumaPuntajes / enNegociacion.length).toFixed(1)
        : '—',
      urgentes: prospectos.filter(
        (p) => p.etapa === 'caliente' && diasDesde(p.ultimaActividad) >= DIAS_SIN_CONTACTO_URGENTE,
      ).length,
    }
  }, [prospectos])
}
