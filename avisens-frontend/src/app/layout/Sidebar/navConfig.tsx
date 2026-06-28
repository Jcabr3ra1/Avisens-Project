// navConfig.tsx — Configuración de la navegación del sidebar
// Define las secciones y los items del menú lateral del dashboard
// Los nombres usan lenguaje campesino: "Día a día", "Plata y cuentas", "Bodega"
import type { ReactNode } from 'react'
import {
  IcGrid, IcEye, IcDoc, IcAlert, IcCoin, IcBox,
  IcUsers, IcServer, IcLeaf, IcUserCircle,
} from '@shared/ui/icons/icons'

// Roles del sistema (coinciden con la tabla `roles` del backend).
export const ROL_ADMIN = 'Administrador'
export const ROL_PROPIETARIO = 'Propietario'
export const ROL_OPERARIO = 'Operario'

export type NavItem = {
  path: string
  label: string
  icon: ReactNode
  badge?: number
  // Roles que pueden ver este item. Si no se define, lo ven TODOS los roles.
  roles?: string[]
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
      { path: '/finanzas',   label: 'Finanzas',   icon: <IcCoin size={16} />, roles: [ROL_ADMIN, ROL_PROPIETARIO] },
      { path: '/inventario', label: 'Bodega',      icon: <IcBox  size={16} /> },
      { path: '/crm',        label: 'Clientes',    icon: <IcUsers size={16} />, roles: [ROL_ADMIN] },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { path: '/infraestructura', label: 'Equipos',    icon: <IcServer     size={16} /> },
      { path: '/granjas',         label: 'Mis granjas', icon: <IcLeaf       size={16} /> },
      { path: '/usuarios',        label: 'Personas',    icon: <IcUserCircle size={16} />, roles: [ROL_ADMIN, ROL_PROPIETARIO] },
    ],
  },
]

// ¿Este item es visible para el rol dado? (sin `roles` = visible para todos)
export function itemVisible(item: NavItem, rol: string | null): boolean {
  if (!item.roles) return true
  return rol !== null && item.roles.includes(rol)
}

// ¿El rol puede acceder a esta ruta? Las rutas que no están en el menú
// se permiten por defecto.
export function puedeAcceder(path: string, rol: string | null): boolean {
  for (const sec of NAV_SECTIONS) {
    const item = sec.items.find((i) => i.path === path)
    if (item) return itemVisible(item, rol)
  }
  return true
}
