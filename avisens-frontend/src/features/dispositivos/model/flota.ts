import type { GranjaOrganizacionDetalle } from '@features/organizaciones/api/organizaciones'
import type { Galpon } from '@features/galpones/api/galpones'
import type { Dispositivo } from '../api/dispositivos'

export const VENTANA_CONECTADO_MIN = 15

export type EstadoGalponFlota = 'conectado' | 'sin_reportar' | 'nunca' | 'sin_controlador'

export type FilaFlota = {
  galpon: Galpon
  organizacion: string
  granja: string
  controladores: Dispositivo[]
  ultimaConexion: string | null
  estado: EstadoGalponFlota
}

export type GrupoFlota = { organizacion: string; filas: FilaFlota[] }

export function estadoDeConexion(ultima: string | null, ahora: number = Date.now()): Exclude<EstadoGalponFlota, 'sin_controlador'> {
  if (!ultima) return 'nunca'
  return ahora - new Date(ultima).getTime() <= VENTANA_CONECTADO_MIN * 60_000 ? 'conectado' : 'sin_reportar'
}

function masReciente(dispositivos: Dispositivo[]): string | null {
  return dispositivos.reduce<string | null>((ultima, d) => {
    if (!d.ultima_conexion) return ultima
    return ultima === null || d.ultima_conexion > ultima ? d.ultima_conexion : ultima
  }, null)
}

export function filasFlota(galpones: Galpon[], dispositivos: Dispositivo[], ahora: number = Date.now()): FilaFlota[] {
  return galpones
    .filter((galpon) => galpon.activo)
    .map((galpon) => {
      const controladores = dispositivos.filter((d) => d.galpon.id === galpon.id && d.activo)
      const ultimaConexion = masReciente(controladores)
      return {
        galpon,
        organizacion: galpon.granja.organizacion?.nombre ?? 'Sin organización',
        granja: galpon.granja.nombre,
        controladores,
        ultimaConexion,
        estado: controladores.length === 0 ? 'sin_controlador' : estadoDeConexion(ultimaConexion, ahora),
      }
    })
}

export function agruparPorOrganizacion(filas: FilaFlota[], busqueda = ''): GrupoFlota[] {
  const termino = busqueda.trim().toLowerCase()
  const visibles = termino
    ? filas.filter((fila) => [fila.organizacion, fila.granja, fila.galpon.nombre, fila.galpon.codigo,
        ...fila.controladores.map((d) => d.codigo_topic)].some((texto) => texto.toLowerCase().includes(termino)))
    : filas
  const grupos = new Map<string, FilaFlota[]>()
  for (const fila of visibles) grupos.set(fila.organizacion, [...(grupos.get(fila.organizacion) ?? []), fila])
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([organizacion, lista]) => ({
      organizacion,
      filas: lista.sort((a, b) => a.granja.localeCompare(b.granja, 'es') || a.galpon.nombre.localeCompare(b.galpon.nombre, 'es')),
    }))
}

export function resumenFlota(filas: FilaFlota[], versionPublicada: string | null) {
  const controladores = filas.flatMap((fila) => fila.controladores)
  const ahora = Date.now()
  return {
    galpones: filas.length,
    galponesConControlador: filas.filter((fila) => fila.controladores.length > 0).length,
    controladores: controladores.length,
    conectados: controladores.filter((d) => estadoDeConexion(d.ultima_conexion, ahora) === 'conectado').length,
    alDia: versionPublicada === null ? null : controladores.filter((d) => d.version_firmware === versionPublicada).length,
  }
}

export type FiltroFlota = 'todos' | 'en_linea' | 'problemas' | 'sin_controlador'

export function cumpleFiltro(fila: FilaFlota, filtro: FiltroFlota): boolean {
  if (filtro === 'todos') return true
  if (filtro === 'en_linea') return fila.estado === 'conectado'
  if (filtro === 'sin_controlador') return fila.estado === 'sin_controlador'
  return fila.estado === 'sin_reportar' || fila.estado === 'nunca'
}

export type Atencion = {
  clave: string
  tono: 'critico' | 'aviso' | 'info'
  titulo: string
  detalle: string
  galponId: number
}

export function atencionesFlota(filas: FilaFlota[], versionPublicada: string | null): Atencion[] {
  const items: Atencion[] = []
  for (const fila of filas) {
    const lugar = `${fila.organizacion} · ${fila.granja} · ${fila.galpon.nombre}`
    if (fila.estado === 'nunca') {
      items.push({ clave: `nunca-${fila.galpon.id}`, tono: 'critico', titulo: 'Nunca ha reportado', detalle: lugar, galponId: fila.galpon.id })
    } else if (fila.estado === 'sin_reportar') {
      items.push({ clave: `silencio-${fila.galpon.id}`, tono: 'critico', titulo: 'Dejó de reportar', detalle: lugar, galponId: fila.galpon.id })
    } else if (fila.estado === 'sin_controlador') {
      items.push({ clave: `vacio-${fila.galpon.id}`, tono: 'info', titulo: 'Galpón sin controlador', detalle: lugar, galponId: fila.galpon.id })
    }
    if (versionPublicada) {
      const atrasados = fila.controladores.filter((d) => d.version_firmware && d.version_firmware !== versionPublicada)
      if (atrasados.length > 0) {
        items.push({
          clave: `firmware-${fila.galpon.id}`,
          tono: 'aviso',
          titulo: `Firmware pendiente (v${atrasados[0].version_firmware})`,
          detalle: lugar,
          galponId: fila.galpon.id,
        })
      }
    }
  }
  const orden = { critico: 0, aviso: 1, info: 2 }
  return items.sort((a, b) => orden[a.tono] - orden[b.tono])
}

export function granjasParaMaqueta(filas: FilaFlota[], sensoresPorGalpon: Map<number, number>): GranjaOrganizacionDetalle[] {
  const granjas = new Map<number, GranjaOrganizacionDetalle>()
  for (const fila of filas) {
    const granja = fila.galpon.granja
    const actual = granjas.get(granja.id) ?? {
      id: granja.id,
      nombre: granja.nombre,
      direccion: null,
      municipio: null,
      departamento: null,
      area_total_m2: null,
      activa: true,
      propietario: { id: granja.propietario_id, nombre_completo: '', email: null, telefono: null, activo: true },
      galpones: [],
    }
    actual.galpones.push({
      id: fila.galpon.id,
      codigo: fila.galpon.codigo,
      nombre: fila.galpon.nombre,
      activo: fila.galpon.activo,
      _count: { dispositivo: fila.controladores.length, sensores: sensoresPorGalpon.get(fila.galpon.id) ?? 0 },
    })
    granjas.set(granja.id, actual)
  }
  return [...granjas.values()]
}
