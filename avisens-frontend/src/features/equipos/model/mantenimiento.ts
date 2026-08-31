export type DatosMantenimiento = {
  tipo: string
  fecha_programada: string
  tecnico_responsable: string
  descripcion: string
  costo_cop: string
}

export const FORMULARIO_MANTENIMIENTO_INICIAL: DatosMantenimiento = {
  tipo: 'preventivo',
  fecha_programada: '',
  tecnico_responsable: '',
  descripcion: '',
  costo_cop: '',
}

export const TIPOS_MANTENIMIENTO = ['preventivo', 'correctivo', 'predictivo']
export const ESTADOS_MANTENIMIENTO = ['programado', 'en_proceso', 'completado', 'cancelado']
