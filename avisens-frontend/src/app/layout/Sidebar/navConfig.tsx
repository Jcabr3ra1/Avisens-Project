import type { ReactNode } from 'react'
import {
  IcAlert,
  IcBell,
  IcBox,
  IcClock,
  IcCoin,
  IcDoc,
  IcEye,
  IcGrid,
  IcLeaf,
  IcNote,
  IcServer,
  IcSeed,
  IcUserCircle,
  IcUsers,
} from '@shared/ui/icons/icons'

export const ROL_ADMIN = 'Administrador'
export const ROL_PROPIETARIO = 'Propietario'
export const ROL_OPERARIO = 'Operario'

type NavBase = {
  label: string
  icon: ReactNode
  roles?: string[]
}

export type NavLinkItem = NavBase & {
  path: string
  badge?: number
  nuevaPestana?: boolean
}

export type NavGroupItem = NavBase & {
  path: string
  children: NavLinkItem[]
}

export type NavItem = NavLinkItem | NavGroupItem

export type NavSection = {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Inicio',
    items: [
      {
        path: '/admin',
        label: 'Panel Admin',
        icon: <IcServer size={16} />,
        roles: [ROL_ADMIN],
      },
      {
        path: '/dashboard',
        label: 'Resumen',
        icon: <IcGrid size={16} />,
        roles: [ROL_PROPIETARIO, ROL_OPERARIO],
      },
      {
        path: '/mi-jornada',
        label: 'Mi jornada',
        icon: <IcClock size={16} />,
        roles: [ROL_OPERARIO],
      },
      {
        path: '/notificaciones',
        label: 'Notificaciones',
        icon: <IcBell size={16} />,
        roles: [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
      },
    ],
  },
  {
    label: 'Producción',
    items: [
      {
        path: '/granjas',
        label: 'Granjas',
        icon: <IcLeaf size={16} />,
        roles: [ROL_ADMIN, ROL_PROPIETARIO],
      },
      {
        path: '/bitacora',
        label: 'Bitácora',
        icon: <IcDoc size={16} />,
        roles: [ROL_PROPIETARIO, ROL_OPERARIO],
      },
      {
        path: '/consumos-diarios',
        label: 'Consumos diarios',
        icon: <IcSeed size={16} />,
        roles: [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
      },
    ],
  },
  {
    label: 'Monitoreo',
    items: [
      {
        path: '/monitoreo',
        label: 'Monitoreo',
        icon: <IcEye size={16} />,
        roles: [ROL_PROPIETARIO, ROL_OPERARIO],
      },
      {
        path: '/sensores',
        label: 'Sensores',
        icon: <IcServer size={16} />,
        roles: [ROL_ADMIN, ROL_PROPIETARIO],
      },
      {
        path: '/alertas',
        label: 'Alertas',
        icon: <IcAlert size={16} />,
        roles: [ROL_PROPIETARIO, ROL_OPERARIO],
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      {
        path: '/inventario',
        label: 'Bodega',
        icon: <IcBox size={16} />,
        roles: [ROL_PROPIETARIO],
      },
      {
        path: '/finanzas',
        label: 'Finanzas',
        icon: <IcCoin size={16} />,
        roles: [ROL_PROPIETARIO],
      },
      {
        path: '/usuarios',
        label: 'Personas',
        icon: <IcUserCircle size={16} />,
        roles: [ROL_ADMIN, ROL_PROPIETARIO],
      },
      {
        path: '/proveedores',
        label: 'Proveedores',
        icon: <IcUsers size={16} />,
        roles: [ROL_ADMIN],
      },
      {
        path: '/ordenes-compra',
        label: 'Compras',
        icon: <IcDoc size={16} />,
        roles: [ROL_ADMIN, ROL_PROPIETARIO],
      },
      {
        path: '/recuperaciones-password',
        label: 'Recuperar acceso',
        icon: <IcUserCircle size={16} />,
        roles: [ROL_ADMIN],
      },
    ],
  },
  {
    label: 'Comercial',
    items: [
      {
        path: '/crm',
        label: 'Clientes',
        icon: <IcUsers size={16} />,
        roles: [ROL_ADMIN],
      },
      {
        path: '/solicitudes-pqrs',
        label: 'Solicitudes PQRS',
        icon: <IcNote size={16} />,
        roles: [ROL_ADMIN],
      },
    ],
  },
]

export function esGrupo(item: NavItem): item is NavGroupItem {
  return 'children' in item
}

export function itemVisible(item: NavBase, rol: string | null): boolean {
  if (!item.roles) return true
  return rol !== null && item.roles.includes(rol)
}

export function puedeAcceder(path: string, rol: string | null): boolean {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (esGrupo(item)) {
        if (item.path === path) return itemVisible(item, rol)
        const child = item.children.find((navItem) => navItem.path === path)
        if (child) return itemVisible(child, rol)
      } else if (item.path === path) {
        return itemVisible(item, rol)
      }
    }
  }

  return true
}
