export type EstadoConexion = 'conectado' | 'sin_reportar' | 'nunca'

export type ControladorConProblema = {
  id: number
  nombre: string | null
  codigo_topic: string
  ultima_conexion: string | null
  estado: EstadoConexion
  galpon: {
    id: number
    nombre: string
    granja: { id: number; nombre: string; organizacion: { id: number; nombre: string } }
  }
}

export type ConectividadPlataforma = {
  ventana_minutos: number
  total: number
  conectados: number
  sin_reportar: number
  nunca: number
  problemas: ControladorConProblema[]
}

export function haceCuanto(fecha: string | null, ahora: Date = new Date()): string {
  if (!fecha) return 'Nunca ha reportado'
  const minutos = Math.max(0, Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 60_000))
  if (minutos < 60) return `Sin reportar hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Sin reportar hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return `Sin reportar hace ${dias} ${dias === 1 ? 'día' : 'días'}`
}
