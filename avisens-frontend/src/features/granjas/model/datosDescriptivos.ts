import type { DatosGranjaPayload, Granja } from '../api/granjas'
import type { Galpon } from '@features/galpones/api/galpones'
import type { DatosLotePayload, Lote } from '@features/lotes/api/lotes'

export type Resultado<T> = { payload: T; error: null } | { payload: null; error: string }

export type FormDatosGranja = Record<keyof DatosGranjaPayload, string>
export type FormDatosLote = {
  sexo: string
  linea_genetica_id: string
  marca_alimento: string
  proveedor_id: string
}

const texto = (valor: string | number | null | undefined) => (valor === null || valor === undefined ? '' : String(valor))

export function unir(partes: string[]): string {
  if (partes.length <= 1) return partes.join('')
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

export function textoFaltantes(faltantes: string[]): string {
  if (faltantes.length === 0) return ''
  const plural = faltantes.length > 1 || /^(las|los) /.test(faltantes[0])
  return `${plural ? 'Faltan' : 'Falta'} ${unir(faltantes)}`
}

export function faltantesGranja(granja: Granja): string[] {
  const faltan: string[] = []
  if (!granja.municipio || !granja.departamento) faltan.push('el municipio')
  if (!granja.direccion) faltan.push('la dirección')
  return faltan
}

export function pendientesAdminGranja(granja: Granja): string[] {
  const faltan: string[] = []
  if (granja.latitud === null || granja.longitud === null) faltan.push('las coordenadas')
  if (granja.area_total_m2 === null) faltan.push('el área')
  return faltan
}

export function faltantesGalpon(galpon: Galpon): string[] {
  const faltan: string[] = []
  if (galpon.capacidad_aves === null) faltan.push('la capacidad')
  if (galpon.ancho_metros === null || galpon.largo_metros === null) faltan.push('las medidas')
  if (!galpon.tipo_techo) faltan.push('el techo')
  if (!galpon.orientacion) faltan.push('la orientación')
  if (!galpon.fecha_construccion) faltan.push('la fecha de construcción')
  return faltan
}

export function faltantesLote(lote: Lote): string[] {
  const faltan: string[] = []
  if (!lote.linea_genetica) faltan.push('la línea genética')
  if (!lote.sexo) faltan.push('el sexo')
  if (!lote.marca_alimento) faltan.push('la marca de alimento')
  if (!lote.proveedor) faltan.push('el proveedor')
  return faltan
}

export function enlaceMapa(latitud: number, longitud: number): string {
  return `https://www.google.com/maps?q=${latitud},${longitud}`
}

export function formDatosGranja(granja: Granja): FormDatosGranja {
  return {
    direccion: texto(granja.direccion),
    municipio: texto(granja.municipio),
    departamento: texto(granja.departamento),
  }
}

const FALTA = 'Completa todos los campos: ninguno es opcional.'

export function payloadDatosGranja(form: FormDatosGranja): Resultado<DatosGranjaPayload> {
  if (Object.values(form).some((valor) => valor.trim() === '')) return { payload: null, error: FALTA }
  return {
    error: null,
    payload: {
      direccion: form.direccion.trim(),
      municipio: form.municipio.trim(),
      departamento: form.departamento.trim(),
    },
  }
}

export function formDatosLote(lote: Lote): FormDatosLote {
  return {
    sexo: texto(lote.sexo),
    linea_genetica_id: texto(lote.linea_genetica?.id),
    marca_alimento: texto(lote.marca_alimento),
    proveedor_id: texto(lote.proveedor?.id),
  }
}

export function payloadDatosLote(form: FormDatosLote): Resultado<DatosLotePayload> {
  if (Object.values(form).some((valor) => valor === '')) return { payload: null, error: FALTA }
  return {
    error: null,
    payload: {
      linea_genetica_id: Number(form.linea_genetica_id),
      sexo: form.sexo,
      marca_alimento: form.marca_alimento,
      proveedor_id: Number(form.proveedor_id),
    },
  }
}
