import type { EstadoProspecto, Prospecto } from '@features/crm/api/prospectos'

export const PUNTAJE_MAXIMO = 12

export type EtapaProspecto = 'caliente' | 'tibio' | 'frio' | 'descartado' | 'cerrado'

export type AccionSiguiente = 'VISITA_PRESENCIAL' | 'DEMO_REMOTA' | 'SEGUIMIENTO_AUTOMATIZADO' | 'CALLBACK_DECISOR'

const ACCIONES_CONOCIDAS: AccionSiguiente[] = ['VISITA_PRESENCIAL', 'DEMO_REMOTA', 'SEGUIMIENTO_AUTOMATIZADO', 'CALLBACK_DECISOR']

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
  canal: 'web' | 'whatsapp' | 'otro'
  estado: EstadoProspecto
  departamento: string
  numeroGalpones: number | null
  accionSiguiente: AccionSiguiente | null
  fechaCallback: string | null
  senalCaliente: boolean
  contactoDecisor: string
  fechaInicio: string
}

export const RANGOS_PUNTAJE: Record<EtapaProspecto, string> = {
  caliente: '8 - 12 pts',
  tibio: '5 - 7 pts',
  frio: '0 - 4 pts',
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
  if (p.estado === 'cerrado') return p.resultado_cierre === 'perdido' ? 'descartado' : 'cerrado'

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
    canal: p.canal_origen === 'whatsapp' ? 'whatsapp' : p.canal_origen === 'web' ? 'web' : 'otro',
    estado: p.estado,
    departamento: p.departamento ?? '',
    numeroGalpones: p.numero_galpones,
    accionSiguiente: ACCIONES_CONOCIDAS.find((accion) => accion === p.accion_siguiente) ?? null,
    fechaCallback: p.fecha_callback,
    senalCaliente: p.senal_caliente,
    contactoDecisor: p.contacto_decisor ?? '',
    fechaInicio: p.fecha_inicio,
  }
}
