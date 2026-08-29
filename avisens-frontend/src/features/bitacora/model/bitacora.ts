export type Pesaje = { id:number; lote_id:number; fecha:string; peso_promedio_g:number; cantidad_aves_pesadas:number|null; peso_objetivo_g:number|null; observaciones:string|null }
export type Mortalidad = { id:number; lote_id:number; fecha:string; cantidad_aves:number; causa_presuntiva:string|null; disposicion:string|null; observaciones:string|null }
export type EventoSanitario = { id:number; lote_id:number; fecha:string; tipo:string; producto:string|null; diagnostico:string|null; cantidad_aves:number|null; observaciones:string|null }
export type TipoRegistro = 'peso' | 'mortalidad' | 'sanitario'
export type FormularioRegistro = { fecha:string; peso_promedio_g:string; cantidad_aves_pesadas:string; peso_objetivo_g:string; cantidad_aves:string; causa_presuntiva:string; tipo:string; producto:string; diagnostico:string; observaciones:string }
export const FORMULARIO_INICIAL: FormularioRegistro = { fecha:new Date().toISOString().slice(0,10), peso_promedio_g:'', cantidad_aves_pesadas:'', peso_objetivo_g:'', cantidad_aves:'', causa_presuntiva:'', tipo:'vacunacion', producto:'', diagnostico:'', observaciones:'' }
