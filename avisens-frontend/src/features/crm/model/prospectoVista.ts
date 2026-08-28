import type { Prospecto } from '@features/crm/api/prospectos'

export const PUNTAJE_MAXIMO = 16

export type EtapaProspecto = 'caliente' | 'tibio' | 'frio' | 'descartado' | 'cerrado'

export type ProspectoVista = {
  id: number
  nombre: string
  granja: string
  municipio: string
  rol: string
  areaGalponM2: number
  puntaje: number
  etapa: EtapaProspecto
  ultimaActividad: string
  telefono: string
  correo?: string
  asesorId: number | null
}

export const RANGOS_PUNTAJE: Record<EtapaProspecto, string> = {
  caliente: '12 - 16 pts',
  tibio: '7 - 11 pts',
  frio: '0 - 6 pts',
  descartado: 'N/A',
  cerrado: 'Convertido',
}

export const ETAPAS: EtapaProspecto[] = [
  'caliente',
  'tibio',
  'frio',
  'cerrado',
  'descartado',
]

function etapaDe(p: Prospecto): EtapaProspecto {
  if (p.estado === 'cerrado') return 'cerrado'

  if (
    p.estado === 'abandonado' ||
    p.estado === 'cancelado' ||
    p.estado === 'sin_consentimiento'
  ) {
    return 'descartado'
  }

  const clasificacion = p.clasificacion?.toLowerCase()
  if (clasificacion === 'caliente' || clasificacion === 'tibio' || clasificacion === 'frio') {
    return clasificacion
  }

  return 'frio'
}

export function aProspectoVista(p: Prospecto): ProspectoVista {
  return {
    id: p.id,
    nombre: p.nombre ?? 'Prospecto sin nombre',
    granja: p.nombre_granja ?? '',
    municipio: p.municipio ?? '',
    rol: p.rol_prospecto ?? '',
    areaGalponM2: p.area_galpon_m2 ?? 0,
    puntaje: p.puntaje_total ?? 0,
    etapa: etapaDe(p),
    ultimaActividad: p.ultima_actividad,
    telefono: p.telefono ?? '',
    correo: p.email ?? undefined,
    asesorId: p.asesor_asignado_id,
  }
}
