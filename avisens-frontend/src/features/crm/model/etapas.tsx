import type { ReactNode } from 'react'
import { IcFlame, IcThermo, IcSnowflake, IcCheck, IcClose } from '@shared/ui/icons/icons'
import type { EtapaProspecto } from './prospectoVista'

export type EstiloEtapa = {
  label: string
  icono: ReactNode
  color: string
  colorSuave: string
  colorBorde: string
}

export const ESTILO_ETAPA: Record<EtapaProspecto, EstiloEtapa> = {
  caliente: {
    label: 'Caliente',
    icono: <IcFlame size={13} />,
    color: '#ef4444',
    colorSuave: 'rgba(239, 68, 68, 0.1)',
    colorBorde: 'rgba(239, 68, 68, 0.22)',
  },
  tibio: {
    label: 'Tibio',
    icono: <IcThermo size={13} />,
    color: '#f59e0b',
    colorSuave: 'rgba(245, 158, 11, 0.1)',
    colorBorde: 'rgba(245, 158, 11, 0.22)',
  },
  frio: {
    label: 'Frío',
    icono: <IcSnowflake size={13} />,
    color: '#3b82f6',
    colorSuave: 'rgba(59, 130, 246, 0.1)',
    colorBorde: 'rgba(59, 130, 246, 0.22)',
  },
  cerrado: {
    label: 'Cliente',
    icono: <IcCheck size={13} />,
    color: 'var(--avisens-green)',
    colorSuave: 'rgba(71, 187, 75, 0.1)',
    colorBorde: 'rgba(71, 187, 75, 0.22)',
  },
  descartado: {
    label: 'Descartado',
    icono: <IcClose size={13} />,
    color: '#94a3b8',
    colorSuave: 'rgba(148, 163, 184, 0.1)',
    colorBorde: 'rgba(148, 163, 184, 0.2)',
  },
}
