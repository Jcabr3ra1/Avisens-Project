import { describe, expect, it } from 'vitest'
import { ROL_ADMIN, ROL_OPERARIO, ROL_PROPIETARIO, esGrupo, puedeAcceder } from './navConfig'
import { LINK_DETAILS, descripcionDe, tituloDeRuta, matchesPath, navigationFilter, navigationSpaces, spaceForPath, visibleSections } from './navigation'

describe('navegación por espacios', () => {
  it('solo ofrece espacios e ítems permitidos para la cuenta', () => {
    expect(navigationSpaces(visibleSections(ROL_ADMIN)).map((space) => space.id)).toEqual(['plataforma'])
    expect(navigationSpaces(visibleSections(ROL_PROPIETARIO)).map((space) => space.id)).toEqual(['granja', 'gestion'])
    expect(navigationSpaces(visibleSections(ROL_OPERARIO)).map((space) => space.id)).toEqual(['granja'])
    expect(visibleSections(null)).toEqual([])
    for (const rol of [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO]) {
      const links = visibleSections(rol).flatMap((section) => section.items).flatMap((item) => esGrupo(item) ? item.children : [item])
      for (const link of links) expect(puedeAcceder(link.path, rol)).toBe(true)
      expect(links.some((link) => ['/galpones', '/lotes', '/sensores'].includes(link.path))).toBe(false)
    }
  })

  it('mantiene todos los destinos actuales al distribuirlos entre espacios', () => {
    for (const rol of [ROL_ADMIN, ROL_PROPIETARIO, ROL_OPERARIO]) {
      const sections = visibleSections(rol)
      const expected = sections.filter((section) => section.label !== 'Inicio' && section.label !== 'Riel').flatMap((section) => section.items.map((item) => item.path)).sort()
      const actual = navigationSpaces(sections).flatMap((space) => space.sections.flatMap((section) => section.items.map((item) => item.path))).sort()
      expect(actual).toEqual(expected)
    }
  })

  it('reconoce el espacio de una ficha y no confunde prefijos parecidos', () => {
    const spaces = navigationSpaces(visibleSections(ROL_ADMIN))
    expect(spaceForPath('/organizaciones/42', spaces)?.id).toBe('plataforma')
    expect(spaceForPath('/usuarios', spaces)?.id).toBe('plataforma')
    expect(spaceForPath('/proveedores', spaces)?.id).toBe('plataforma')
    expect(spaceForPath('/catalogos', spaces)?.id).toBe('plataforma')
    expect(spaceForPath('/solicitudes-pqrs', spaces)?.id).toBe('plataforma')
    const espaciosPropietario = navigationSpaces(visibleSections(ROL_PROPIETARIO))
    expect(spaceForPath('/bitacora', espaciosPropietario)?.id).toBe('granja')
    expect(spaceForPath('/inventario', espaciosPropietario)?.id).toBe('gestion')
    expect(matchesPath('/usuarios-extra', '/usuarios')).toBe(false)
    expect(spaceForPath('/dashboard', navigationSpaces(visibleSections(ROL_PROPIETARIO)))?.id).toBe('granja')
  })

  it('al administrador no le muestra pantallas de granja, pero conserva su acceso por ruta', () => {
    const rutas = visibleSections(ROL_ADMIN).flatMap((section) => section.items.map((item) => item.path))
    for (const ruta of ['/bitacora', '/alertas', '/guia-crecimiento', '/inventario', '/ordenes-compra']) {
      expect(rutas).not.toContain(ruta)
    }
    expect(puedeAcceder('/alertas', ROL_ADMIN)).toBe(true)
  })

  it('ofrece el monitoreo en Organizaciones al administrador y conserva el acceso de los otros roles', () => {
    const rutas = (rol: string) => visibleSections(rol).flatMap((section) => section.items.map((item) => item.path))
    expect(rutas(ROL_ADMIN)).not.toContain('/monitoreo')
    expect(rutas(ROL_ADMIN)).toContain('/organizaciones')
    expect(rutas(ROL_PROPIETARIO)).toContain('/monitoreo')
    expect(rutas(ROL_OPERARIO)).toContain('/monitoreo')
    expect(navigationFilter('/organizaciones', 'monitoreo humedad', LINK_DETAILS['/organizaciones'].keywords)).toBe(1)
  })
})

describe('búsqueda de navegación', () => {
  it('encuentra nombres y sinónimos sin exigir tildes, con todas las palabras de la consulta', () => {
    expect(navigationFilter('/bitacora', 'BITÁCORA', ['Bitácora'])).toBe(1)
    expect(navigationFilter('/monitoreo', 'sensores humedad', ['temperatura', 'sensores', 'humedad'])).toBe(1)
    expect(navigationFilter('/monitoreo', 'sensores finanzas', ['sensores'])).toBe(0)
    expect(navigationFilter('/guia-crecimiento', 'peso', ['Guía de peso'])).toBe(1)
  })
})

describe('descripcionDe', () => {
  it('le habla al administrador cuando la ruta tiene texto propio para él', () => {
    expect(descripcionDe('/usuarios', 'Administrador')).toBe('Todas las cuentas y sus roles')
    expect(descripcionDe('/usuarios', 'Propietario')).toBe('Las personas de tu equipo')
  })

  it('sin texto propio usa la descripción general', () => {
    expect(descripcionDe('/crm', 'Administrador')).toBe(LINK_DETAILS['/crm'].description)
    expect(descripcionDe('/no-existe', 'Administrador')).toBeUndefined()
  })
})

describe('tituloDeRuta', () => {
  it('usa el nombre del menú del rol', () => {
    expect(tituloDeRuta('/solicitudes-pqrs', 'Administrador')).toBe('Solicitudes PQRS')
    expect(tituloDeRuta('/organizaciones/18', 'Administrador')).toBe('Organizaciones')
  })

  it('nombra rutas que el rol abre aunque no estén en su menú', () => {
    expect(tituloDeRuta('/alertas', 'Administrador')).toBe('Alertas')
    expect(tituloDeRuta('/notificaciones', 'Administrador')).toBe('Notificaciones')
  })

  it('sin coincidencia muestra la marca, no un texto genérico', () => {
    expect(tituloDeRuta('/ruta-desconocida', 'Administrador')).toBe('Avisens')
  })
})
