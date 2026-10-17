import type { AccionSiguiente, EtapaProspecto, ProspectoVista } from './prospectoVista'

const MS_POR_HORA = 3_600_000
const MS_POR_DIA = 86_400_000
const DIAS_CALIENTE_SIN_CONTACTO = 4
const DIAS_TIBIO_SIN_CONTACTO = 12

export const ACCIONES: Record<AccionSiguiente, { titulo: string; descripcion: string }> = {
  VISITA_PRESENCIAL: {
    titulo: 'Agendar visita a la granja',
    descripcion: 'Mostró interés alto: coordina una visita para dimensionar la instalación.',
  },
  DEMO_REMOTA: {
    titulo: 'Programar una demo remota',
    descripcion: 'Interés medio: muéstrale Avisens en una videollamada corta.',
  },
  SEGUIMIENTO_AUTOMATIZADO: {
    titulo: 'Seguimiento automático',
    descripcion: 'Interés bajo por ahora: el chatbot lo mantiene informado.',
  },
  CALLBACK_DECISOR: {
    titulo: 'Llamar a quien decide la compra',
    descripcion: 'Quien escribió no decide: contacta al responsable de la compra.',
  },
}

export type GrupoBandeja = 'vencidos' | 'hoy' | 'sin_asesor' | 'seguimiento' | 'convertidos' | 'descartados'

export const GRUPOS: Record<GrupoBandeja, { titulo: string; descripcion: string }> = {
  vencidos: { titulo: 'Vencidos', descripcion: 'Se pasó el momento de contactarlos.' },
  hoy: { titulo: 'Para hoy', descripcion: 'Contactos que conviene atender hoy.' },
  sin_asesor: { titulo: 'Sin asesor', descripcion: 'Nadie los atiende todavía.' },
  seguimiento: { titulo: 'En seguimiento', descripcion: 'Avanzan a su ritmo.' },
  convertidos: { titulo: 'Convertidos', descripcion: 'Ya son clientes.' },
  descartados: { titulo: 'Descartados', descripcion: 'Perdidos, abandonados o sin consentimiento.' },
}

const ORDEN_GRUPOS: GrupoBandeja[] = ['vencidos', 'hoy', 'sin_asesor', 'seguimiento', 'convertidos', 'descartados']

export interface Prioridad {
  grupo: GrupoBandeja
  motivo: string
  peso: number
}

function dias(desde: string, ahora: Date): number {
  const fecha = new Date(desde).getTime()
  if (Number.isNaN(fecha)) return 0
  return Math.max(0, Math.floor((ahora.getTime() - fecha) / MS_POR_DIA))
}

function hace(cantidad: number): string {
  if (cantidad <= 0) return 'hoy'
  return cantidad === 1 ? 'hace 1 día' : `hace ${cantidad} días`
}

function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function hora(fecha: Date): string {
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(fecha)
}

export function prioridadDe(prospecto: ProspectoVista, ahora = new Date()): Prioridad {
  if (prospecto.etapa === 'cerrado') return { grupo: 'convertidos', motivo: 'Ya es cliente', peso: 0 }
  if (prospecto.etapa === 'descartado') return { grupo: 'descartados', motivo: 'Descartado', peso: 0 }

  const sinContacto = dias(prospecto.ultimaActividad, ahora)

  if (prospecto.fechaCallback) {
    const callback = new Date(prospecto.fechaCallback)
    if (!Number.isNaN(callback.getTime())) {
      const atraso = ahora.getTime() - callback.getTime()
      if (atraso > 0 && !mismoDia(callback, ahora)) {
        const diasAtraso = Math.max(1, Math.floor(atraso / MS_POR_DIA))
        return { grupo: 'vencidos', motivo: `Llamada pendiente: venció ${hace(diasAtraso)}`, peso: 1000 + diasAtraso }
      }
      if (mismoDia(callback, ahora)) {
        const vencida = atraso > 0
        return {
          grupo: vencida ? 'vencidos' : 'hoy',
          motivo: vencida ? `Llamada pendiente: era a las ${hora(callback)}` : `Llamar hoy a las ${hora(callback)}`,
          peso: vencida ? 1000 + atraso / MS_POR_HORA / 24 : 900 - callback.getHours(),
        }
      }
    }
  }

  if (prospecto.etapa === 'caliente' && sinContacto >= DIAS_CALIENTE_SIN_CONTACTO) {
    return { grupo: 'vencidos', motivo: `Interés alto sin contacto ${hace(sinContacto)}`, peso: 800 + sinContacto }
  }
  if (prospecto.etapa === 'tibio' && sinContacto >= DIAS_TIBIO_SIN_CONTACTO) {
    return { grupo: 'vencidos', motivo: `Interés medio sin contacto ${hace(sinContacto)}`, peso: 600 + sinContacto }
  }
  if (prospecto.etapa === 'caliente') {
    return { grupo: 'hoy', motivo: prospecto.senalCaliente ? 'Interés alto y tiene un problema que resolver' : 'Interés alto: no lo dejes enfriar', peso: 700 + prospecto.puntaje }
  }
  if (prospecto.asesorId === null) {
    return { grupo: 'sin_asesor', motivo: `Llegó ${hace(dias(prospecto.fechaInicio, ahora))} y nadie lo atiende`, peso: 500 + prospecto.puntaje }
  }
  const accion = prospecto.accionSiguiente ? ACCIONES[prospecto.accionSiguiente].titulo : 'Seguimiento'
  return { grupo: 'seguimiento', motivo: `${accion} · último contacto ${hace(sinContacto)}`, peso: prospecto.puntaje }
}

export type VistaBandeja = 'prioridad' | 'activos' | 'convertidos' | 'descartados'
export type FiltroCanal = 'todos' | 'web' | 'whatsapp'
export type FiltroTemperatura = 'todas' | Extract<EtapaProspecto, 'caliente' | 'tibio' | 'frio'>

export interface CriteriosBandeja {
  vista: VistaBandeja
  texto: string
  canal: FiltroCanal
  temperatura: FiltroTemperatura
}

export interface ItemBandeja {
  prospecto: ProspectoVista
  prioridad: Prioridad
}

export interface SeccionBandeja {
  grupo: GrupoBandeja | 'activos'
  titulo: string
  descripcion: string
  items: ItemBandeja[]
}

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

function coincide(prospecto: ProspectoVista, buscado: string): boolean {
  if (!buscado) return true
  return [prospecto.nombre, prospecto.granja, prospecto.municipio, prospecto.telefono, prospecto.correo ?? '']
    .some((campo) => normalizar(campo).includes(buscado))
}

function enVista(grupo: GrupoBandeja, vista: VistaBandeja): boolean {
  if (vista === 'convertidos') return grupo === 'convertidos'
  if (vista === 'descartados') return grupo === 'descartados'
  return grupo !== 'convertidos' && grupo !== 'descartados'
}

export function organizarBandeja(
  prospectos: ProspectoVista[],
  { vista, texto, canal, temperatura }: CriteriosBandeja,
  ahora = new Date(),
): SeccionBandeja[] {
  const buscado = normalizar(texto)
  const items = prospectos
    .map((prospecto) => ({ prospecto, prioridad: prioridadDe(prospecto, ahora) }))
    .filter(({ prospecto, prioridad }) =>
      enVista(prioridad.grupo, vista)
      && (canal === 'todos' || prospecto.canal === canal)
      && (temperatura === 'todas' || prospecto.etapa === temperatura)
      && coincide(prospecto, buscado))

  if (vista === 'activos') {
    const ordenados = [...items].sort((a, b) => b.prospecto.ultimaActividad.localeCompare(a.prospecto.ultimaActividad))
    return ordenados.length
      ? [{ grupo: 'activos', titulo: 'Prospectos activos', descripcion: 'Del contacto más reciente al más antiguo.', items: ordenados }]
      : []
  }

  return ORDEN_GRUPOS
    .map((grupo) => ({
      grupo,
      ...GRUPOS[grupo],
      items: items
        .filter((item) => item.prioridad.grupo === grupo)
        .sort((a, b) => b.prioridad.peso - a.prioridad.peso || b.prospecto.puntaje - a.prospecto.puntaje),
    }))
    .filter((seccion) => seccion.items.length > 0)
}

export interface ResumenBandeja {
  paraAtender: number
  vencidos: number
  activos: number
  porTemperatura: Record<'frio' | 'tibio' | 'caliente', number>
  convertidos: number
  conversionPct: number
  sinAsesor: number
  porVista: Record<VistaBandeja, number>
}

export function resumirBandeja(prospectos: ProspectoVista[], ahora = new Date()): ResumenBandeja {
  const grupos = prospectos.map((prospecto) => prioridadDe(prospecto, ahora).grupo)
  const contar = (grupo: GrupoBandeja) => grupos.filter((actual) => actual === grupo).length
  const activos = prospectos.filter((prospecto) => prospecto.etapa !== 'cerrado' && prospecto.etapa !== 'descartado')
  const convertidos = contar('convertidos')
  const conCierrePosible = activos.length + convertidos
  return {
    paraAtender: contar('vencidos') + contar('hoy'),
    vencidos: contar('vencidos'),
    activos: activos.length,
    porTemperatura: {
      frio: activos.filter((prospecto) => prospecto.etapa === 'frio').length,
      tibio: activos.filter((prospecto) => prospecto.etapa === 'tibio').length,
      caliente: activos.filter((prospecto) => prospecto.etapa === 'caliente').length,
    },
    convertidos,
    conversionPct: conCierrePosible ? Math.round((convertidos / conCierrePosible) * 100) : 0,
    sinAsesor: activos.filter((prospecto) => prospecto.asesorId === null).length,
    porVista: {
      prioridad: activos.length,
      activos: activos.length,
      convertidos,
      descartados: contar('descartados'),
    },
  }
}
