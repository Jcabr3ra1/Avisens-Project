import { api } from '@shared/api/client'
import type { PaginatedResponse } from '@shared/api/types'
import type {
  DashboardAlerta,
  DashboardFuentes,
  DashboardGalpon,
  DashboardGranja,
  DashboardIndicador,
  DashboardLote,
} from '../model/dashboard'

interface GranjaApi {
  id: number
  nombre: string
  activa: boolean
}

interface GalponApi {
  id: number
  codigo: string
  nombre: string
  activo: boolean
  granja: { id: number }
}

interface LoteApi {
  id: number
  codigo: string
  fecha_ingreso: string
  cantidad_inicial: number
  estado: string
  galpon: { id: number }
}

interface AlertaApi {
  id: number
  galpon_id: number
  criticidad: string
  mensaje: string | null
  tipo: string
  estado: string
  fecha_creacion: string
}

interface IndicadorApi {
  fecha: string
  dia_vida: number | null
  peso_promedio_g: number | null
  fcr: number | null
  epef: number | null
  mortalidad_acumulada_pct: number | null
}

const parametrosListado = { page: 1, limit: 100 }

export async function cargarFuentesDashboard(): Promise<DashboardFuentes> {
  const [granjasResponse, galponesResponse, lotesResponse, alertasResponse] = await Promise.all([
    api.get<PaginatedResponse<GranjaApi>>('/granjas', { params: parametrosListado }),
    api.get<PaginatedResponse<GalponApi>>('/galpones', { params: parametrosListado }),
    api.get<PaginatedResponse<LoteApi>>('/lotes', { params: parametrosListado }),
    api.get<PaginatedResponse<AlertaApi>>('/alertas', { params: parametrosListado }),
  ])

  const granjas: DashboardGranja[] = granjasResponse.data.data.map((granja) => ({
    id: granja.id,
    nombre: granja.nombre,
    activa: granja.activa,
  }))

  const galpones: DashboardGalpon[] = galponesResponse.data.data.map((galpon) => ({
    id: galpon.id,
    granjaId: galpon.granja.id,
    codigo: galpon.codigo,
    nombre: galpon.nombre,
    activo: galpon.activo,
  }))

  const lotes: DashboardLote[] = lotesResponse.data.data.map((lote) => ({
    id: lote.id,
    galponId: lote.galpon.id,
    codigo: lote.codigo,
    fechaIngreso: lote.fecha_ingreso,
    cantidadInicial: lote.cantidad_inicial,
    estado: lote.estado,
  }))

  const alertas: DashboardAlerta[] = alertasResponse.data.data.map((alerta) => ({
    id: alerta.id,
    galponId: alerta.galpon_id,
    criticidad: alerta.criticidad,
    mensaje: alerta.mensaje,
    tipo: alerta.tipo,
    estado: alerta.estado,
    fechaCreacion: alerta.fecha_creacion,
  }))

  return { granjas, galpones, lotes, alertas }
}

function aIndicador(reciente: IndicadorApi): DashboardIndicador {
  return {
    fecha: reciente.fecha,
    diaVida: reciente.dia_vida,
    pesoPromedioG: reciente.peso_promedio_g,
    fcr: reciente.fcr,
    epef: reciente.epef,
    mortalidadAcumuladaPct: reciente.mortalidad_acumulada_pct,
  }
}

// Del más reciente al más antiguo. La franja de atención necesita dos para
// poder decir "vs. ayer" sin inventarse la tendencia.
export async function obtenerIndicadoresDeLote(
  loteId: number,
): Promise<DashboardIndicador[]> {
  const { data } = await api.get<IndicadorApi[]>(`/indicadores/${loteId}`)
  return [...data]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .map(aIndicador)
}

export async function obtenerIndicadorReciente(
  loteId: number,
): Promise<DashboardIndicador | null> {
  const [reciente] = await obtenerIndicadoresDeLote(loteId)
  return reciente ?? null
}
