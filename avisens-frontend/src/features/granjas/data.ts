// data.ts — Tipos y datos mock del módulo de Granjas (EP-08 HU-34).
// Extiende los datos básicos de `shared/data/farm.ts` con más detalle
// para la gestión de granjas y galpones del Propietario.

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Estado operativo de un galpón
export type EstadoGalpon = 'activo' | 'vacio' | 'preparacion' | 'mantenimiento'

// Detalle de un galpón dentro de una granja
export type GalponDetalle = {
  id: number
  codigo: string
  nombre: string
  areaM2: number
  capacidadAves: number
  estado: EstadoGalpon
  loteActual?: string     // Nombre del lote activo (si hay uno)
  avesActuales: number
  diaVida: number         // Día de vida del lote (0 si está vacío)
  ultimoCiclo?: string    // Fecha de cierre del último ciclo
}

// Una granja con toda su información
export type GranjaDetalle = {
  id: number
  nombre: string
  propietario: string
  municipio: string
  departamento: string
  coordenadas?: string    // Coordenadas GPS aproximadas
  areaTotalHa: number     // Área total en hectáreas
  galpones: GalponDetalle[]
}

// ─── Datos mock ───────────────────────────────────────────────────────────────

export const GRANJAS_DETALLE: GranjaDetalle[] = [
  {
    id: 1,
    nombre: 'Granja Las Palmas',
    propietario: 'Don Carlos (Dueño)',
    municipio: 'Popayán',
    departamento: 'Cauca',
    coordenadas: '2.4448° N, 76.6147° O',
    areaTotalHa: 3.5,
    galpones: [
      { id: 1, codigo: 'GP-01', nombre: 'Galpón Norte', areaM2: 1200, capacidadAves: 20000, estado: 'activo',       loteActual: 'Lote-2026-A', avesActuales: 18560, diaVida: 32 },
      { id: 2, codigo: 'GP-02', nombre: 'Galpón Sur',   areaM2: 1000, capacidadAves: 18000, estado: 'activo',       loteActual: 'Lote-2026-B', avesActuales: 17200, diaVida: 18 },
      { id: 3, codigo: 'GP-03', nombre: 'Galpón Este',  areaM2: 1100, capacidadAves: 20000, estado: 'activo',       loteActual: 'Lote-2026-C', avesActuales: 19800, diaVida: 41 },
      { id: 4, codigo: 'GP-04', nombre: 'Galpón Oeste', areaM2: 800,  capacidadAves: 14000, estado: 'vacio',        avesActuales: 0,     diaVida: 0, ultimoCiclo: '15/04/2026' },
    ],
  },
  {
    id: 2,
    nombre: 'Granja El Cedro',
    propietario: 'Don Carlos (Dueño)',
    municipio: 'Cajibío',
    departamento: 'Cauca',
    areaTotalHa: 2.0,
    galpones: [
      { id: 5, codigo: 'GP-C1', nombre: 'Galpón 1', areaM2: 900, capacidadAves: 16000, estado: 'preparacion', avesActuales: 0, diaVida: 0, ultimoCiclo: '10/05/2026' },
      { id: 6, codigo: 'GP-C2', nombre: 'Galpón 2', areaM2: 900, capacidadAves: 16000, estado: 'vacio',       avesActuales: 0, diaVida: 0, ultimoCiclo: '20/02/2026' },
    ],
  },
  {
    id: 3,
    nombre: 'Granja San José',
    propietario: 'Don Carlos (Dueño)',
    municipio: 'Timbío',
    departamento: 'Cauca',
    areaTotalHa: 2.8,
    galpones: [
      { id: 7, codigo: 'GP-J1', nombre: 'Galpón A', areaM2: 1050, capacidadAves: 18000, estado: 'mantenimiento', avesActuales: 0, diaVida: 0 },
      { id: 8, codigo: 'GP-J2', nombre: 'Galpón B', areaM2: 1050, capacidadAves: 18000, estado: 'vacio',         avesActuales: 0, diaVida: 0 },
      { id: 9, codigo: 'GP-J3', nombre: 'Galpón C', areaM2: 1050, capacidadAves: 18000, estado: 'vacio',         avesActuales: 0, diaVida: 0 },
    ],
  },
]
