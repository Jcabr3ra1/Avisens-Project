import { tieneLecturaUtil, type EstadoSensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import type { TonoGranja } from './estadoGranja'
import type { KpiGranja } from './resumenGranja'

export type FaseDelDia = 'amanecer' | 'dia' | 'tarde' | 'noche'

export type Astro = { tipo: 'sol' | 'luna'; x: number; y: number }

const DIA_MAXIMO_CICLO = 42
const ESCALA_RECIEN_NACIDO = 0.5
const ESCALA_DE_FAENA = 1.15
const ESCALA_SIN_DATO = 0.8

export function faseDelDia(hora: number): FaseDelDia {
  if (hora >= 5 && hora < 7) return 'amanecer'
  if (hora >= 7 && hora < 17) return 'dia'
  if (hora >= 17 && hora < 19) return 'tarde'
  return 'noche'
}

export function posicionDelAstro(hora: number): Astro {
  const esDeDia = hora >= 6 && hora < 18
  const progreso = esDeDia ? (hora - 6) / 12 : ((hora - 18 + 24) % 24) / 12
  return {
    tipo: esDeDia ? 'sol' : 'luna',
    x: 44 + progreso * 42,
    y: 32 - Math.sin(progreso * Math.PI) * 22,
  }
}

function avance(dia: number): number {
  return Math.min(1, Math.max(0, dia / DIA_MAXIMO_CICLO))
}

export function escalaDelPollito(dia: number | null): number {
  if (dia === null) return ESCALA_SIN_DATO
  return ESCALA_RECIEN_NACIDO + (ESCALA_DE_FAENA - ESCALA_RECIEN_NACIDO) * avance(dia)
}

export function colorDeEdad(dia: number | null): number {
  return dia === null ? 0.5 : avance(dia)
}

export function estadoDeLampara(tono: TonoGranja): { color: TonoGranja; pulsa: boolean } {
  return { color: tono, pulsa: tono !== 'ok' }
}

export type ClaseSensor = 'temperatura' | 'humedad' | 'co2' | 'amoniaco' | 'luz'

export type SensorEscena = {
  id: number
  codigo: string
  clase: ClaseSensor
  nombre: string
  valor: number | null
  unidad: string
  estado: EstadoSensorVista
  etiquetaEstado: string
  explicacion: string
  ultimaLecturaTs: number | null
  minUmbral: number | null
  maxUmbral: number | null
}

type SensorCrudo = {
  id: number
  codigo: string
  tipo: string
  valor: number | null
  unidad: string
  estado: EstadoSensorVista
  ultimaLecturaTs: number | null
  minUmbral: number | null
  maxUmbral: number | null
}

const ETIQUETAS_ESTADO: Record<EstadoSensorVista, string> = {
  optimo: 'Óptimo',
  advertencia: 'Advertencia',
  critico: 'Crítico',
  sin_umbral: 'Sin umbral',
  offline: 'Sin señal',
  lectura_no_disponible: 'No disponible',
  obsoleta: 'Desactualizado',
}

const EXPLICACIONES: Record<ClaseSensor, string> = {
  temperatura: 'Mide la temperatura del aire dentro del galpón, en grados centígrados.',
  humedad: 'Mide la humedad relativa del aire: cuánta agua lleva respecto a la que podría contener.',
  co2: 'Mide el dióxido de carbono del aire. Sube cuando el aire del galpón se renueva poco.',
  amoniaco: 'Mide el amoníaco, un gas que se forma en la cama y las excretas, en partes por millón.',
  luz: 'Mide la intensidad de la luz dentro del galpón, en lux.',
}

const NOMBRES: Record<ClaseSensor, string> = {
  temperatura: 'Temperatura',
  humedad: 'Humedad',
  co2: 'CO₂',
  amoniaco: 'Amoníaco',
  luz: 'Luz',
}

const ORDEN_SENSORES: ClaseSensor[] = ['temperatura', 'humedad', 'co2', 'amoniaco', 'luz']

export function claseDeSensor(tipo: string): ClaseSensor | null {
  const texto = tipo.toLowerCase()
  if (texto.includes('temp')) return 'temperatura'
  if (texto.includes('hum')) return 'humedad'
  if (texto.includes('co2') || texto.includes('carbono')) return 'co2'
  if (texto.includes('amon') || texto.includes('nh3')) return 'amoniaco'
  if (texto.includes('luz') || texto.includes('lum') || texto.includes('lux')) return 'luz'
  return null
}

export function nombreDeSensor(tipo: string): string {
  const clase = claseDeSensor(tipo)
  if (clase) return NOMBRES[clase]
  const texto = tipo.trim()
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function sensoresDeEscena(sensores: SensorCrudo[]): SensorEscena[] {
  const porClase = new Map<ClaseSensor, SensorCrudo>()
  for (const sensor of sensores) {
    const clase = claseDeSensor(sensor.tipo)
    if (!clase) continue
    const actual = porClase.get(clase)
    if (!actual || (!tieneLecturaUtil(actual.estado) && tieneLecturaUtil(sensor.estado))) porClase.set(clase, sensor)
  }
  return ORDEN_SENSORES.flatMap((clase) => {
    const sensor = porClase.get(clase)
    if (!sensor) return []
    return [{
      id: sensor.id,
      codigo: sensor.codigo,
      clase,
      nombre: NOMBRES[clase],
      valor: tieneLecturaUtil(sensor.estado) ? sensor.valor : null,
      unidad: sensor.unidad,
      estado: sensor.estado,
      etiquetaEstado: ETIQUETAS_ESTADO[sensor.estado],
      explicacion: EXPLICACIONES[clase],
      ultimaLecturaTs: sensor.ultimaLecturaTs,
      minUmbral: sensor.minUmbral,
      maxUmbral: sensor.maxUmbral,
    }]
  })
}

export function detalleDeKpi(kpi: KpiGranja, diaLote: number | null, ambiente: string | null): string {
  if (kpi.id === 'aves' && diaLote !== null) return `Día ${diaLote} del lote · ${kpi.detalle}`
  if (kpi.id === 'sensores' && ambiente) return `${ambiente} · ${kpi.detalle}`
  return kpi.detalle
}

export function lecturaDeSensor(sensor: SensorEscena): string {
  const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
  return sensor.valor === null ? 'Sin lectura' : `${decimal.format(sensor.valor)} ${sensor.unidad}`.trim()
}

export function sensorActivo(sensor: SensorEscena): boolean {
  return sensor.valor !== null
}

export function senalDeSensor(estado: EstadoSensorVista): { texto: string; viva: boolean } {
  if (estado === 'offline') return { texto: 'Sin señal', viva: false }
  if (estado === 'obsoleta') return { texto: 'Lecturas atrasadas', viva: false }
  if (estado === 'lectura_no_disponible') return { texto: 'Sin lecturas', viva: false }
  return { texto: 'Transmitiendo', viva: true }
}

export function antiguedadDeLectura(ts: number | null, ahora: number = Date.now()): string {
  if (ts === null) return 'Sin lecturas registradas'
  const segundos = Math.max(0, Math.floor((ahora - ts) / 1000))
  if (segundos < 60) return 'Hace unos segundos'
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`
  return `Hace ${Math.floor(horas / 24)} d`
}

export function rangoConfigurado(sensor: SensorEscena): string | null {
  const { minUmbral, maxUmbral, unidad } = sensor
  if (minUmbral === null && maxUmbral === null) return null
  const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
  const limite = (valor: number) => `${decimal.format(valor)} ${unidad}`.trim()
  if (minUmbral !== null && maxUmbral !== null) return `${limite(minUmbral)} a ${limite(maxUmbral)}`
  return minUmbral !== null ? `Desde ${limite(minUmbral)}` : `Hasta ${limite(maxUmbral as number)}`
}

export function sombraDelGalpon(astro: Astro): { desplazamiento: number; alargamiento: number } {
  const altura = Math.max(0, Math.min(1, (32 - astro.y) / 22))
  const lado = (65 - astro.x) / 21
  return {
    desplazamiento: lado * (astro.tipo === 'sol' ? 1 : 0.35),
    alargamiento: astro.tipo === 'sol' ? 1.5 - altura * 0.7 : 0.9,
  }
}
