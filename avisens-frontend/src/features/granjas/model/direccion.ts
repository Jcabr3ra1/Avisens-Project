// Dirección guiada de la granja (QA-05). Antes era un texto libre y aceptaba
// cosas como "1111111111…". Ahora se arma por partes, con el formato de las
// direcciones colombianas: en zona urbana «Calle 10 # 5-23», en zona rural
// «Vereda El Progreso». El barrio, la finca o cualquier referencia van en un
// complemento aparte.

export const TIPOS_VIA_URBANA = ['Calle', 'Carrera', 'Transversal', 'Diagonal', 'Avenida'] as const
export const TIPOS_VIA_RURAL = ['Vereda', 'Kilómetro', 'Corregimiento'] as const
export const TIPOS_VIA = [...TIPOS_VIA_URBANA, ...TIPOS_VIA_RURAL] as const

export type PartesDireccion = {
  tipoVia: string
  via: string
  numero: string
  placa: string
  complemento: string
}

export const PARTES_VACIAS: PartesDireccion = { tipoVia: '', via: '', numero: '', placa: '', complemento: '' }

export const MAX_COMPLEMENTO = 80

export function esViaUrbana(tipoVia: string): boolean {
  return (TIPOS_VIA_URBANA as readonly string[]).includes(tipoVia)
}

// Número de vía urbana: 10, 10A, 10 Bis, 45 Sur…
const VIA_URBANA = /^\d{1,3}\s?[A-Za-z]?(\s?bis)?(\s?(sur|este|norte|oeste))?$/i
const NUMERO_CRUCE = /^\d{1,3}\s?[A-Za-z]?(\s?bis)?$/i
const PLACA = /^\d{1,3}$/
const TIENE_LETRAS = /\p{L}{2,}/u

const limpio = (valor: string) => valor.trim().replace(/\s+/g, ' ')

export function errorDireccion(partes: PartesDireccion): string {
  const via = limpio(partes.via)
  if (!partes.tipoVia) return 'Elige el tipo de vía: calle, carrera, transversal, vereda…'
  if (!(TIPOS_VIA as readonly string[]).includes(partes.tipoVia)) return 'Elige un tipo de vía de la lista.'
  if (!via) return `Escribe el número o nombre de la ${partes.tipoVia.toLowerCase()}.`

  if (esViaUrbana(partes.tipoVia)) {
    if (!VIA_URBANA.test(via)) return `El número de la ${partes.tipoVia.toLowerCase()} debe ser como 10, 10A o 45 Sur.`
    if (!NUMERO_CRUCE.test(limpio(partes.numero))) return 'Escribe el número de la vía que cruza (después de #), como 5 o 5A.'
    if (!PLACA.test(limpio(partes.placa))) return 'Escribe el número de la placa (después del guion), como 23.'
  } else if (partes.tipoVia === 'Kilómetro') {
    if (!/^\d{1,3}([.,]\d)?$/.test(via)) return 'Escribe el kilómetro como un número, por ejemplo 4.'
  } else if (!TIENE_LETRAS.test(via)) {
    return `Escribe el nombre de la ${partes.tipoVia.toLowerCase()}, no solo números.`
  }

  const complemento = limpio(partes.complemento)
  if (complemento.length > MAX_COMPLEMENTO) return `El complemento admite hasta ${MAX_COMPLEMENTO} caracteres.`
  if (partes.tipoVia === 'Kilómetro' && !TIENE_LETRAS.test(complemento)) {
    return 'Para un kilómetro, indica en el complemento la vía o la finca (por ejemplo: Vía Toribío, Finca La Esperanza).'
  }
  if (complemento && !TIENE_LETRAS.test(complemento)) return 'El complemento debe tener texto: barrio, finca o una referencia.'
  return ''
}

export function componerDireccion(partes: PartesDireccion): string {
  const via = limpio(partes.via)
  const principal = esViaUrbana(partes.tipoVia)
    ? `${partes.tipoVia} ${via} # ${limpio(partes.numero)}-${limpio(partes.placa)}`
    : `${partes.tipoVia} ${via}`
  const complemento = limpio(partes.complemento)
  return complemento ? `${principal}, ${complemento}` : principal
}

const COMPUESTA_URBANA = new RegExp(
  `^(${TIPOS_VIA_URBANA.join('|')}) (.+?) # (.+?)-(\\d{1,3})(?:, (.*))?$`,
)
const COMPUESTA_RURAL = new RegExp(`^(${TIPOS_VIA_RURAL.join('|')}) ([^,]+)(?:, (.*))?$`)

// Lee una dirección guardada para volver a editarla por partes. Si no tiene
// el formato guiado (direcciones anteriores), se conserva su texto en el
// complemento cuando tiene letras; un dato como "1111…" se descarta para que
// la persona la vuelva a escribir bien.
export function descomponerDireccion(direccion: string | null | undefined): PartesDireccion {
  const texto = limpio(direccion ?? '')
  if (!texto) return { ...PARTES_VACIAS }
  const urbana = COMPUESTA_URBANA.exec(texto)
  if (urbana) {
    return { tipoVia: urbana[1], via: urbana[2], numero: urbana[3], placa: urbana[4], complemento: urbana[5] ?? '' }
  }
  const rural = COMPUESTA_RURAL.exec(texto)
  if (rural) {
    return { ...PARTES_VACIAS, tipoVia: rural[1], via: rural[2], complemento: rural[3] ?? '' }
  }
  return { ...PARTES_VACIAS, complemento: TIENE_LETRAS.test(texto) ? texto.slice(0, MAX_COMPLEMENTO) : '' }
}
