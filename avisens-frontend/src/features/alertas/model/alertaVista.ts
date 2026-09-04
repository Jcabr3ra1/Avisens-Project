// Forma con la que la pantalla pinta una alerta, venga del backend o
// calculada en vivo desde los sensores. Vivía en data.ts.

export type SeveridadAlerta = 'critica' | 'advertencia' | 'info'

export type EstadoAlerta = 'activa' | 'cerrada' | 'escalada'

export type Alerta = {
  id: number
  galpon: string
  zona: string
  variable: string
  valorActual: number
  unidad: string
  rangoMin: number
  rangoMax: number
  severidad: SeveridadAlerta
  estado: EstadoAlerta
  fechaHora: string
  minutosActiva: number
  responsable?: string
  accionCierre?: string
}
