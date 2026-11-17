import type { PoliticaAlerta } from '../api/politicas-alerta'

// HU-25 · Configuración de canales y tiempos de escalamiento.
//
// Una política por granja y criticidad: el backend no deja dos activas con la
// misma criticidad en una granja, así que la pantalla muestra siempre las tres
// tarjetas (alta, media, baja) y cada una crea, edita o pausa la suya.

export type CriticidadPolitica = 'alta' | 'media' | 'baja'
export type CanalPolitica = 'WhatsApp' | 'Email' | 'SMS'
export type EstadoPolitica = 'activa' | 'pausada' | 'sin-configurar'

export type NivelPolitica = {
  valor: CriticidadPolitica
  etiqueta: string
  descripcion: string
  minutosSugeridos: number
}

// Mismo orden y misma escala que el backend (common/criticidad): en minúscula.
export const NIVELES_POLITICA: readonly NivelPolitica[] = [
  {
    valor: 'alta',
    etiqueta: 'Alta',
    descripcion: 'No puede esperar: las aves corren riesgo.',
    minutosSugeridos: 15,
  },
  {
    valor: 'media',
    etiqueta: 'Media',
    descripcion: 'Hay que revisarla durante la jornada.',
    minutosSugeridos: 60,
  },
  {
    valor: 'baja',
    etiqueta: 'Baja',
    descripcion: 'Para tener en cuenta en la próxima visita.',
    minutosSugeridos: 240,
  },
]

// El backend solo acepta estos tres valores, escritos así.
export const CANALES_POLITICA: readonly { valor: CanalPolitica; etiqueta: string }[] = [
  { valor: 'WhatsApp', etiqueta: 'WhatsApp' },
  { valor: 'Email', etiqueta: 'Correo' },
  { valor: 'SMS', etiqueta: 'SMS' },
]

export const MINUTOS_MINIMOS = 1
// Un día. Más que eso ya no es un tiempo de respuesta sino un olvido.
export const MINUTOS_MAXIMOS = 1440

function esCanal(valor: string | null): valor is CanalPolitica {
  return CANALES_POLITICA.some((canal) => canal.valor === valor)
}

/**
 * La política que manda para una criticidad de la granja: la activa si la hay
 * y, si no, la pausada más reciente (para reactivarla en vez de crear otra).
 * La criticidad se compara en minúscula porque hubo datos con 'Alta'.
 */
export function politicaDeNivel(
  politicas: PoliticaAlerta[],
  granjaId: number,
  criticidad: CriticidadPolitica,
): PoliticaAlerta | null {
  const delNivel = politicas
    .filter((politica) => politica.granja_id === granjaId && politica.criticidad.toLowerCase() === criticidad)
    .sort((a, b) => Date.parse(b.fecha_actualizacion) - Date.parse(a.fecha_actualizacion))
  return delNivel.find((politica) => politica.activa) ?? delNivel[0] ?? null
}

export function estadoDePolitica(politica: PoliticaAlerta | null): EstadoPolitica {
  if (!politica) return 'sin-configurar'
  return politica.activa ? 'activa' : 'pausada'
}

export function canalInicial(politica: PoliticaAlerta | null): CanalPolitica {
  const canal = politica?.canal ?? null
  return esCanal(canal) ? canal : 'WhatsApp'
}

export function minutosIniciales(politica: PoliticaAlerta | null, nivel: NivelPolitica): string {
  const segundos = politica?.tiempo_max_respuesta_seg
  if (!segundos || segundos <= 0) return String(nivel.minutosSugeridos)
  return String(Math.max(MINUTOS_MINIMOS, Math.round(segundos / 60)))
}

/** Devuelve el mensaje de error o null si el valor sirve. */
export function validarMinutos(texto: string): string | null {
  if (texto.trim() === '') return 'Indica cuántos minutos hay para atenderla.'
  const minutos = Number(texto)
  if (!Number.isInteger(minutos)) return 'Usa minutos enteros, sin decimales.'
  if (minutos < MINUTOS_MINIMOS || minutos > MINUTOS_MAXIMOS) {
    return `Debe estar entre ${MINUTOS_MINIMOS} y ${MINUTOS_MAXIMOS} minutos (un día).`
  }
  return null
}

export function segundosDeMinutos(texto: string): number {
  return Number(texto) * 60
}

export function tiempoLegible(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  const textoHoras = `${horas} ${horas === 1 ? 'hora' : 'horas'}`
  return resto === 0 ? textoHoras : `${textoHoras} ${resto} min`
}

export function etiquetaCanal(canal: string | null): string {
  return CANALES_POLITICA.find((item) => item.valor === canal)?.etiqueta ?? 'Sin canal'
}
