// Vocabulario de los catálogos. Sale del backend, no está inventado: `etapa`
// usa los mismos valores que `curvas_objetivo.etapa_alimentacion`.
export const ETAPAS_ALIMENTO = ['preiniciacion', 'iniciacion', 'engorde'] as const
export const PRESENTACIONES_ALIMENTO = ['harina', 'migaja', 'quebrantado', 'peletizado'] as const
export const MARCAS_ALIMENTO = ['italcol', 'solla', 'contegral', 'finca'] as const

export type Pestana = 'alimentos' | 'curvas' | 'sensores'

export const PESTANAS: { id: Pestana; etiqueta: string; descripcion: string }[] = [
  {
    id: 'alimentos',
    etiqueta: 'Tipos de alimento',
    descripcion: 'El catálogo que se ofrece al registrar el consumo diario de un lote.',
  },
  {
    id: 'curvas',
    etiqueta: 'Curvas objetivo',
    descripcion: 'Los valores de referencia del fabricante contra los que se compara cada lote.',
  },
  {
    id: 'sensores',
    etiqueta: 'Catálogo de sensores',
    descripcion: 'Los modelos disponibles al equipar un galpón, con su precio y cobertura.',
  },
]

export function capitalizar(texto: string): string {
  if (!texto) return ''
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const ETIQUETAS_ETAPA: Record<string, string> = {
  preiniciacion: 'Preiniciación',
  iniciacion: 'Iniciación',
  engorde: 'Engorde',
}

export function etiquetaEtapa(etapa: string): string {
  return ETIQUETAS_ETAPA[etapa.toLowerCase()] ?? capitalizar(etapa)
}

// Los días de vida se muestran como rango; cualquiera de los dos extremos
// puede faltar, y un guion suelto se lee peor que decirlo con palabras.
export function rangoDeDias(inicio: number | null, fin: number | null): string {
  if (inicio === null && fin === null) return 'Sin definir'
  if (inicio !== null && fin !== null) return `Día ${inicio} a ${fin}`
  if (inicio !== null) return `Desde el día ${inicio}`
  return `Hasta el día ${fin}`
}

export function gramos(valor: number | null): string {
  if (valor === null) return '—'
  return `${new Intl.NumberFormat('es-CO').format(valor)} g`
}

export function pesos(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(valor)
}

export type FiltroDisponibilidad = 'todos' | 'disponibles' | 'retirados'

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function coincideDisponibilidad(activo: boolean, estado: FiltroDisponibilidad): boolean {
  if (estado === 'disponibles') return activo
  if (estado === 'retirados') return !activo
  return true
}

export function filtrarAlimentos<T extends {
  nombre: string
  marca: string | null
  etapa: string | null
  presentacion: string | null
  activo: boolean
}>(
  lista: T[],
  { busqueda, estado }: { busqueda: string; estado: FiltroDisponibilidad },
): T[] {
  const termino = normalizar(busqueda)
  return lista.filter((item) => {
    if (!coincideDisponibilidad(item.activo, estado)) return false
    if (!termino) return true
    return [
      item.nombre,
      item.marca ?? '',
      item.etapa ? etiquetaEtapa(item.etapa) : '',
      item.presentacion ?? '',
    ].some((valor) => normalizar(valor).includes(termino))
  })
}

export function filtrarSensores<T extends {
  tipo_sensor: string
  nombre: string
  descripcion: string | null
  activo: boolean
}>(
  lista: T[],
  { busqueda, estado }: { busqueda: string; estado: FiltroDisponibilidad },
): T[] {
  const termino = normalizar(busqueda)
  return lista.filter((item) => {
    if (!coincideDisponibilidad(item.activo, estado)) return false
    if (!termino) return true
    return [
      item.nombre,
      item.tipo_sensor,
      item.descripcion ?? '',
    ].some((valor) => normalizar(valor).includes(termino))
  })
}
