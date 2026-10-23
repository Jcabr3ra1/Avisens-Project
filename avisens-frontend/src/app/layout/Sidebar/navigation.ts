import { ROL_ADMIN } from '@shared/auth/permisos'
import { NAV_SECTIONS, esGrupo, itemVisible, type NavItem, type NavSection } from './navConfig'

export type SpaceId = 'plataforma' | 'granja' | 'gestion'
export type NavigationSpace = {
  id: SpaceId
  label: string
  description: string
  sections: NavSection[]
}

const SPACE_DEFINITIONS = [
  { id: 'plataforma', label: 'Plataforma', description: 'Organizaciones, prospectos, soporte y personas', sections: ['Organizaciones', 'Plataforma'] },
  { id: 'granja', label: 'Granja', description: 'El día a día de tus aves', sections: ['Granja'] },
  { id: 'gestion', label: 'Gestión', description: 'Recursos y equipo', sections: ['Gestión'] },
] as const

export const LINK_DETAILS: Record<string, { description: string; descriptionAdmin?: string; keywords: string[] }> = {
  '/admin': { description: 'Tu vista de la plataforma', keywords: ['inicio', 'resumen'] },
  '/dashboard': { description: 'Tu granja de un vistazo', keywords: ['inicio', 'panel'] },
  '/mi-jornada': { description: 'Tu trabajo de hoy', keywords: ['inicio', 'operario', 'registro'] },
  '/organizaciones': { description: 'Granjas, personas y sensores', descriptionAdmin: 'Tus clientes y sus granjas', keywords: ['empresa', 'organizacion', 'granjas', 'galpones', 'lotes', 'dispositivos', 'sensores', 'monitoreo', 'temperatura', 'humedad', 'mediciones'] },
  '/crm': { description: 'Leads del chatbot por atender', keywords: ['prospectos', 'clientes', 'leads', 'ventas', 'cotizaciones', 'conversion'] },
  '/solicitudes-pqrs': { description: 'Peticiones, quejas y reclamos', keywords: ['pqrs', 'soporte', 'quejas', 'reclamos', 'peticiones', 'radicado'] },
  '/recuperaciones-password': { description: 'Contraseñas por restablecer', keywords: ['contraseña', 'password', 'acceso', 'recuperar', 'bloqueo'] },
  '/catalogos': { description: 'Las bases de tu operación', descriptionAdmin: 'Alimentos, curvas y sensores base', keywords: ['insumos', 'alimentos', 'catalogo'] },
  '/auditoria': { description: 'La trazabilidad de cada cambio', keywords: ['historial', 'registro'] },
  '/dispositivos': { description: 'Controladores, sensores y firmware', keywords: ['esp32', 'controlador', 'sensores', 'firmware', 'iot', 'actualizacion', 'token'] },
  '/granjas': { description: 'Galpones y lotes, en su lugar', keywords: ['granja', 'galpon', 'lote'] },
  '/guia-crecimiento': { description: 'El crecimiento de cada lote', keywords: ['peso', 'plan', 'curva', 'alimento'] },
  '/bitacora': { description: 'Lo que sucede en el galpón', keywords: ['pesajes', 'consumos', 'mortalidad', 'registro', 'sanidad'] },
  '/monitoreo': { description: 'El ambiente de tus galpones', keywords: ['temperatura', 'humedad', 'sensores', 'mediciones'] },
  '/alertas': { description: 'Lo que necesita tu atención', keywords: ['riesgos', 'avisos'] },
  '/inventario': { description: 'Insumos y movimientos', keywords: ['inventario', 'stock', 'alimento'] },
  '/ordenes-compra': { description: 'Pedidos y abastecimiento', keywords: ['ordenes', 'compras'] },
  '/proveedores': { description: 'Quienes abastecen tu granja', descriptionAdmin: 'Aliados de alimento e insumos', keywords: ['proveedor'] },
  '/finanzas': { description: 'Ingresos y gastos de tu granja', keywords: ['costos', 'dinero', 'pagos'] },
  '/usuarios': { description: 'Las personas de tu equipo', descriptionAdmin: 'Todas las cuentas y sus roles', keywords: ['usuarios', 'operarios', 'propietarios'] },
}

export function descripcionDe(path: string, rol: string | null): string | undefined {
  const detalle = LINK_DETAILS[path]
  return rol === ROL_ADMIN && detalle?.descriptionAdmin ? detalle.descriptionAdmin : detalle?.description
}

export function visibleSections(rol: string | null): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.flatMap((item): NavItem[] => {
      if (!esGrupo(item)) return itemVisible(item, rol) ? [item] : []
      const children = item.children.filter((child) => itemVisible(child, rol))
      return children.length > 0 ? [{ ...item, children }] : []
    }),
  })).filter((section) => section.items.length > 0)
}

export function navigationSpaces(sections: NavSection[]): NavigationSpace[] {
  return SPACE_DEFINITIONS.map((space) => ({
    id: space.id,
    label: space.label,
    description: space.description,
    sections: sections.filter((section) => (space.sections as readonly string[]).includes(section.label)),
  })).filter((space) => space.sections.length > 0)
}

export function matchesPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function spaceForPath(pathname: string, spaces: NavigationSpace[]): NavigationSpace | undefined {
  return spaces.find((space) => space.sections.some((section) => section.items.some((item) =>
    matchesPath(pathname, item.path) || (esGrupo(item) && item.children.some((child) => matchesPath(pathname, child.path))),
  ))) ?? spaces[0]
}

export function navigationFilter(value: string, search: string, keywords: string[] = []): number {
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const haystack = normalize([value, ...keywords].join(' '))
  const words = normalize(search).trim().split(/\s+/)
  return words.every((word) => haystack.includes(word)) ? 1 : 0
}

const TITULOS_FUERA_DEL_MENU: Record<string, string> = {
  '/notificaciones': 'Notificaciones',
  '/perfil': 'Mi perfil',
}

export function tituloDeRuta(pathname: string, rol: string | null): string {
  const enlaces = (secciones: NavSection[]) => secciones
    .flatMap((section) => section.items)
    .flatMap((item) => esGrupo(item) ? item.children : [item])
  const visible = enlaces(visibleSections(rol)).find((item) => matchesPath(pathname, item.path))
  if (visible) return visible.label
  const cualquiera = enlaces(NAV_SECTIONS).find((item) => matchesPath(pathname, item.path))
  if (cualquiera) return cualquiera.label
  const extra = Object.keys(TITULOS_FUERA_DEL_MENU).find((ruta) => matchesPath(pathname, ruta))
  return extra ? TITULOS_FUERA_DEL_MENU[extra] : 'Avisens'
}

export function tieneUnSoloDestino(space: NavigationSpace | undefined): boolean {
  const items = space?.sections.flatMap((section) => section.items) ?? []
  return items.length === 1 && !('children' in items[0])
}
