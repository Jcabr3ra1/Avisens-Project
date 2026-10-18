import type { ReactNode } from 'react'
import {
  IcAlert,
  IcBox,
  IcChat,
  IcClock,
  IcCoin,
  IcDoc,
  IcEye,
  IcGrid,
  IcHome,
  IcLeaf,
  IcNote,
  IcRefresh,
  IcSearch,
  IcSeed,
  IcSend,
  IcServer,
  IcUserCircle,
  IcUsers,
} from '@shared/ui/icons/icons'

export const ROL_ADMIN = 'Administrador'
export const ROL_PROPIETARIO = 'Propietario'
export const ROL_OPERARIO = 'Operario'

type NavBase = {
  label: string
  icon: ReactNode
  rolesVisibles?: string[]
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
  // El inicio de cada rol no lleva encabezado: es un solo ítem, y poner
  // «INICIO» encima de «Panel Admin» repite lo que el propio botón ya dice.
  sinEncabezado?: boolean
  items: NavItem[]
}

// Configuración completa de la navegación del sidebar.
// Es infraestructura de `app/`, no de un feature: define cómo se
// mueve cada rol entre los módulos del sistema.
// ─── Navegación por rol ───────────────────────────────────────────────────────
//
// Cada rol inicia en una experiencia distinta: Administrador en el control
// global, Propietario en la operación de su granja y Operario en su jornada.
// El criterio para clasificar un módulo nuevo: ¿opera la plataforma o la
// granja? Lo primero va en 'Plataforma'; lo segundo, debajo.
//
// Permiso de acceso por ruta. Es la ÚNICA fuente de verdad: el sidebar
// dibuja lo que esta tabla permite, y la guardia de rutas la consulta.
// Antes el permiso salía de que la ruta tuviera ítem en el menú, así que
// sacar un ítem del sidebar la dejaba abierta para todos los roles.
const PERMISOS_RUTA: Record<string, string[]> = {
  '/admin':                   [ROL_ADMIN],
  '/dashboard':               [ROL_PROPIETARIO],
  '/mi-jornada':              [ROL_OPERARIO],
  '/granjas':                 [ROL_ADMIN, ROL_PROPIETARIO],
  '/galpones':                [ROL_ADMIN, ROL_PROPIETARIO],
  '/lotes':                   [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
  '/bitacora':                [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
  '/guia-crecimiento':        [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
  '/consumos-diarios':        [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
  '/monitoreo':               [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
  '/sensores':                [ROL_ADMIN, ROL_PROPIETARIO],
  '/alertas':                 [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
  '/notificaciones':          [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
  '/perfil':                  [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO],
  '/inventario':              [ROL_ADMIN, ROL_PROPIETARIO],
  // Solo el propietario. El estado de resultados de una granja es información
  // financiera de su dueño y no tiene ninguna finalidad en la operación de la
  // plataforma: darle acceso permanente al administrador contradice el
  // principio de acceso restringido de la Ley 1581. El backend ya acota por
  // propietario en `movimientos-financieros.service.ts`; esto cierra la puerta
  // de la interfaz, que era la que estaba abierta.
  '/finanzas':                [ROL_PROPIETARIO],
  '/usuarios':                [ROL_ADMIN, ROL_PROPIETARIO],
  '/proveedores':             [ROL_ADMIN],
  '/ordenes-compra':          [ROL_ADMIN, ROL_PROPIETARIO],
  '/recuperaciones-password': [ROL_ADMIN],
  '/auditoria':               [ROL_ADMIN],
  '/catalogos':               [ROL_ADMIN],
  '/organizaciones':          [ROL_ADMIN],
  '/crm':                     [ROL_ADMIN],
  '/solicitudes-pqrs':        [ROL_ADMIN],
}

export const NAV_SECTIONS: NavSection[] = [
  // El inicio del rol va primero: es a donde lleva el logo y a donde vuelve
  // uno al perderse. Antes estaba debajo de los seis módulos de plataforma,
  // así que para el administrador el botón de inicio era el séptimo de la
  // lista.
  {
    label: 'Inicio',
    sinEncabezado: true,
    items: [
      {
        path: '/admin',
        label: 'Panel Admin',
        icon: <IcHome size={16} />,
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
  // La ficha reúne los flujos de cada organización. El menú lleva al listado
  // y conserva una sola entrada, sin duplicar sus secciones como subenlaces.
  {
    label: 'Organizaciones',
    sinEncabezado: true,
    items: [
      {
        path: '/organizaciones',
        label: 'Organizaciones',
        icon: <IcServer size={16} />,
      },
    ],
  },
  // Herramientas transversales de la plataforma, fuera del contexto de una
  // organización concreta.
  {
    label: 'Plataforma',
    items: [
      {
        path: '/crm',
        label: 'Prospectos',
        icon: <IcUsers size={16} />,
      },
      {
        path: '/solicitudes-pqrs',
        label: 'Solicitudes PQRS',
        icon: <IcChat size={16} />,
      },
      {
        path: '/usuarios',
        label: 'Personas',
        icon: <IcUserCircle size={16} />,
        rolesVisibles: [ROL_ADMIN],
      },
      {
        path: '/recuperaciones-password',
        label: 'Recuperar acceso',
        icon: <IcRefresh size={16} />,
      },
      {
        path: '/proveedores',
        label: 'Proveedores',
        icon: <IcSeed size={16} />,
      },
      {
        path: '/catalogos',
        label: 'Catálogos',
        icon: <IcNote size={16} />,
      },
    ],
  },
  // Producción y Monitoreo eran dos secciones de dos ítems cada una: más
  // encabezado que contenido, y para el operario tres títulos sobre cuatro
  // botones. Es todo lo mismo —lo que pasa en la granja— y va junto.
  // El administrador no lleva granjas: las ve dentro de la ficha de cada
  // organización. Por eso estos ítems no se le muestran, aunque la ruta
  // siga abierta para él (el Centro de control enlaza a /alertas).
  {
    label: 'Granja',
    items: [
      {
        path: '/granjas',
        label: 'Granjas',
        icon: <IcLeaf size={16} />,
        rolesVisibles: [ROL_PROPIETARIO],
      },
      {
        path: '/bitacora',
        label: 'Bitácora',
        icon: <IcDoc size={16} />,
        rolesVisibles: [ROL_OPERARIO],
      },
      {
        path: '/monitoreo',
        label: 'Monitoreo',
        icon: <IcEye size={16} />,
        rolesVisibles: [ROL_OPERARIO],
      },
      {
        path: '/alertas',
        label: 'Alertas',
        icon: <IcAlert size={16} />,
        rolesVisibles: [ROL_OPERARIO],
      },
    ],
  },
  // Se llamaba 'Operación', pero dentro no hay nada operativo: es el papeleo
  // de la granja. Los tres primeros son una cadena —lo que hay, lo que se
  // pide, a quién— y están en ese orden a propósito.
  {
    label: 'Administración',
    items: [
      {
        path: '/inventario',
        label: 'Bodega',
        icon: <IcBox size={16} />,
        rolesVisibles: [ROL_PROPIETARIO],
      },
      {
        path: '/ordenes-compra',
        label: 'Compras',
        icon: <IcSend size={16} />,
        rolesVisibles: [ROL_PROPIETARIO],
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
        rolesVisibles: [ROL_PROPIETARIO],
      },
    ],
  },
  // Accesos directos en el riel verde: pantallas de consulta que no
  // pertenecen a ningún espacio y se abren a pantalla completa.
  {
    label: 'Riel',
    sinEncabezado: true,
    items: [
      {
        path: '/auditoria',
        label: 'Auditoría',
        icon: <IcSearch size={16} />,
      },
    ],
  },
]

export function esGrupo(item: NavItem): item is NavGroupItem {
  return 'children' in item
}

export function puedeAcceder(path: string, rol: string | null): boolean {
  const permisoDetalleOrganizacion = /^\/organizaciones\/\d+$/.test(path)
    ? PERMISOS_RUTA['/organizaciones']
    : undefined
  const permitidos = PERMISOS_RUTA[path] ?? permisoDetalleOrganizacion
  if (!permitidos) return false
  return rol !== null && permitidos.includes(rol)
}

export function rutaInicioPorRol(rol: string | null): string {
  if (rol === ROL_ADMIN) return '/admin'
  if (rol === ROL_OPERARIO) return '/mi-jornada'
  return '/dashboard'
}

export function itemVisible(item: NavItem, rol: string | null): boolean {
  return puedeAcceder(item.path, rol) && (!item.rolesVisibles || (rol !== null && item.rolesVisibles.includes(rol)))
}
