// navConfig.tsx — Configuración de la navegación del sidebar
// Define las secciones y los items del menú lateral del dashboard
// Los nombres usan lenguaje campesino: "Día a día", "Plata y cuentas", "Bodega"
import type { ReactNode } from 'react'
import {
  IcGrid, IcEye, IcDoc, IcAlert, IcCoin, IcBox,
  IcUsers, IcServer, IcLeaf, IcUserCircle,
} from '@shared/ui/icons/icons'

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

/**
 * Navegación del shell de la app (sidebar). Es infraestructura de `app/`,
 * no de un feature: define cómo se mueve el usuario entre todos los módulos.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Día a día',
    items: [
      { path: '/dashboard', label: 'Mi galpón',   icon: <IcGrid  size={16} /> },
      { path: '/monitoreo', label: 'Sensores',    icon: <IcEye   size={16} /> },
      { path: '/bitacora',  label: 'Bitácora',    icon: <IcDoc   size={16} /> },
      { path: '/alertas',   label: 'Alertas',     icon: <IcAlert size={16} />, badge: 2 },
    ],
  },
  {
    label: 'Plata y cuentas',
    items: [
      { path: '/finanzas',   label: 'Finanzas',   icon: <IcCoin size={16} /> },
      { path: '/inventario', label: 'Bodega',      icon: <IcBox  size={16} /> },
      { path: '/crm',        label: 'Clientes',    icon: <IcUsers size={16} /> },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { path: '/infraestructura', label: 'Equipos',    icon: <IcServer     size={16} /> },
      { path: '/granjas',         label: 'Mis granjas', icon: <IcLeaf       size={16} /> },
      { path: '/usuarios',        label: 'Personas',    icon: <IcUserCircle size={16} /> },
    ],
  },
]
