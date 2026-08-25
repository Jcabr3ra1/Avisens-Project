// model.tsx — Datos mock, tipos y configuración del dashboard
// Contiene: datos de granjas/galpones, métricas de sensores, acciones rápidas
// Los textos usan lenguaje campesino colombiano en todas las descripciones
import type { ReactNode } from 'react'
import {
  IcDoc, IcThermo, IcDrop, IcFan, IcSeed, IcCloud,
  IcCal, IcEgg, IcSettings, IcSparkle, IcHeart,
  IcScale, IcPhone, IcNote,
} from '@shared/ui/icons/icons'

// Datos de dominio compartidos (granjas/galpones) viven en shared/data.
// Se re-exportan aquí para que el resto del dashboard los siga importando desde './model'.
export type { GalponStatus, Granja, Galpon } from '@shared/data/farm'
export { GRANJAS, GALPONES } from '@shared/data/farm'

export type QuickActionDef = {
  id: string
  label: string
  icon: ReactNode
  color?: string
}

export type MetricId = 'temp' | 'hum' | 'vent' | 'alim' | 'agua'

/**
 * Sistema canónico de tonos semánticos.
 * - ok      → verde   → dentro de umbral / saludable
 * - warning → ámbar   → necesita atención
 * - danger  → rojo    → crítico
 * - info    → azul    → informativo, sin juicio
 * - neutral → gris    → registro / sin juicio
 *
 * El COLOR DEL CHART y de la pill de estado SIEMPRE viene de aquí.
 * El reconocimiento de variable (qué métrica es) vive en el ícono del tab (categoryColor).
 */
export type Tone = 'ok' | 'warning' | 'danger' | 'info' | 'neutral'

export const TONE_HEX: Record<Tone, string> = {
  ok:      '#10b981',
  warning: '#f59e0b',
  danger:  '#ef4444',
  info:    '#3b82f6',
  neutral: '#7a8e84',
}

export const TONE_VAR: Record<Tone, string> = {
  ok:      'var(--green-d)',
  warning: 'var(--amber)',
  danger:  'var(--red)',
  info:    'var(--info)',
  neutral: 'var(--text3)',
}

export const TONE_LABEL: Record<Tone, string> = {
  ok:      'Bien',
  warning: 'Atención',
  danger:  'Urgente',
  info:    'En monitoreo',
  neutral: 'Normal',
}

export type MetricTab = {
  id: MetricId
  label: string
  short: string
  icon: ReactNode
  value: string
  unit: string
  /** estado actual de la métrica — gobierna chart fill + pill + énfasis */
  tone: Tone
  /** etiqueta del estado (override del default TONE_LABEL[tone]) */
  status?: string
  sub: string
  /** color identificador de la variable (sólo para el ícono del tab) */
  categoryColor: string
  data?: number[]
  chartType?: 'bar' | 'area'
  yTicks?: number[]
}

/**
 * Catálogo de accesos rápidos del topbar.
 *
 * Criterio: cada item debe representar una OPERACIÓN frecuente
 * que ahorre al operador navegación. NO cosas que el navegador o el
 * sistema ya hacen (refrescar, auto-sync, etc).
 */
export const QUICK_ACTION_CATALOG: QuickActionDef[] = [
  // Operaciones diarias / frecuentes
  { id: 'bitacora',   label: 'Registrar',          icon: <IcNote     size={14} />, color: 'var(--info)'    },
  { id: 'mortalidad', label: 'Mortalidad',         icon: <IcHeart    size={14} />, color: 'var(--red)'     },
  { id: 'pesaje',     label: 'Pesar aves',        icon: <IcScale    size={14} />, color: 'var(--amber)'   },
  { id: 'tarea',      label: 'Programar',          icon: <IcCal      size={14} />, color: 'var(--info)'    },
  { id: 'lote',       label: 'Nuevo lote',         icon: <IcEgg      size={14} />, color: 'var(--green-d)' },
  { id: 'reporte',    label: 'Reporte del día',    icon: <IcDoc      size={14} /> },
  { id: 'ia',         label: 'Preguntar a AVIA',   icon: <IcSparkle  size={14} />, color: 'var(--green-d)' },
  { id: 'umbrales',   label: 'Ajustar rangos',     icon: <IcSettings size={14} /> },
  { id: 'calibrar',   label: 'Calibrar sensores',  icon: <IcThermo   size={14} />, color: 'var(--amber)'   },
  { id: 'tecnico',    label: 'Llamar al técnico',  icon: <IcPhone    size={14} />, color: 'var(--red)'     },
]

export const MAX_QUICK_ACTIONS = 5
export const DEFAULT_QUICK_ACTIONS = ['bitacora', 'tarea', 'ia']

export const tempBars     = [22, 24, 26, 28, 29, 30, 32, 33, 32, 30, 28, 27, 26, 28, 30, 31, 32, 31, 30, 29, 28, 27, 26, 25]
export const humBars      = [55, 58, 60, 62, 64, 66, 68, 70, 72, 70, 68, 64, 60, 58, 56, 55, 57, 60, 63, 66, 68, 67, 65, 62]
export const foodArea     = [10, 20, 40, 60, 80, 100, 140, 170, 200, 220, 230, 240, 240, 240, 240, 235, 230, 225, 220, 215, 210, 205, 200, 195]
export const waterArea    = [50, 120, 200, 300, 420, 560, 700, 820, 930, 1010, 1080, 1120, 1130, 1130, 1130, 1130, 1130, 1130, 1125, 1125, 1125, 1125, 1125, 1125]
export const flockTrend     = [1.2, 1.4, 1.6, 1.8, 1.9, 2.0, 2.1, 2.1, 2.05, 2.05, 2.1]
export const wellbeingTrend = [60, 62, 65, 64, 68, 70, 73, 75, 76, 78, 80]

export const METRIC_TABS: MetricTab[] = [
  { id: 'temp', label: 'Temperatura',     short: 'Temp.',   icon: <IcThermo size={14} />, value: '28.6',  unit: '°C', tone: 'ok',      sub: 'Promedio de las 3 zonas · Rango ideal 25–29 °C', categoryColor: '#f59e0b', data: tempBars,  chartType: 'bar',  yTicks: [0, 10, 20, 30, 40]  },
  { id: 'hum',  label: 'Humedad',         short: 'Humedad', icon: <IcDrop   size={14} />, value: '58',    unit: '%',  tone: 'ok',      sub: 'Rango ideal 55–65 % · cama en buen estado',   categoryColor: '#3b82f6', data: humBars,   chartType: 'bar',  yTicks: [0, 25, 50, 75, 100] },
  { id: 'vent', label: 'Ventilación',     short: 'Vent.',   icon: <IcFan    size={14} />, value: '60',    unit: '%',  tone: 'info',    status: 'Auto', sub: 'Se regulan solos · 6 extractores',             categoryColor: 'var(--text2)' },
  { id: 'alim', label: 'Alimento',        short: 'Alim.',   icon: <IcSeed   size={14} />, value: '245',   unit: 'kg', tone: 'neutral', status: 'Hoy',  sub: 'Meta del día 240 kg · van comiendo bien',      categoryColor: '#10b981', data: foodArea,  chartType: 'area', yTicks: [0, 100, 200, 300]   },
  { id: 'agua', label: 'Consumo de agua', short: 'Agua',    icon: <IcCloud  size={14} />, value: '1,125', unit: 'L',  tone: 'neutral', status: 'Hoy',  sub: 'Por cada kg de alimento toman 4.6 L de agua',  categoryColor: '#3b82f6', data: waterArea, chartType: 'area', yTicks: [0, 500, 1000, 1500] },
]
