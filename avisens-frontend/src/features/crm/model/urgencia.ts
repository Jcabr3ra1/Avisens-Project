import type { EtapaProspecto } from './prospectoVista'

const MS_POR_DIA = 86_400_000

export type NivelUrgencia = 'urgente' | 'alerta' | 'reciente' | 'normal'

export type Urgencia = {
  nivel: NivelUrgencia
  colorBorde: string
  colorDias: string
  etiqueta: string
}

export function diasDesde(fechaIso: string): number {
  const fecha = new Date(fechaIso)
  if (Number.isNaN(fecha.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - fecha.getTime()) / MS_POR_DIA))
}

export function urgenciaDe(fechaIso: string, etapa: EtapaProspecto): Urgencia {
  const dias = diasDesde(fechaIso)
  const etiqueta = dias <= 0 ? 'Hoy' : `${dias}d`

  if (etapa === 'caliente' && dias >= 7) {
    return { nivel: 'urgente', colorBorde: 'var(--danger)', colorDias: 'var(--danger)', etiqueta }
  }

  if ((etapa === 'caliente' && dias >= 4) || (etapa === 'tibio' && dias >= 12)) {
    return { nivel: 'alerta', colorBorde: 'var(--warning)', colorDias: 'var(--warning)', etiqueta }
  }

  if (dias <= 2) {
    return { nivel: 'reciente', colorBorde: 'var(--success)', colorDias: 'var(--success)', etiqueta }
  }

  return { nivel: 'normal', colorBorde: 'transparent', colorDias: 'var(--text3)', etiqueta }
}
