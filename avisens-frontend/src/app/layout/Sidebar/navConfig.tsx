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
