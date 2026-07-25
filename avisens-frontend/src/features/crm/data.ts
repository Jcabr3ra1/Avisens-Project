// data.ts — Tipos y datos mock del módulo CRM (EP-01 HU-08).
// Panel de gestión de leads capturados por el chatbot de cotización.
// El puntaje de calificación va de 0 a 14 según la matriz de los 5 bloques.

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Estado del lead en el pipeline comercial
// Según EP-01 HU-06: ≥12 = visita, 7-11 = demo, <7 = nutrición, descartado
export type EstadoLead =
  | 'caliente'   // Puntaje ≥ 12 — visita presencial programada
  | 'tibio'      // Puntaje 7-11 — demo remota agendada
  | 'frio'       // Puntaje < 7 — flujo de nutrición automático
  | 'descartado' // Sin poder de decisión o sin interés real
  | 'cerrado'    // Convirtió en cliente

// Un lead capturado por el chatbot de cotización
export type Lead = {
  id: number
  nombre: string         // Nombre del prospecto (A1 del chatbot)
  granja: string         // Nombre de la granja
  municipio: string      // Municipio de la granja (A2 del chatbot)
  rol: string            // Rol del prospecto: 'Propietario' | 'Administrador'
  galpones: number       // Número de galpones (C1 del chatbot)
  avesLote: number       // Aves por lote promedio (C2 del chatbot)
  puntaje: number        // Puntaje de calificación 0-14
  estado: EstadoLead
  fechaContacto: string  // Fecha del primer contacto con el chatbot (DD/MM/YYYY)
  telefono: string
  correo?: string
  asesor: string         // Asesor comercial asignado
  doloresDetectados: string[] // Respuestas B del chatbot (dolores identificados)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Rangos de puntaje por estado (para mostrar en la UI)
export const RANGOS_PUNTAJE: Record<EstadoLead, string> = {
  caliente:   '12 – 14 pts',
  tibio:      '7 – 11 pts',
  frio:       '0 – 6 pts',
  descartado: 'N/A',
  cerrado:    'Convertido',
}

// ─── Datos mock ───────────────────────────────────────────────────────────────

export const LEADS_MOCK: Lead[] = [
  // Lead caliente — visita programada (12 días sin contacto → urgente)
  {
    id: 1, nombre: 'Pedro Andrade', granja: 'Granja La Esperanza', municipio: 'Santander de Quilichao, Cauca',
    rol: 'Propietario', galpones: 3, avesLote: 18000, puntaje: 13, estado: 'caliente',
    fechaContacto: '28/06/2026', telefono: '316-450-2200', correo: 'pedro.andrade@gmail.com',
    asesor: 'Admin Avisens',
    doloresDetectados: ['Mortalidad elevada (>3%)', 'Sin alertas en tiempo real'],
  },
  // Lead caliente — visita confirmada (13 días sin contacto → urgente)
  {
    id: 2, nombre: 'Sandra Mosquera', granja: 'Granja El Roble', municipio: 'Miranda, Cauca',
    rol: 'Propietario', galpones: 2, avesLote: 15000, puntaje: 12, estado: 'caliente',
    fechaContacto: '27/06/2026', telefono: '318-220-1400',
    asesor: 'Admin Avisens',
    doloresDetectados: ['Sin monitoreo remoto', 'Registro manual en cuaderno'],
  },
  // Lead caliente urgente — puntaje máximo (2 días → reciente)
  {
    id: 8, nombre: 'Camilo Ríos', granja: 'Avícola San Rafael', municipio: 'Santander de Quilichao, Cauca',
    rol: 'Propietario', galpones: 4, avesLote: 22000, puntaje: 14, estado: 'caliente',
    fechaContacto: '08/07/2026', telefono: '320-300-8800', correo: 'camilo.rios@avicola.com',
    asesor: 'Admin Avisens',
    doloresDetectados: ['Pérdidas sin diagnóstico', 'Sin trazabilidad de lotes'],
  },
  // Lead tibio — demo agendada (15 días → alerta)
  {
    id: 3, nombre: 'Jorge Muñoz', granja: 'Granja El Progreso', municipio: 'Puerto Tejada, Cauca',
    rol: 'Administrador', galpones: 1, avesLote: 8000, puntaje: 9, estado: 'tibio',
    fechaContacto: '25/06/2026', telefono: '313-780-6600',
    asesor: 'Admin Avisens',
    doloresDetectados: ['Mortalidad ocasional por calor'],
  },
  // Lead tibio — evaluando opciones (16 días → alerta)
  {
    id: 4, nombre: 'Lucía Castaño', granja: 'Avícola La Bonanza', municipio: 'Caldono, Cauca',
    rol: 'Propietario', galpones: 2, avesLote: 12000, puntaje: 8, estado: 'tibio',
    fechaContacto: '24/06/2026', telefono: '312-540-9900',
    asesor: 'Admin Avisens',
    doloresDetectados: ['Problemas con la conversión alimenticia'],
  },
  // Lead tibio — demo programada (5 días → normal)
  {
    id: 9, nombre: 'María Fernanda López', granja: 'Granja El Cedro', municipio: 'Patía, Cauca',
    rol: 'Propietario', galpones: 2, avesLote: 11000, puntaje: 10, estado: 'tibio',
    fechaContacto: '05/07/2026', telefono: '314-670-5500',
    asesor: 'Admin Avisens',
    doloresDetectados: ['Control manual de temperatura'],
  },
  // Lead tibio — cotización en curso (8 días → normal)
  {
    id: 10, nombre: 'Roberto Díaz', granja: 'Granja Los Pinos', municipio: 'Timbío, Cauca',
    rol: 'Administrador', galpones: 2, avesLote: 9000, puntaje: 7, estado: 'tibio',
    fechaContacto: '02/07/2026', telefono: '316-990-2200',
    asesor: 'Admin Avisens',
    doloresDetectados: [],
  },
  // Lead frío — en flujo de nutrición (20 días)
  {
    id: 5, nombre: 'Hernán Vásquez', granja: 'Finca El Palmar', municipio: 'Almaguer, Cauca',
    rol: 'Propietario', galpones: 1, avesLote: 4000, puntaje: 5, estado: 'frio',
    fechaContacto: '20/06/2026', telefono: '315-100-3300',
    asesor: 'Admin Avisens',
    doloresDetectados: [],
  },
  // Lead frío — pequeño productor (10 días)
  {
    id: 11, nombre: 'Gloria Hurtado', granja: 'Finca Las Margaritas', municipio: 'Rosas, Cauca',
    rol: 'Propietario', galpones: 1, avesLote: 3500, puntaje: 3, estado: 'frio',
    fechaContacto: '30/06/2026', telefono: '321-450-7700',
    asesor: 'Admin Avisens',
    doloresDetectados: [],
  },
  // Descartado — sin poder de decisión
  {
    id: 6, nombre: 'Andrés Toro', granja: 'N/A — empleado', municipio: 'Popayán, Cauca',
    rol: 'Operario', galpones: 0, avesLote: 0, puntaje: 0, estado: 'descartado',
    fechaContacto: '18/06/2026', telefono: '317-890-4400',
    asesor: 'Admin Avisens',
    doloresDetectados: [],
  },
  // Cerrado — ya es cliente
  {
    id: 7, nombre: 'Don Carlos (Dueño)', granja: 'Granja Las Palmas', municipio: 'Popayán, Cauca',
    rol: 'Propietario', galpones: 4, avesLote: 18000, puntaje: 14, estado: 'cerrado',
    fechaContacto: '10/01/2026', telefono: '311-220-4455', correo: 'dueno@avisens.com',
    asesor: 'Admin Avisens',
    doloresDetectados: ['Mortalidad elevada', 'Sin alertas', 'Registro manual'],
  },
]
