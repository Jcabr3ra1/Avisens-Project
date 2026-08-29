import type { CrearGalponPayload, Galpon } from '../api/galpones'

export interface FormularioGalponDatos {
  granja_id: number
  nombre: string
  capacidad_aves: number | ''
  ancho_metros: number | ''
  largo_metros: number | ''
  orientacion: string
  tipo_techo: string
  plano_url: string
  fecha_construccion: string
}

export function crearFormularioGalpon(granjaId: number): FormularioGalponDatos {
  return {
    granja_id: granjaId,
    nombre: '',
    capacidad_aves: '',
    ancho_metros: '',
    largo_metros: '',
    orientacion: '',
    tipo_techo: '',
    plano_url: '',
    fecha_construccion: '',
  }
}

export function formularioDesdeGalpon(galpon: Galpon): FormularioGalponDatos {
  return {
    granja_id: galpon.granja.id,
    nombre: galpon.nombre,
    capacidad_aves: galpon.capacidad_aves ?? '',
    ancho_metros: galpon.ancho_metros ?? '',
    largo_metros: galpon.largo_metros ?? '',
    orientacion: galpon.orientacion ?? '',
    tipo_techo: galpon.tipo_techo ?? '',
    plano_url: galpon.plano_url ?? '',
    fecha_construccion: galpon.fecha_construccion?.slice(0, 10) ?? '',
  }
}

function textoOpcional(valor: string): string | undefined {
  return valor.trim() || undefined
}

export function crearPayloadGalpon(
  form: FormularioGalponDatos,
): CrearGalponPayload {
  return {
    granja_id: form.granja_id,
    nombre: form.nombre.trim(),
    capacidad_aves: form.capacidad_aves || undefined,
    ancho_metros: form.ancho_metros || undefined,
    largo_metros: form.largo_metros || undefined,
    orientacion: textoOpcional(form.orientacion),
    tipo_techo: textoOpcional(form.tipo_techo),
    plano_url: textoOpcional(form.plano_url),
    fecha_construccion: form.fecha_construccion || undefined,
  }
}
