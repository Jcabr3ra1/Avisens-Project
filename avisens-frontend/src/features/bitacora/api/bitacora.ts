import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'
import type { EventoSanitario, Mortalidad, Pesaje } from '../model/bitacora'
export type { EventoSanitario, Mortalidad, Pesaje } from '../model/bitacora'
const listar = async <T>(ruta:string) => (await api.get<PaginatedResponse<T>>(ruta,{params:{page:1,limit:200}})).data.data
export const listarPesajes = () => listar<Pesaje>('/pesajes')
export const listarMortalidad = () => listar<Mortalidad>('/registros-mortalidad')
export const listarEventosSanitarios = () => listar<EventoSanitario>('/eventos-sanitarios')
export const crearPesaje = (datos:object) => api.post<Pesaje>('/pesajes',datos).then(({data})=>data)
export const crearMortalidad = (datos:object) => api.post<Mortalidad>('/registros-mortalidad',datos).then(({data})=>data)
export const crearEventoSanitario = (datos:object) => api.post<EventoSanitario>('/eventos-sanitarios',datos).then(({data})=>data)
export const eliminarPesaje = (id:number) => api.delete(`/pesajes/${id}`)
export const eliminarMortalidad = (id:number) => api.delete(`/registros-mortalidad/${id}`)
export const eliminarEventoSanitario = (id:number) => api.delete(`/eventos-sanitarios/${id}`)
