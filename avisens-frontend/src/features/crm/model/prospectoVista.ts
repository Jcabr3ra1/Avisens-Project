import type { Prospecto } from '@features/crm/api/prospectos'

// La escala del backend: NECESIDAD 4 + PRESUPUESTO 3 + MOMENTO 3 + AUTORIDAD 2.
// Estaba en 16, de cuando las siete preguntas repartían los puntos por igual.
// Con 16 un prospecto de 9 se leía como un 56 % cuando en realidad es un 75 %.
// Fuente: `dominio/calificacion.ts` en el backend.
export const PUNTAJE_MAXIMO = 12

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
  canal: 'web' | 'whatsapp' | 'otro'
}

export const RANGOS_PUNTAJE: Record<EtapaProspecto, string> = {
  // Umbrales reales: UMBRAL_CALIENTE = 8, UMBRAL_TIBIO = 5 en chatbot.service.ts.
  // Los de antes eran de la escala de 16: decían que «caliente» empezaba en 12,
  // así que un prospecto de 9 salía con la etiqueta Caliente y un rango que lo
  // desmentía en la misma línea.
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
    canal: p.canal_origen === 'whatsapp' ? 'whatsapp' : p.canal_origen === 'web' ? 'web' : 'otro',
  }
}
