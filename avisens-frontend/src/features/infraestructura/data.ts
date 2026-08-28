// data.ts — Tipos y datos mock del módulo de Infraestructura (EP-08 HU-34 a HU-37).
// Registra galpones, zonas, sensores y estado de equipos con ciclos de mantenimiento.

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Estado operativo de un equipo IoT o físico del galpón
export type EstadoEquipo = 'activo' | 'falla' | 'mantenimiento' | 'inactivo'

// Tipo de equipo registrado en el plano del galpón
export type TipoEquipo =
  | 'sensor_temp'   // Sensor de temperatura
  | 'sensor_hum'    // Sensor de humedad
  | 'sensor_co2'    // Sensor de CO₂
  | 'sensor_nh3'    // Sensor de amoniaco
  | 'extractor'     // Ventilador extractor
  | 'bebedero'      // Bebedero nipple
  | 'comedero'      // Comedero automático
  | 'lampara'       // Lámpara de calefacción / iluminación
  | 'nebulizador'   // Sistema de nebulización para refrigeración

// Un equipo o sensor registrado en el galpón
export type Equipo = {
  id: number
  codigo: string
  tipo: TipoEquipo
  nombre: string
  galpon: string
  zona: string         // Zona donde está instalado
  estado: EstadoEquipo
  vidaUtilPct: number  // % de vida útil consumida (alerta si >= 95%)
  ultimoMantenimiento: string  // DD/MM/YYYY
  proximoMantenimiento: string // DD/MM/YYYY
  observacion?: string
}

// Zona física dentro de un galpón
export type ZonaGalpon = {
  codigo: string
  nombre: string
  areaM2: number
}

// Registro de un galpón en el módulo de infraestructura
export type GalponInfraestructura = {
  id: number
  codigo: string
  nombre: string
  areaM2: number
  capacidadAves: number
  ubicacion: string
  zonas: ZonaGalpon[]
}

// ─── Datos mock ───────────────────────────────────────────────────────────────

export const GALPONES_INFRA: GalponInfraestructura[] = [
  {
    id: 1, codigo: 'GP-01', nombre: 'Galpón Norte', areaM2: 1200, capacidadAves: 20000,
    ubicacion: 'Sector norte de la granja',
    zonas: [
      { codigo: 'GP01-N', nombre: 'Zona Norte',  areaM2: 400 },
      { codigo: 'GP01-C', nombre: 'Zona Centro', areaM2: 400 },
      { codigo: 'GP01-S', nombre: 'Zona Sur',    areaM2: 400 },
    ],
  },
  {
    id: 2, codigo: 'GP-02', nombre: 'Galpón Sur', areaM2: 1000, capacidadAves: 18000,
    ubicacion: 'Sector sur de la granja',
    zonas: [
      { codigo: 'GP02-N', nombre: 'Zona Norte',  areaM2: 500 },
      { codigo: 'GP02-S', nombre: 'Zona Sur',    areaM2: 500 },
    ],
  },
  {
    id: 3, codigo: 'GP-03', nombre: 'Galpón Este', areaM2: 1100, capacidadAves: 20000,
    ubicacion: 'Sector este de la granja',
    zonas: [
      { codigo: 'GP03-N', nombre: 'Zona Norte',  areaM2: 370 },
      { codigo: 'GP03-C', nombre: 'Zona Centro', areaM2: 370 },
      { codigo: 'GP03-S', nombre: 'Zona Sur',    areaM2: 360 },
    ],
  },
  {
    id: 4, codigo: 'GP-04', nombre: 'Galpón Oeste', areaM2: 800, capacidadAves: 14000,
    ubicacion: 'Sector oeste de la granja',
    zonas: [
      { codigo: 'GP04-C', nombre: 'Zona Única', areaM2: 800 },
    ],
  },
]

export const EQUIPOS_MOCK: Equipo[] = [
  // GP-01 equipos
  { id: 1,  codigo: 'S-T01', tipo: 'sensor_temp', nombre: 'Sensor Temp Norte',    galpon: 'GP-01', zona: 'Zona Norte',  estado: 'activo',       vidaUtilPct: 42, ultimoMantenimiento: '01/03/2026', proximoMantenimiento: '01/09/2026' },
  { id: 2,  codigo: 'S-H01', tipo: 'sensor_hum',  nombre: 'Sensor Hum Norte',     galpon: 'GP-01', zona: 'Zona Norte',  estado: 'activo',       vidaUtilPct: 38, ultimoMantenimiento: '01/03/2026', proximoMantenimiento: '01/09/2026' },
  { id: 3,  codigo: 'S-N01', tipo: 'sensor_nh3',  nombre: 'Sensor NH₃ Sur',       galpon: 'GP-01', zona: 'Zona Sur',    estado: 'activo',       vidaUtilPct: 60, ultimoMantenimiento: '15/01/2026', proximoMantenimiento: '15/07/2026', observacion: 'Calibración pendiente' },
  { id: 4,  codigo: 'EX-01', tipo: 'extractor',   nombre: 'Extractor Norte 1',    galpon: 'GP-01', zona: 'Zona Norte',  estado: 'activo',       vidaUtilPct: 55, ultimoMantenimiento: '10/02/2026', proximoMantenimiento: '10/08/2026' },
  { id: 5,  codigo: 'EX-02', tipo: 'extractor',   nombre: 'Extractor Sur 1',      galpon: 'GP-01', zona: 'Zona Sur',    estado: 'activo',       vidaUtilPct: 55, ultimoMantenimiento: '10/02/2026', proximoMantenimiento: '10/08/2026' },

  // GP-02 equipos
  { id: 6,  codigo: 'S-T02', tipo: 'sensor_temp', nombre: 'Sensor Temp Norte',    galpon: 'GP-02', zona: 'Zona Norte',  estado: 'activo',       vidaUtilPct: 30, ultimoMantenimiento: '20/04/2026', proximoMantenimiento: '20/10/2026' },
  { id: 7,  codigo: 'S-H02', tipo: 'sensor_hum',  nombre: 'Sensor Hum Norte',     galpon: 'GP-02', zona: 'Zona Norte',  estado: 'activo',       vidaUtilPct: 30, ultimoMantenimiento: '20/04/2026', proximoMantenimiento: '20/10/2026' },

  // GP-03 equipos — con falla (coincide con alerta crítica de temperatura)
  { id: 8,  codigo: 'S-T03', tipo: 'sensor_temp', nombre: 'Sensor Temp Sur',      galpon: 'GP-03', zona: 'Zona Sur',    estado: 'activo',       vidaUtilPct: 75, ultimoMantenimiento: '01/12/2025', proximoMantenimiento: '01/06/2026', observacion: 'Próximo a mantenimiento' },
  { id: 9,  codigo: 'EX-03', tipo: 'extractor',   nombre: 'Extractor Centro',     galpon: 'GP-03', zona: 'Zona Centro', estado: 'falla',        vidaUtilPct: 98, ultimoMantenimiento: '01/11/2025', proximoMantenimiento: '01/05/2026', observacion: 'Falla mecánica — rodamiento' },
  { id: 10, codigo: 'NB-01', tipo: 'nebulizador', nombre: 'Nebulizador Sur',      galpon: 'GP-03', zona: 'Zona Sur',    estado: 'mantenimiento', vidaUtilPct: 80, ultimoMantenimiento: '28/06/2026', proximoMantenimiento: '28/12/2026' },

  // GP-04 equipos — inactivos (galpón vacío)
  { id: 11, codigo: 'S-T04', tipo: 'sensor_temp', nombre: 'Sensor Temp Única',   galpon: 'GP-04', zona: 'Zona Única',  estado: 'inactivo',     vidaUtilPct: 20, ultimoMantenimiento: '15/05/2026', proximoMantenimiento: '15/11/2026' },
]
