import { fechaDeHoy } from '@shared/utils/fechas'
export type Pesaje = { id:number; lote_id:number; fecha:string; peso_promedio_g:number; cantidad_aves_pesadas:number|null; peso_objetivo_g:number|null; observaciones:string|null }
export type Mortalidad = { id:number; lote_id:number; fecha:string; cantidad_aves:number; causa_presuntiva:string|null; disposicion:string|null; observaciones:string|null }
export type EventoSanitario = { id:number; lote_id:number; fecha:string; tipo:string; producto:string|null; diagnostico:string|null; cantidad_aves:number|null; observaciones:string|null }
export type TipoRegistro = 'peso' | 'mortalidad' | 'sanitario'
export type FormularioRegistro = { fecha:string; peso_promedio_g:string; cantidad_aves_pesadas:string; peso_objetivo_g:string; cantidad_aves:string; causa_presuntiva:string; tipo:string; producto:string; diagnostico:string; observaciones:string }
export const FORMULARIO_INICIAL: FormularioRegistro = { fecha:fechaDeHoy(), peso_promedio_g:'', cantidad_aves_pesadas:'', peso_objetivo_g:'', cantidad_aves:'', causa_presuntiva:'', tipo:'vacunacion', producto:'', diagnostico:'', observaciones:'' }

// Límites razonables con amplio margen sobre tablas genéticas (ej. aves estándar ~3-5 kg).
// 30.000 g (30 kg) permite aves de gran tamaño pero previene valores astronómicos.
export const PESO_MINIMO_G = 1
export const PESO_MAXIMO_G = 30_000
export const AVES_MAXIMO = 100_000

export function errorDeRegistro(tipo: TipoRegistro, form: FormularioRegistro): string {
  if (!form.fecha) return 'Selecciona la fecha del registro.'
  if (tipo === 'peso') {
    const peso = Number(form.peso_promedio_g)
    if (!form.peso_promedio_g || Number.isNaN(peso)) return 'Escribe el peso promedio en gramos.'
    if (peso < PESO_MINIMO_G) return `El peso promedio debe ser al menos de ${PESO_MINIMO_G} g.`
    if (peso > PESO_MAXIMO_G) {
      return `Ingrese un peso promedio razonable (máximo ${PESO_MAXIMO_G.toLocaleString('es-CO')} g).`
    }
    if (form.peso_objetivo_g) {
      const objetivo = Number(form.peso_objetivo_g)
      if (Number.isNaN(objetivo) || objetivo < PESO_MINIMO_G) {
        return `El peso objetivo debe ser al menos de ${PESO_MINIMO_G} g.`
      }
      if (objetivo > PESO_MAXIMO_G) {
        return `Ingrese un peso objetivo razonable (máximo ${PESO_MAXIMO_G.toLocaleString('es-CO')} g).`
      }
    }
    if (form.cantidad_aves_pesadas) {
      const cant = Number(form.cantidad_aves_pesadas)
      if (Number.isNaN(cant) || cant < 1) return 'La cantidad de aves pesadas debe ser al menos 1.'
      if (cant > AVES_MAXIMO) {
        return `La cantidad de aves pesadas no puede superar ${AVES_MAXIMO.toLocaleString('es-CO')}.`
      }
    }
  }
  if (tipo === 'mortalidad') {
    const cant = Number(form.cantidad_aves)
    if (!form.cantidad_aves || Number.isNaN(cant) || cant < 1) return 'La cantidad de aves fallecidas debe ser al menos 1.'
    if (cant > AVES_MAXIMO) {
      return `La cantidad de aves fallecidas no puede superar ${AVES_MAXIMO.toLocaleString('es-CO')}.`
    }
  }
  return ''
}

const texto = (valor: number | string | null | undefined) => (valor === null || valor === undefined ? '' : String(valor))

export function formularioDesde(tipo: TipoRegistro, registro: Pesaje | Mortalidad | EventoSanitario): FormularioRegistro {
  const base = { ...FORMULARIO_INICIAL, fecha: registro.fecha.slice(0, 10), observaciones: texto(registro.observaciones) }
  if (tipo === 'peso') {
    const pesaje = registro as Pesaje
    return {
      ...base,
      peso_promedio_g: texto(pesaje.peso_promedio_g),
      cantidad_aves_pesadas: texto(pesaje.cantidad_aves_pesadas),
      peso_objetivo_g: texto(pesaje.peso_objetivo_g),
    }
  }
  if (tipo === 'mortalidad') {
    const muerte = registro as Mortalidad
    return { ...base, cantidad_aves: texto(muerte.cantidad_aves), causa_presuntiva: texto(muerte.causa_presuntiva) }
  }
  const evento = registro as EventoSanitario
  return { ...base, tipo: evento.tipo, producto: texto(evento.producto), diagnostico: texto(evento.diagnostico) }
}

export function payloadRegistro(tipo: TipoRegistro, form: FormularioRegistro, loteId: number): object {
  const base = {
    lote_id: loteId,
    fecha: form.fecha,
    metodo_registro: 'manual',
    observaciones: form.observaciones || undefined,
  }
  if (tipo === 'peso') {
    return {
      ...base,
      peso_promedio_g: Number(form.peso_promedio_g),
      cantidad_aves_pesadas: form.cantidad_aves_pesadas ? Number(form.cantidad_aves_pesadas) : undefined,
      peso_objetivo_g: form.peso_objetivo_g ? Number(form.peso_objetivo_g) : undefined,
    }
  }
  if (tipo === 'mortalidad') {
    return { ...base, cantidad_aves: Number(form.cantidad_aves), causa_presuntiva: form.causa_presuntiva || undefined }
  }
  return { ...base, tipo: form.tipo, producto: form.producto || undefined, diagnostico: form.diagnostico || undefined }
}
