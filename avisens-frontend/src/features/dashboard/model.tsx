import type { ReactNode } from 'react'
import {
  IcGrid, IcLeaf, IcDoc, IcThermo, IcDrop, IcFan, IcSeed, IcCloud,
  IcAlert, IcCal, IcEgg, IcSettings, IcSparkle, IcHeart,
  IcEye, IcCoin, IcBox, IcServer, IcUsers, IcUserCircle,
  IcScale, IcPhone, IcNote,
} from './components/icons/icons'

export type GalponStatus = 'ok' | 'warn' | 'empty'

export type Granja = {
  id: number
  nombre: string
  municipio: string
  galpones: number
}

export type Galpon = {
  id: number
  codigo: string
  nombre: string
  aves: number
  dia: number
  status: GalponStatus
  alertas: number
}

export type NavItem = {
  path: string
  label: string
  icon: ReactNode
  badge?: number
}

export type NavSection = {
  label: string
  items: NavItem[]
}

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
  ok:      'Óptimo',
  warning: 'Atención',
  danger:  'Crítico',
  info:    'Informativo',
  neutral: 'Registro',
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

export const GRANJAS: Granja[] = [
  { id: 1, nombre: 'Granja Las Palmas', municipio: 'Popayán, Cauca', galpones: 4 },
  { id: 2, nombre: 'Granja El Cedro',   municipio: 'Cajibío, Cauca', galpones: 2 },
  { id: 3, nombre: 'Granja San José',   municipio: 'Timbío, Cauca',  galpones: 3 },
]

export const GALPONES: Galpon[] = [
  { id: 1, codigo: 'GP-01', nombre: 'Galpón Norte', aves: 18560, dia: 32, status: 'ok',    alertas: 2 },
  { id: 2, codigo: 'GP-02', nombre: 'Galpón Sur',   aves: 17200, dia: 18, status: 'ok',    alertas: 0 },
  { id: 3, codigo: 'GP-03', nombre: 'Galpón Este',  aves: 19800, dia: 41, status: 'warn',  alertas: 1 },
  { id: 4, codigo: 'GP-04', nombre: 'Galpón Oeste', aves: 0,     dia: 0,  status: 'empty', alertas: 0 },
]

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operación',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: <IcGrid  size={16} /> },
      { path: '/monitoreo', label: 'Monitoreo', icon: <IcEye   size={16} /> },
      { path: '/bitacora',  label: 'Bitácora',  icon: <IcDoc   size={16} /> },
      { path: '/alertas',   label: 'Alertas',   icon: <IcAlert size={16} />, badge: 2 },
    ],
  },
  {
    label: 'Negocio',
    items: [
      { path: '/finanzas',   label: 'Finanzas',   icon: <IcCoin size={16} /> },
      { path: '/inventario', label: 'Inventario', icon: <IcBox  size={16} /> },
      { path: '/crm',        label: 'CRM',        icon: <IcUsers size={16} /> },
    ],
  },
  {
    label: 'Administración',
    items: [
      { path: '/infraestructura', label: 'Infraestructura', icon: <IcServer     size={16} /> },
      { path: '/granjas',         label: 'Granjas',         icon: <IcLeaf       size={16} /> },
      { path: '/usuarios',        label: 'Usuarios',        icon: <IcUserCircle size={16} /> },
    ],
  },
]

/**
 * Catálogo de accesos rápidos del topbar.
 *
 * Criterio: cada item debe representar una OPERACIÓN frecuente
 * que ahorre al operador navegación. NO cosas que el navegador o el
 * sistema ya hacen (refrescar, auto-sync, etc).
 */
export const QUICK_ACTION_CATALOG: QuickActionDef[] = [
  // Operaciones diarias / frecuentes
  { id: 'bitacora',   label: 'Bitácora',       icon: <IcNote     size={14} />, color: 'var(--info)'    },
  { id: 'mortalidad', label: 'Mortalidad',     icon: <IcHeart    size={14} />, color: 'var(--red)'     },
  { id: 'pesaje',     label: 'Pesaje',         icon: <IcScale    size={14} />, color: 'var(--amber)'   },
  { id: 'tarea',      label: 'Programar',      icon: <IcCal      size={14} />, color: 'var(--info)'    },
  // Operaciones de ciclo
  { id: 'lote',       label: 'Crear lote',     icon: <IcEgg      size={14} />, color: 'var(--green-d)' },
  { id: 'reporte',    label: 'Reporte hoy',    icon: <IcDoc      size={14} /> },
  { id: 'ia',         label: 'Insight IA',     icon: <IcSparkle  size={14} />, color: 'var(--green-d)' },
  // Administración / esporádicas
  { id: 'umbrales',   label: 'Umbrales',       icon: <IcSettings size={14} /> },
  { id: 'calibrar',   label: 'Calibrar',       icon: <IcThermo   size={14} />, color: 'var(--amber)'   },
  { id: 'tecnico',    label: 'Llamar técnico', icon: <IcPhone    size={14} />, color: 'var(--red)'     },
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
  { id: 'temp', label: 'Temperatura',     short: 'Temp.',   icon: <IcThermo size={14} />, value: '27.4',  unit: '°C', tone: 'ok',      sub: 'Umbral 25–29 °C',          categoryColor: '#f59e0b', data: tempBars,  chartType: 'bar',  yTicks: [0, 10, 20, 30, 40]  },
  { id: 'hum',  label: 'Humedad',         short: 'Humedad', icon: <IcDrop   size={14} />, value: '58',    unit: '%',  tone: 'ok',      sub: 'Umbral 55–65 %',           categoryColor: '#3b82f6', data: humBars,   chartType: 'bar',  yTicks: [0, 25, 50, 75, 100] },
  { id: 'vent', label: 'Ventilación',     short: 'Vent.',   icon: <IcFan    size={14} />, value: '60',    unit: '%',  tone: 'info',    status: 'Auto', sub: 'Modo automático · 6 fans', categoryColor: 'var(--text2)' },
  { id: 'alim', label: 'Alimento',        short: 'Alim.',   icon: <IcSeed   size={14} />, value: '245',   unit: 'kg', tone: 'neutral', status: 'Hoy',  sub: 'meta 240 kg · ahorro 2%',  categoryColor: '#10b981', data: foodArea,  chartType: 'area', yTicks: [0, 100, 200, 300]   },
  { id: 'agua', label: 'Consumo de agua', short: 'Agua',    icon: <IcCloud  size={14} />, value: '1,125', unit: 'L',  tone: 'neutral', status: 'Hoy',  sub: 'ratio 4.6:1 vs. alimento', categoryColor: '#3b82f6', data: waterArea, chartType: 'area', yTicks: [0, 500, 1000, 1500] },
]
