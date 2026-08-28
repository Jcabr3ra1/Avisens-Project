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
    return { nivel: 'urgente', colorBorde: '#ef4444', colorDias: '#ef4444', etiqueta }
  }

  if ((etapa === 'caliente' && dias >= 4) || (etapa === 'tibio' && dias >= 12)) {
    return { nivel: 'alerta', colorBorde: '#f59e0b', colorDias: '#f59e0b', etiqueta }
  }

  if (dias <= 2) {
    return { nivel: 'reciente', colorBorde: '#10b981', colorDias: '#10b981', etiqueta }
  }

  return { nivel: 'normal', colorBorde: 'transparent', colorDias: 'var(--text3)', etiqueta }
}
