// data.ts — Tipos y datos mock del módulo de Alertas (EP-05).
// Cuando exista el backend real, este archivo se reemplaza por llamadas
// a la API de alertas. Los criterios de severidad siguen el Manual Italcol.

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

// ─── Datos mock ───────────────────────────────────────────────────────────────
// Las alertas ACTIVAS ya no se escriben a mano aquí: AlertasPage.tsx las
// calcula solas para todos los galpones, a partir de los mismos sensores que
// muestra Monitoreo (reales donde ya hay un ESP32 conectado, de ejemplo donde
// no) — ver `generarAlertasSensores` en AlertasPage.tsx. Así, un cambio en los
// datos de Monitoreo no puede desincronizarse de lo que ve Alertas, porque es
// literalmente la misma fuente.
// Lo único que sigue viviendo aquí es el HISTÓRICO ya cerrado, que no se
// deriva de ningún estado actual — son hechos pasados.

export const ALERTAS_MOCK: Alerta[] = [
  // Alertas ya cerradas — histórico
  {
    id: 4,
    galpon: 'Galpón Norte (GP-01)',
    zona: 'Zona Centro',
    variable: 'CO₂',
    valorActual: 3200,
    unidad: 'ppm',
    rangoMin: 0,
    rangoMax: 3000,
    severidad: 'advertencia',
    estado: 'cerrada',
    fechaHora: '29/06/2026 10:15',
    minutosActiva: 12,
    responsable: 'Edison (Operario)',
    accionCierre: 'Se activó el extractor 2 y se revisaron las cortinas laterales.',
  },
  {
    id: 5,
    galpon: 'Galpón Sur (GP-02)',
    zona: 'Zona Sur',
    variable: 'Temperatura',
    valorActual: 34.1,
    unidad: '°C',
    rangoMin: 28,
    rangoMax: 33,
    severidad: 'critica',
    estado: 'cerrada',
    fechaHora: '28/06/2026 14:22',
    minutosActiva: 8,
    responsable: 'Edison (Operario)',
    accionCierre: 'Se abrieron las cortinas y se encendió el nebulizador.',
  },
]
