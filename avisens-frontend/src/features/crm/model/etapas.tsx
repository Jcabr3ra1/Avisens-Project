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
    color: 'var(--danger)',
    colorSuave: 'var(--danger-soft)',
    colorBorde: 'color-mix(in srgb, var(--danger) 22%, transparent)',
  },
  tibio: {
    label: 'Tibio',
    icono: <IcThermo size={13} />,
    color: 'var(--warning)',
    colorSuave: 'var(--warning-soft)',
    colorBorde: 'color-mix(in srgb, var(--warning) 22%, transparent)',
  },
  frio: {
    label: 'Frío',
    icono: <IcSnowflake size={13} />,
    color: 'var(--info)',
    colorSuave: 'var(--info-soft)',
    colorBorde: 'color-mix(in srgb, var(--info) 22%, transparent)',
  },
  cerrado: {
    label: 'Cliente',
    icono: <IcCheck size={13} />,
    color: 'var(--avisens-green)',
    colorSuave: 'color-mix(in srgb, var(--primary) 10%, transparent)',
    colorBorde: 'color-mix(in srgb, var(--primary) 22%, transparent)',
  },
  descartado: {
    label: 'Descartado',
    icono: <IcClose size={13} />,
    color: 'var(--text-muted)',
    colorSuave: 'var(--surface-subtle)',
    colorBorde: 'var(--border-default)',
  },
}
