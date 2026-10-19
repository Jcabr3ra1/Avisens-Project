import type { SolicitudPqrs } from './solicitudPqrs'

const MS_POR_MINUTO = 60_000
const MS_POR_HORA = 3_600_000
const MS_POR_DIA = 86_400_000
const HORAS_POR_VENCER = 6

export type TonoPlazo = 'vencida' | 'por_vencer' | 'a_tiempo' | 'sin_plazo' | 'cumplida' | 'tarde'

export interface Plazo {
  tono: TonoPlazo
  texto: string
}

export type GrupoPqrs = 'vencidas' | 'por_vencer' | 'nuevas' | 'en_proceso' | 'resueltas' | 'cerradas'

export type VistaPqrs = 'atender' | 'mias' | 'resueltas' | 'todas'

export const GRUPOS_PQRS: Record<GrupoPqrs, { titulo: string; descripcion: string }> = {
  vencidas: { titulo: 'Vencidas', descripcion: 'Se pasó el plazo que se le prometió al cliente.' },
  por_vencer: { titulo: 'Por vencer', descripcion: `Vencen en menos de ${HORAS_POR_VENCER} horas.` },
  nuevas: { titulo: 'Nuevas', descripcion: 'Nadie las ha tomado todavía.' },
  en_proceso: { titulo: 'En proceso', descripcion: 'Alguien las está atendiendo.' },
  resueltas: { titulo: 'Resueltas', descripcion: 'Ya tienen respuesta; falta cerrarlas.' },
  cerradas: { titulo: 'Cerradas', descripcion: 'Casos terminados.' },
}

const ORDEN: GrupoPqrs[] = ['vencidas', 'por_vencer', 'nuevas', 'en_proceso', 'resueltas', 'cerradas']

const GRUPOS_POR_VISTA: Record<VistaPqrs, GrupoPqrs[]> = {
  atender: ['vencidas', 'por_vencer', 'nuevas', 'en_proceso'],
  mias: ['vencidas', 'por_vencer', 'en_proceso', 'resueltas'],
  resueltas: ['resueltas', 'cerradas'],
  todas: ORDEN,
}

function tiempo(fecha: string | null): number | null {
  if (!fecha) return null
  const valor = new Date(fecha).getTime()
  return Number.isNaN(valor) ? null : valor
}

export function duracion(ms: number): string {
  const absoluto = Math.abs(ms)
  if (absoluto < MS_POR_HORA) return `${Math.max(1, Math.round(absoluto / MS_POR_MINUTO))} min`
  if (absoluto < 2 * MS_POR_DIA) return `${Math.round(absoluto / MS_POR_HORA)} h`
  const dias = Math.round(absoluto / MS_POR_DIA)
  return `${dias} días`
}

export function estaTerminada(solicitud: SolicitudPqrs): boolean {
  return solicitud.estado === 'resuelta' || solicitud.estado === 'cerrada'
}

export function plazoDe(solicitud: SolicitudPqrs, ahora = new Date()): Plazo {
  const limite = tiempo(solicitud.fecha_limite)

  if (estaTerminada(solicitud)) {
    const cierre = tiempo(solicitud.fecha_cierre)
    if (limite === null || cierre === null) return { tono: 'cumplida', texto: 'Resuelta' }
    return cierre <= limite
      ? { tono: 'cumplida', texto: 'Resuelta a tiempo' }
      : { tono: 'tarde', texto: `Resuelta ${duracion(cierre - limite)} tarde` }
  }

  if (limite === null) return { tono: 'sin_plazo', texto: 'Sin plazo' }

  const restante = limite - ahora.getTime()
  if (restante <= 0) return { tono: 'vencida', texto: `Vencida hace ${duracion(restante)}` }
  if (restante < HORAS_POR_VENCER * MS_POR_HORA) return { tono: 'por_vencer', texto: `Vence en ${duracion(restante)}` }
  return { tono: 'a_tiempo', texto: `Vence en ${duracion(restante)}` }
}

export function grupoDe(solicitud: SolicitudPqrs, ahora = new Date()): GrupoPqrs {
  if (solicitud.estado === 'cerrada') return 'cerradas'
  if (solicitud.estado === 'resuelta') return 'resueltas'
  const { tono } = plazoDe(solicitud, ahora)
  if (tono === 'vencida') return 'vencidas'
  if (tono === 'por_vencer') return 'por_vencer'
  return solicitud.estado === 'abierta' && solicitud.responsable_id === null ? 'nuevas' : 'en_proceso'
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-CO').trim()
}

export function coincide(solicitud: SolicitudPqrs, texto: string): boolean {
  const termino = normalizar(texto)
  if (!termino) return true
  return [
    solicitud.radicado,
    solicitud.prospecto.nombre,
    solicitud.prospecto.telefono,
    solicitud.prospecto.email,
    solicitud.categoria,
    solicitud.asunto,
  ].some((valor) => valor && normalizar(valor).includes(termino))
}

function comparar(a: SolicitudPqrs, b: SolicitudPqrs): number {
  if (estaTerminada(a) && estaTerminada(b)) {
    return (tiempo(b.fecha_cierre) ?? 0) - (tiempo(a.fecha_cierre) ?? 0)
  }
  const limiteA = tiempo(a.fecha_limite) ?? Number.POSITIVE_INFINITY
  const limiteB = tiempo(b.fecha_limite) ?? Number.POSITIVE_INFINITY
  if (limiteA !== limiteB) return limiteA - limiteB
  return (tiempo(a.fecha_creacion) ?? 0) - (tiempo(b.fecha_creacion) ?? 0)
}

export interface FiltrosBandejaPqrs {
  vista: VistaPqrs
  texto: string
  categoria: string
  usuarioId: number | null
}

export interface SeccionPqrs {
  grupo: GrupoPqrs
  titulo: string
  descripcion: string
  items: SolicitudPqrs[]
}

function enVista(solicitud: SolicitudPqrs, vista: VistaPqrs, usuarioId: number | null, ahora: Date): boolean {
  if (vista === 'mias' && (usuarioId === null || solicitud.responsable_id !== usuarioId)) return false
  return GRUPOS_POR_VISTA[vista].includes(grupoDe(solicitud, ahora))
}

export function organizarBandeja(solicitudes: SolicitudPqrs[], filtros: FiltrosBandejaPqrs, ahora = new Date()): SeccionPqrs[] {
  const visibles = solicitudes.filter((solicitud) =>
    enVista(solicitud, filtros.vista, filtros.usuarioId, ahora)
    && (filtros.categoria === 'todas' || solicitud.categoria === filtros.categoria)
    && coincide(solicitud, filtros.texto))

  return ORDEN
    .map((grupo) => ({
      grupo,
      ...GRUPOS_PQRS[grupo],
      items: visibles.filter((solicitud) => grupoDe(solicitud, ahora) === grupo).sort(comparar),
    }))
    .filter((seccion) => seccion.items.length > 0)
}

export interface ResumenPqrs {
  porAtender: number
  vencidas: number
  porVencer: number
  sinTomar: number
  resueltasSemana: number
  respuestaPromedioHoras: number | null
  aTiempoPct: number | null
  porVista: Record<VistaPqrs, number>
}

export function resumirBandeja(solicitudes: SolicitudPqrs[], usuarioId: number | null, ahora = new Date()): ResumenPqrs {
  const grupos = solicitudes.map((solicitud) => grupoDe(solicitud, ahora))
  const contar = (lista: GrupoPqrs[]) => grupos.filter((grupo) => lista.includes(grupo)).length
  const haceSemana = ahora.getTime() - 7 * MS_POR_DIA

  const terminadas = solicitudes.filter((solicitud) => estaTerminada(solicitud) && tiempo(solicitud.fecha_cierre) !== null)
  const horas = terminadas.map((solicitud) => ((tiempo(solicitud.fecha_cierre) ?? 0) - (tiempo(solicitud.fecha_creacion) ?? 0)) / MS_POR_HORA)
  const conPlazo = terminadas.filter((solicitud) => tiempo(solicitud.fecha_limite) !== null)
  const aTiempo = conPlazo.filter((solicitud) => plazoDe(solicitud, ahora).tono === 'cumplida').length

  return {
    porAtender: contar(GRUPOS_POR_VISTA.atender),
    vencidas: contar(['vencidas']),
    porVencer: contar(['por_vencer']),
    sinTomar: solicitudes.filter((solicitud) => !estaTerminada(solicitud) && solicitud.responsable_id === null).length,
    resueltasSemana: terminadas.filter((solicitud) => (tiempo(solicitud.fecha_cierre) ?? 0) >= haceSemana).length,
    respuestaPromedioHoras: horas.length ? horas.reduce((suma, valor) => suma + valor, 0) / horas.length : null,
    aTiempoPct: conPlazo.length ? Math.round((aTiempo / conPlazo.length) * 100) : null,
    porVista: {
      atender: solicitudes.filter((solicitud) => enVista(solicitud, 'atender', usuarioId, ahora)).length,
      mias: solicitudes.filter((solicitud) => enVista(solicitud, 'mias', usuarioId, ahora)).length,
      resueltas: solicitudes.filter((solicitud) => enVista(solicitud, 'resueltas', usuarioId, ahora)).length,
      todas: solicitudes.length,
    },
  }
}

export function enlaceWhatsApp(telefono: string | null): string | null {
  if (!telefono) return null
  const digitos = telefono.replace(/[\s()+-]/g, '')
  if (!/^\d{7,15}$/.test(digitos)) return null
  const completo = digitos.length === 10 && digitos.startsWith('3') ? `57${digitos}` : digitos
  return `https://wa.me/${completo}`
}

export function enlaceTelefono(telefono: string | null): string | null {
  if (!telefono) return null
  const limpio = telefono.replace(/[\s()-]/g, '')
  return /^\+?\d{7,15}$/.test(limpio) ? `tel:${limpio}` : null
}

const RESPUESTAS_GENERALES = ['Te llamamos y resolvimos la solicitud por teléfono. Si necesitas algo más, escríbenos con tu número de radicado.']

export const RESPUESTAS_RAPIDAS: Record<string, string[]> = {
  Reclamo: [
    'Revisamos tu caso y ya quedó solucionado. Si vuelve a pasar, escríbenos con tu número de radicado.',
    'Un técnico revisará el equipo en tu granja. Te confirmamos la fecha por este medio.',
  ],
  Queja: [
    'Lamentamos la demora. Ya agendamos la visita y hoy mismo te confirmamos la fecha.',
  ],
  Petición: [
    'Te enviamos la información que pediste. Cualquier duda, aquí estamos.',
  ],
  Sugerencia: [
    'Gracias por la idea. La compartimos con el equipo de producto para tenerla en cuenta.',
  ],
  Felicitación: [
    '¡Gracias por tus palabras! Se las hacemos llegar a todo el equipo.',
  ],
}

export function respuestasRapidas(categoria: string): string[] {
  return [...(RESPUESTAS_RAPIDAS[categoria] ?? []), ...RESPUESTAS_GENERALES]
}
