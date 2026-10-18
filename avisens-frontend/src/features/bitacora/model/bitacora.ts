import { fechaDeHoy } from '@shared/utils/fechas'
export type Pesaje = { id:number; lote_id:number; fecha:string; peso_promedio_g:number; cantidad_aves_pesadas:number|null; peso_objetivo_g:number|null; observaciones:string|null }
export type Mortalidad = { id:number; lote_id:number; fecha:string; cantidad_aves:number; causa_presuntiva:string|null; disposicion:string|null; observaciones:string|null }
export type EventoSanitario = { id:number; lote_id:number; fecha:string; tipo:string; producto:string|null; diagnostico:string|null; cantidad_aves:number|null; observaciones:string|null }
export type TipoRegistro = 'peso' | 'mortalidad' | 'sanitario'
export type FormularioRegistro = { fecha:string; peso_promedio_g:string; cantidad_aves_pesadas:string; peso_objetivo_g:string; cantidad_aves:string; causa_presuntiva:string; tipo:string; producto:string; diagnostico:string; observaciones:string }
export const FORMULARIO_INICIAL: FormularioRegistro = { fecha:fechaDeHoy(), peso_promedio_g:'', cantidad_aves_pesadas:'', peso_objetivo_g:'', cantidad_aves:'', causa_presuntiva:'', tipo:'vacunacion', producto:'', diagnostico:'', observaciones:'' }

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
