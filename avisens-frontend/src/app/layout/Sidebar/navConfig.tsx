// navConfig.tsx — Configuración de la navegación del sidebar.
// Define las secciones y los ítems del menú lateral del panel interno.
// Los nombres usan lenguaje campesino: "Día a día", "Plata y cuentas", "Bodega".
//
// Visibilidad por rol:
//   - Sin campo `roles` → visible para TODOS los roles.
//   - Con `roles`       → visible solo para los roles listados.
//   - La función `puedeAcceder` también usa esta config como guardia de ruta.
import type { ReactNode } from 'react'
import {
  IcGrid, IcEye, IcDoc, IcAlert, IcCoin, IcBox,
  IcUsers, IcServer, IcLeaf, IcUserCircle,
} from '@shared/ui/icons/icons'

// Roles del sistema (coinciden exactamente con la tabla `roles` del backend).
export const ROL_ADMIN       = 'Administrador'
export const ROL_PROPIETARIO = 'Propietario'
export const ROL_OPERARIO    = 'Operario'

export type NavItem = {
  path: string
  label: string
  icon: ReactNode
  badge?: number
  // Roles que pueden ver este ítem. Si está ausente, lo ven todos los roles.
  roles?: string[]
}

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
//   Ve: Mi galpón, Sensores, Bitácora, Alertas.
//   Solo accede a lo que necesita en su jornada diaria.
//
export const NAV_SECTIONS: NavSection[] = [
  {
    // ── Sección operativa del día a día ───────────────────────────────────────
    label: 'Día a día',
    items: [
      // Panel Admin → solo el Administrador del sistema Avisens (EP-03)
      { path: '/admin',     label: 'Panel Admin', icon: <IcServer size={16} />, roles: [ROL_ADMIN] },

      // Dashboard operativo del galpón → Propietario y Operario (EP-04)
      { path: '/dashboard', label: 'Mi galpón',   icon: <IcGrid  size={16} />, roles: [ROL_PROPIETARIO, ROL_OPERARIO] },

      // Sensores ambientales → Propietario y Operario (EP-04 "Como Usuario/Operario")
      { path: '/monitoreo', label: 'Sensores',    icon: <IcEye   size={16} />, roles: [ROL_PROPIETARIO, ROL_OPERARIO] },

      // Bitácora del lote → Propietario y Operario (EP-06 "Como Usuario/Operario")
      { path: '/bitacora',  label: 'Bitácora',    icon: <IcDoc   size={16} />, roles: [ROL_PROPIETARIO, ROL_OPERARIO] },

      // Alertas ambientales → Propietario y Operario (EP-05 "Como Operario")
      // El badge no se fija aquí — Sidebar.tsx lo reemplaza por la cuenta de
      // alertas activas en vivo (ver PanelLayout.tsx, totalAlertas).
      { path: '/alertas',   label: 'Alertas',     icon: <IcAlert size={16} />, roles: [ROL_PROPIETARIO, ROL_OPERARIO] },
    ],
  },
  {
    // ── Sección financiera ────────────────────────────────────────────────────
    // EP-07 asigna Finanzas e Inventario al "Usuario" = Propietario.
    // El CRM es del Administrador (pipeline comercial de Avisens — EP-01 HU-08).
    label: 'Plata y cuentas',
    items: [
      // EP-07 HU-30/HU-33: Ingresos, egresos y reporte por ciclo → solo Propietario
      { path: '/finanzas',   label: 'Finanzas', icon: <IcCoin  size={16} />, roles: [ROL_PROPIETARIO] },

      // EP-07 HU-31/HU-32: Stock de insumos y proveedores → solo Propietario
      { path: '/inventario', label: 'Bodega',   icon: <IcBox   size={16} />, roles: [ROL_PROPIETARIO] },

      // EP-01 HU-08: Leads y pipeline del chatbot de cotizaciones → solo Admin
      { path: '/crm',        label: 'Clientes', icon: <IcUsers size={16} />, roles: [ROL_ADMIN] },
    ],
  },
  {
    // ── Sección de configuración ──────────────────────────────────────────────
    // EP-08: Infraestructura y Granjas son del Propietario (gestiona su granja)
    // y del Admin (visión general del sistema). El Operario no configura nada.
    label: 'Configuración',
    items: [
      // EP-08 HU-34-37: Galpones, sensores, actuadores y mantenimiento → Admin y Propietario
      { path: '/infraestructura', label: 'Equipos',     icon: <IcServer     size={16} />, roles: [ROL_ADMIN, ROL_PROPIETARIO] },

      // EP-08: Granjas es del Propietario (gestiona sus propias granjas).
      // El Admin no tiene granjas propias — su módulo de EP-08 es Equipos/Infraestructura.
      { path: '/granjas',         label: 'Mis granjas', icon: <IcLeaf       size={16} />, roles: [ROL_PROPIETARIO] },

      // EP-03 HU-15: Admin gestiona todos; Propietario gestiona solo sus operarios
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
