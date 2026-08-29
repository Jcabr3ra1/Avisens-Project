// useMonitoreoAmbiental.ts — Fuente única de datos ambientales en vivo.
// Trae granjas, galpones, lotes, sensores, últimas mediciones y umbrales
// reales del backend y arma, por galpón, la lista de sensores con su estado
// ya calculado. Lo usan Monitoreo, Alertas, Dashboard y Admin — así los
// cuatro ven exactamente los mismos números, porque leen la misma fuente.
import { useEffect, useSyncExternalStore } from 'react'
import { isAxiosError } from 'axios'
import {
  listarSensores,
  listarMediciones,
  listarUmbrales,
  type Sensor,
  type Medicion,
  type Umbral,
} from '@shared/api'
import { listarGalpones, type Galpon } from '@features/galpones/api/galpones'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'

// Cuántas mediciones recientes se piden para derivar "la última lectura de
// cada sensor" — no hay filtro por galpón en /mediciones, así que se trae un
// lote amplio y se reduce en el cliente.
const LIMITE_MEDICIONES = 500

// El backend tope a 100 elementos por página, así que el lote amplio se arma
// pidiendo varias páginas en paralelo en vez de una sola con límite alto.
const LIMITE_POR_PAGINA = 100

async function listarMedicionesRecientes(): Promise<Medicion[]> {
  const paginas = Math.ceil(LIMITE_MEDICIONES / LIMITE_POR_PAGINA)
  const lotes = await Promise.all(
    Array.from({ length: paginas }, (_, i) =>
      listarMediciones({ page: i + 1, limit: LIMITE_POR_PAGINA }),
    ),
  )
  return lotes.flat()
}

export type EstadoSensorVista = 'optimo' | 'advertencia' | 'critico' | 'sin_umbral' | 'offline'

// A qué variable de umbral (las 3 que soporta el backend) corresponde el
// texto libre de `sensor.tipo`. Null = variable sin umbral configurable
// todavía en el backend (p. ej. CO₂, NH₃) — se muestra la lectura igual,
// solo que sin rango para compararla.
export function normalizarVariableUmbral(tipo: string): 'temperatura' | 'humedad' | 'luminosidad' | null {
  const t = tipo.toLowerCase()
  if (t.includes('temp')) return 'temperatura'
  if (t.includes('hum')) return 'humedad'
  if (t.includes('luz') || t.includes('lum')) return 'luminosidad'
  return null
}

export type SensorVista = {
  id: number
  codigo: string
  tipo: string
  unidad: string
  variableUmbral: 'temperatura' | 'humedad' | 'luminosidad' | null
  valor: number | null
  minUmbral: number | null
  maxUmbral: number | null
  estado: EstadoSensorVista
  ultimaLecturaTs: number | null
}

export type GalponMonitoreoVista = {
  id: number
  codigo: string
  nombre: string
  granjaId: number
  loteActivo: Lote | null
  diaVida: number
  sensores: SensorVista[]
}

type MonitoreoState = {
  galpones: GalponMonitoreoVista[]
  cargando: boolean
  error: string
}

function calcularEstado(valor: number, min: number, max: number): 'optimo' | 'advertencia' | 'critico' {
  // Variables sin piso real (min = 0, típico de gases): lo que importa es
  // qué tan cerca está del techo.
  if (min <= 0 && max > 0) {
    const ratio = valor / max
    if (ratio <= 0.7) return 'optimo'
    if (ratio < 1.0) return 'advertencia'
    return 'critico'
  }
  const rango = max - min || 1
  const margen = rango * 0.15
  if (valor >= min && valor <= max) return 'optimo'
  if (valor >= min - margen && valor <= max + margen) return 'advertencia'
  return 'critico'
}

function diasDesde(fechaISO: string): number {
  return Math.max(Math.floor((Date.now() - new Date(fechaISO).getTime()) / 86_400_000), 0)
}

function construirVista(
  galpones: Galpon[],
  lotes: Lote[],
  sensores: Sensor[],
  mediciones: Medicion[],
  umbrales: Umbral[],
): GalponMonitoreoVista[] {
  // Última medición por sensor: `mediciones` viene ordenada más reciente
  // primero (el backend ordena por fecha_hora desc), así que el primer match
  // por sensor_id ya es el más nuevo.
  const ultimaPorSensor = new Map<number, Medicion>()
  for (const m of mediciones) {
    if (!ultimaPorSensor.has(m.sensor_id)) ultimaPorSensor.set(m.sensor_id, m)
  }

  return galpones.map((g) => {
    const loteActivo = lotes.find((l) => l.galpon.id === g.id && l.estado === 'activo') ?? null
    const diaVida = loteActivo ? diasDesde(loteActivo.fecha_ingreso) : 0
    const semanaVida = Math.floor(diaVida / 7)

    const sensoresGalpon: SensorVista[] = sensores
      .filter((s) => s.galpon.id === g.id)
      .map((s) => {
        const variableUmbral = normalizarVariableUmbral(s.tipo)
        const umbral = variableUmbral
          ? umbrales.find(
              (u) => u.galpon_id === g.id && u.variable === variableUmbral && u.semana_vida === semanaVida,
            )
          : undefined
        const medicion = ultimaPorSensor.get(s.id)
        const valor = medicion ? medicion.valor : null

        let estado: EstadoSensorVista
        if (s.estado !== 'activo' || valor === null) estado = 'offline'
        else if (!umbral) estado = 'sin_umbral'
        else estado = calcularEstado(valor, umbral.valor_minimo, umbral.valor_maximo)

        return {
          id: s.id,
          codigo: s.codigo,
          tipo: s.tipo,
          unidad: s.unidad_medida,
          variableUmbral,
          valor,
          minUmbral: umbral?.valor_minimo ?? null,
          maxUmbral: umbral?.valor_maximo ?? null,
          estado,
          ultimaLecturaTs: medicion ? new Date(medicion.fecha_hora).getTime() : null,
        }
      })

    return {
      id: g.id,
      codigo: g.codigo,
      nombre: g.nombre,
      granjaId: g.granja.id,
      loteActivo,
      diaVida,
      sensores: sensoresGalpon,
    }
  })
}

// Store compartido entre el layout y las páginas. Antes, cada uso del hook
// ejecutaba cinco peticiones nuevas; Dashboard/Monitoreo/Alertas/Admin las
// duplicaban porque el sidebar usa la misma fuente. La promesa compartida
// también evita la doble petición que StrictMode provoca en desarrollo.
const CACHE_MS = 30_000
let estadoMonitoreo: MonitoreoState = { galpones: [], cargando: true, error: '' }
let cargaEnCurso: Promise<void> | null = null
let ultimaCarga = 0
const suscriptores = new Set<() => void>()

function notificar() {
  suscriptores.forEach((listener) => listener())
}

function suscribir(listener: () => void) {
  suscriptores.add(listener)
  return () => suscriptores.delete(listener)
}

function obtenerSnapshot() {
  return estadoMonitoreo
}

async function cargarMonitoreo(forzar = false): Promise<void> {
  if (cargaEnCurso) return cargaEnCurso
  if (!forzar && ultimaCarga > 0 && Date.now() - ultimaCarga < CACHE_MS) return

  estadoMonitoreo = { ...estadoMonitoreo, cargando: true, error: '' }
  notificar()

  cargaEnCurso = (async () => {
    try {
      const [galpones, lotes, sensores, mediciones, umbrales] = await Promise.all([
        listarGalpones(),
        listarLotes(),
        listarSensores(),
        listarMedicionesRecientes(),
        listarUmbrales(),
      ])
      estadoMonitoreo = {
        galpones: construirVista(galpones, lotes, sensores, mediciones, umbrales),
        cargando: false,
        error: '',
      }
    } catch (err) {
      estadoMonitoreo = {
        ...estadoMonitoreo,
        cargando: false,
        error: isAxiosError(err) && err.response?.status === 403
          ? 'No tienes permisos para ver el monitoreo ambiental.'
          : 'No se pudo cargar el monitoreo ambiental.',
      }
    } finally {
      ultimaCarga = Date.now()
      cargaEnCurso = null
      notificar()
    }
  })()

  return cargaEnCurso
}

function recargarMonitoreo() {
  return cargarMonitoreo(true)
}

export function useMonitoreoAmbiental() {
  const estado = useSyncExternalStore(suscribir, obtenerSnapshot, obtenerSnapshot)

  useEffect(() => {
    void cargarMonitoreo()
  }, [])

  return { ...estado, recargar: recargarMonitoreo }
}

// Texto relativo simple: "hace 3s", "hace 2 min", "hace 1 h", o "—" si nunca hubo lectura.
export function formatearUltimaLectura(ts: number | null): string {
  if (ts === null) return 'Sin lecturas'
  const seg = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (seg < 60) return `hace ${seg}s`
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min} min`
  return `hace ${Math.floor(min / 60)} h`
}
