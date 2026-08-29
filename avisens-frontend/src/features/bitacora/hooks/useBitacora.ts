import { useCallback, useEffect, useState } from 'react'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import { listarConsumosDiarios, type ConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import { mensajeDeError } from '@shared/utils/errores'
import { crearEventoSanitario, crearMortalidad, crearPesaje, eliminarEventoSanitario, eliminarMortalidad, eliminarPesaje, listarEventosSanitarios, listarMortalidad, listarPesajes } from '../api/bitacora'
import type { EventoSanitario, Mortalidad, Pesaje, TipoRegistro } from '../model/bitacora'

export function useBitacora() {
  const [lotes,setLotes]=useState<Lote[]>([]); const [pesajes,setPesajes]=useState<Pesaje[]>([]); const [mortalidad,setMortalidad]=useState<Mortalidad[]>([]); const [sanitarios,setSanitarios]=useState<EventoSanitario[]>([]); const [consumos,setConsumos]=useState<ConsumoDiario[]>([]); const [cargando,setCargando]=useState(true); const [error,setError]=useState('')
  const recargar=useCallback(async()=>{setCargando(true);setError('');try{const [l,p,m,s,c]=await Promise.all([listarLotes(),listarPesajes(),listarMortalidad(),listarEventosSanitarios(),listarConsumosDiarios()]);setLotes(l.filter(x=>x.estado==='activo'));setPesajes(p);setMortalidad(m);setSanitarios(s);setConsumos(c)}catch(e){setError(mensajeDeError(e,'No se pudo cargar la bitácora.'))}finally{setCargando(false)}},[])
  useEffect(()=>{void recargar()},[recargar])
  const crear=async(tipo:TipoRegistro,datos:object)=>{if(tipo==='peso'){const r=await crearPesaje(datos);setPesajes(x=>[r,...x])}else if(tipo==='mortalidad'){const r=await crearMortalidad(datos);setMortalidad(x=>[r,...x])}else{const r=await crearEventoSanitario(datos);setSanitarios(x=>[r,...x])}}
  const eliminar=async(tipo:TipoRegistro,id:number)=>{if(tipo==='peso'){await eliminarPesaje(id);setPesajes(x=>x.filter(r=>r.id!==id))}else if(tipo==='mortalidad'){await eliminarMortalidad(id);setMortalidad(x=>x.filter(r=>r.id!==id))}else{await eliminarEventoSanitario(id);setSanitarios(x=>x.filter(r=>r.id!==id))}}
  return {lotes,pesajes,mortalidad,sanitarios,consumos,cargando,error,recargar,crear,eliminar}
}
