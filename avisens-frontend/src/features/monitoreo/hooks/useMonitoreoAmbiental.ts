// useMonitoreoAmbiental.ts — Fuente única de datos ambientales en vivo.
// Trae granjas, galpones, lotes, sensores, últimas mediciones y umbrales
// reales del backend y arma, por galpón, la lista de sensores con su estado
// ya calculado. Lo usan Monitoreo, Alertas, Dashboard y Admin — así los
// cuatro ven exactamente los mismos números, porque leen la misma fuente.
import { useEffect, useSyncExternalStore } from 'react'
import { isAxiosError } from 'axios'
import { listarUmbrales, type Umbral } from '@features/galpones/api/umbrales'
import { listarUltimasLecturas, type UltimaLecturaSensor } from '@features/sensores/api/mediciones'
import { diasDeVida, semanaDeVida } from '@shared/utils/fechas'
import { listarSensores, type Sensor } from '@features/sensores/api/sensores'
import { listarGalpones, type Galpon } from '@features/galpones/api/galpones'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import { mensajeDeError } from '@shared/utils/errores'

export type EstadoSensorVista = 'optimo' | 'advertencia' | 'critico' | 'sin_umbral' | 'offline' | 'lectura_no_disponible' | 'obsoleta'

// Ni "óptimo", ni "conectado", ni "sin señal": no hay dato que mostrar
// porque la consulta al backend falló, no porque el sensor esté apagado.
export function tieneLecturaUtil(estado: EstadoSensorVista): boolean {
  return estado !== 'offline' && estado !== 'lectura_no_disponible'
}

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
  // Posición dentro del galpón, en metros. Puede faltar: no todos los
  // sensores se registran con coordenadas.
  x: number | null
  y: number | null
}

export type GalponMonitoreoVista = {
  id: number
  codigo: string
  nombre: string
  granjaId: number
  // El registro crudo del backend. La vista aplana lo que se pinta seguido,
  // pero los formularios de edición necesitan el galpón completo.
  origen: Galpon
  activo: boolean
  capacidadAves: number | null
  anchoMetros: number | null
  largoMetros: number | null
  loteActivo: Lote | null
  diaVida: number
  sensores: SensorVista[]
}

type MonitoreoState = {
  galpones: GalponMonitoreoVista[]
  cargando: boolean
  error: string
  avisoUltimas: string
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

export function construirVista(
  galpones: Galpon[],
  lotes: Lote[],
  sensores: Sensor[],
  ultimas: UltimaLecturaSensor[],
  umbrales: Umbral[],
  ultimasNoDisponibles: boolean,
): GalponMonitoreoVista[] {
  // El backend ya entrega una fila por sensor — no hace falta reducir nada
  // en el cliente como antes con las 5 páginas de /mediciones.
  const ultimaPorSensor = new Map(ultimas.map((u) => [u.sensor_id, u]))

  return galpones.map((g) => {
    const loteActivo = lotes.find((l) => l.galpon.id === g.id && l.estado === 'activo') ?? null
    const diaVida = loteActivo ? diasDeVida(loteActivo.fecha_ingreso) : 0
    const semanaVida = semanaDeVida(diaVida)

    const sensoresGalpon: SensorVista[] = sensores
      .filter((s) => s.galpon.id === g.id)
      .map((s) => {
        const variableUmbral = normalizarVariableUmbral(s.tipo)
        const umbral = variableUmbral
          ? umbrales.find(
              (u) => u.galpon_id === g.id && u.variable === variableUmbral && u.semana_vida === semanaVida,
            )
          : undefined
        const entrada = ultimaPorSensor.get(s.id)
        const valor = entrada?.ultima_lectura?.valor ?? null

        let estado: EstadoSensorVista
        if (s.estado !== 'activo') estado = 'offline'
        else if (ultimasNoDisponibles) estado = 'lectura_no_disponible'
        else if (valor === null) estado = 'offline'
        else if ((entrada?.ultima_lectura?.antiguedad_segundos ?? 0) > UMBRAL_LECTURA_OBSOLETA_SEG) estado = 'obsoleta'
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
          ultimaLecturaTs: entrada?.ultima_lectura
            ? new Date(entrada.ultima_lectura.fecha_hora).getTime()
            : null,
          x: s.coordenada_x,
          y: s.coordenada_y,
        }
      })

    return {
      id: g.id,
      codigo: g.codigo,
      nombre: g.nombre,
      granjaId: g.granja.id,
      origen: g,
      activo: g.activo,
      capacidadAves: g.capacidad_aves,
      anchoMetros: g.ancho_metros,
      largoMetros: g.largo_metros,
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

// Más de esto sin una lectura nueva: no importa si el valor está "en
// rango", ya no es confiable mostrarlo como si fuera el estado actual.
// Independiente de la cadencia de un dispositivo en particular.
const UMBRAL_LECTURA_OBSOLETA_SEG = 120
let estadoMonitoreo: MonitoreoState = { galpones: [], cargando: true, error: '', avisoUltimas: '' }
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

 estadoMonitoreo = { ...estadoMonitoreo, cargando: true, error: '', avisoUltimas: '' }
  notificar()

  cargaEnCurso = (async () => {
    try {
      const [galpones, lotes, sensores, umbrales] = await Promise.all([
        listarGalpones(),
        listarLotes(),
        listarSensores(),
        listarUmbrales(),
      ])

      let ultimas: UltimaLecturaSensor[] = []
      let ultimasNoDisponibles = false
      let avisoUltimas = ''
      try {
        ultimas = await listarUltimasLecturas()
      } catch (err) {
        ultimasNoDisponibles = true
        avisoUltimas = mensajeDeError(err, 'No se pudieron cargar las últimas lecturas.')
      }

      estadoMonitoreo = {
        galpones: construirVista(galpones, lotes, sensores, ultimas, umbrales, ultimasNoDisponibles),
        cargando: false,
        error: '',
        avisoUltimas,
      }
    } catch (err) {
      estadoMonitoreo = {
        ...estadoMonitoreo,
        cargando: false,
        error: isAxiosError(err) && err.response?.status === 403
          ? 'No tienes permisos para ver el monitoreo ambiental.'
          : 'No se pudo cargar el monitoreo ambiental.',
        avisoUltimas: '',
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

  useEffect(() => {
    // Sin esto, el store solo se carga al montar: alguien viendo Monitoreo
    // nunca vería una lectura nueva sin salir y volver a entrar. El
    // intervalo es más corto que CACHE_MS a propósito -- el propio cache
    // de cargarMonitoreo() decide cuándo pega de verdad al backend, esto
    // solo dispara el chequeo con margen.
    const id = setInterval(() => { void cargarMonitoreo() }, CACHE_MS / 2)
    return () => clearInterval(id)
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
