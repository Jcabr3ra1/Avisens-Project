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
    x: 8 + progreso * 84,
    y: 34 - Math.sin(progreso * Math.PI) * 22,
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
  clase: ClaseSensor
  nombre: string
  valor: number | null
  unidad: string
}

type SensorCrudo = { tipo: string; valor: number | null; unidad: string; conLectura: boolean }

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

export function sensoresDeEscena(sensores: SensorCrudo[]): SensorEscena[] {
  const porClase = new Map<ClaseSensor, SensorCrudo>()
  for (const sensor of sensores) {
    const clase = claseDeSensor(sensor.tipo)
    if (!clase) continue
    const actual = porClase.get(clase)
    if (!actual || (!actual.conLectura && sensor.conLectura)) porClase.set(clase, sensor)
  }
  return ORDEN_SENSORES.flatMap((clase) => {
    const sensor = porClase.get(clase)
    if (!sensor) return []
    return [{
      clase,
      nombre: NOMBRES[clase],
      valor: sensor.conLectura ? sensor.valor : null,
      unidad: sensor.unidad,
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
  return sensor.valor === null ? 'sin lectura' : `${decimal.format(sensor.valor)} ${sensor.unidad}`.trim()
}

export function sombraDelGalpon(astro: Astro): { desplazamiento: number; alargamiento: number } {
  const altura = Math.max(0, Math.min(1, (34 - astro.y) / 22))
  const lado = (50 - astro.x) / 42
  return {
    desplazamiento: lado * (astro.tipo === 'sol' ? 1 : 0.35),
    alargamiento: astro.tipo === 'sol' ? 1.5 - altura * 0.7 : 0.9,
  }
}
