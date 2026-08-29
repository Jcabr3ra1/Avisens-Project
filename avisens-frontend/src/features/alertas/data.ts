// data.ts — Tipos del módulo de Alertas (EP-05). Los criterios de severidad
// siguen el Manual Italcol. Los datos viven en AlertasPage.tsx: las activas
// se derivan en vivo de useMonitoreoAmbiental, el historial viene de la API
// real /alertas (shared/api/alertas.ts).

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Nivel de criticidad de la alerta
export type SeveridadAlerta = 'critica' | 'advertencia' | 'info'

// Estado actual en el ciclo de vida de la alerta
export type EstadoAlerta = 'activa' | 'cerrada' | 'escalada'

// Una alerta generada por el motor de reglas del sistema IoT
export type Alerta = {
  id: number
  galpon: string           // Nombre del galpón donde se detectó
  zona: string             // Zona específica dentro del galpón
  variable: string         // Variable fuera de rango: 'Temperatura', 'NH₃'…
  valorActual: number      // Valor leído en el momento de la alerta
  unidad: string           // Unidad de medida del valor
  rangoMin: number         // Límite inferior del rango objetivo
  rangoMax: number         // Límite superior del rango objetivo
  severidad: SeveridadAlerta
  estado: EstadoAlerta
  fechaHora: string        // Fecha y hora de detección
  minutosActiva: number    // Cuánto tiempo lleva activa (para escalamiento)
  responsable?: string     // Operario asignado (si ya fue aceptada)
  accionCierre?: string    // Descripción de la acción correctiva (si fue cerrada)
}

