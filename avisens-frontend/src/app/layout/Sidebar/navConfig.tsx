import type { ReactNode } from 'react'
import {
  IcAlert,
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

// Configuración completa de la navegación del sidebar.
// Es infraestructura de `app/`, no de un feature: define cómo se
// mueve cada rol entre los módulos del sistema.
// ─── Navegación por rol ───────────────────────────────────────────────────────
//
// ADMINISTRADOR (admin@avisens.com) — administra el sistema Avisens (la empresa):
//   Ve: Panel Admin, CRM de prospectos, Equipos/Infraestructura, Granjas, Personas.
//   NO ve: módulos operativos de granja (sensores, bitácora, alertas, finanzas, bodega).
//
// PROPIETARIO (dueño@avisens.com) — dueño de la granja:
//   Ve: Mi galpón, Sensores, Bitácora, Alertas, Finanzas, Bodega, Equipos, Granjas, Personas.
//   NO ve: Panel Admin ni CRM (no es su pipeline comercial).
//
// OPERARIO (operario@avisens.com) — personal de campo en el galpón:
//   Ve: Mi galpón, Sensores, Bitácora, Alertas, Bodega (solo consulta de stock).
//   Solo accede a lo que necesita en su jornada diaria.
//
// Permiso de acceso por ruta. Es la ÚNICA fuente de verdad: el sidebar
// dibuja lo que esta tabla permite, y la guardia de rutas la consulta.
// Antes el permiso salía de que la ruta tuviera ítem en el menú, así que
// sacar un ítem del sidebar la dejaba abierta para todos los roles.
const PERMISOS_RUTA: Record<string, string[]> = {
  '/admin':                   [ROL_ADMIN],
  '/dashboard':               [ROL_PROPIETARIO, ROL_OPERARIO],
  '/mi-jornada':              [ROL_OPERARIO],
  '/granjas':                 [ROL_ADMIN, ROL_PROPIETARIO],
  '/galpones':                [ROL_ADMIN, ROL_PROPIETARIO],
  '/lotes':                   [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
  '/bitacora':                [ROL_PROPIETARIO, ROL_OPERARIO],
  '/consumos-diarios':        [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
  '/monitoreo':               [ROL_PROPIETARIO, ROL_OPERARIO],
  '/sensores':                [ROL_ADMIN, ROL_PROPIETARIO],
  '/alertas':                 [ROL_PROPIETARIO, ROL_OPERARIO],
  '/notificaciones':          [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
  '/inventario':              [ROL_PROPIETARIO],
  '/finanzas':                [ROL_PROPIETARIO],
  '/usuarios':                [ROL_ADMIN, ROL_PROPIETARIO],
  '/proveedores':             [ROL_ADMIN],
  '/ordenes-compra':          [ROL_ADMIN, ROL_PROPIETARIO],
  '/recuperaciones-password': [ROL_ADMIN],
  '/auditoria':               [ROL_ADMIN],
  '/crm':                     [ROL_ADMIN],
  '/solicitudes-pqrs':        [ROL_ADMIN],
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Inicio',
    items: [
      {
        path: '/admin',
        label: 'Panel Admin',
        icon: <IcServer size={16} />,
      },
      {
        path: '/dashboard',
        label: 'Resumen',
        icon: <IcGrid size={16} />,
      },
      {
        path: '/mi-jornada',
        label: 'Mi jornada',
        icon: <IcClock size={16} />,
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
      },
      {
        path: '/bitacora',
        label: 'Bitácora',
        icon: <IcDoc size={16} />,
      },
      {
        path: '/consumos-diarios',
        label: 'Consumos diarios',
        icon: <IcSeed size={16} />,
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
      },
      {
        path: '/sensores',
        label: 'Sensores',
        icon: <IcServer size={16} />,
      },
      {
        path: '/alertas',
        label: 'Alertas',
        icon: <IcAlert size={16} />,
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
      },
      {
        path: '/finanzas',
        label: 'Finanzas',
        icon: <IcCoin size={16} />,
      },
      {
        path: '/usuarios',
        label: 'Personas',
        icon: <IcUserCircle size={16} />,
      },
      {
        path: '/proveedores',
        label: 'Proveedores',
        icon: <IcUsers size={16} />,
      },
      {
        path: '/ordenes-compra',
        label: 'Compras',
        icon: <IcDoc size={16} />,
      },
      {
        path: '/recuperaciones-password',
        label: 'Recuperar acceso',
        icon: <IcUserCircle size={16} />,
      },
      {
        path: '/auditoria',
        label: 'Auditoría',
        icon: <IcDoc size={16} />,
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
      },
      {
        path: '/solicitudes-pqrs',
        label: 'Solicitudes PQRS',
        icon: <IcNote size={16} />,
      },
    ],
  },
]

export function esGrupo(item: NavItem): item is NavGroupItem {
  return 'children' in item
}

export function puedeAcceder(path: string, rol: string | null): boolean {
  const permitidos = PERMISOS_RUTA[path]
  if (!permitidos) return false
  return rol !== null && permitidos.includes(rol)
}

export function itemVisible(item: NavItem, rol: string | null): boolean {
  return puedeAcceder(item.path, rol)
}
