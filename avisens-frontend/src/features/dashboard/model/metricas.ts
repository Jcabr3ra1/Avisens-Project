import type { Medicion } from '@features/sensores/api/mediciones'

export type ResumenSerie = {
  minimo: number | null
  promedio: number | null
  maximo: number | null
}

export type PuntoSerie = {
  hora: string
  valor: number
}

const HORAS_VENTANA = 24

export function desdeHace24h(): string {
  return new Date(Date.now() - HORAS_VENTANA * 3600_000).toISOString()
}

// Las mediciones llegan de la más reciente a la más antigua: la gráfica se
// lee de izquierda a derecha, así que hay que invertirlas.
export function aSerie(mediciones: Medicion[]): PuntoSerie[] {
  return [...mediciones]
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
    .map((medicion) => ({
      hora: new Date(medicion.fecha_hora).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      valor: medicion.valor,
    }))
}

export function resumirSerie(serie: PuntoSerie[]): ResumenSerie {
  if (serie.length === 0) return { minimo: null, promedio: null, maximo: null }
  const valores = serie.map((punto) => punto.valor)
  const suma = valores.reduce((total, valor) => total + valor, 0)
  return {
    minimo: Math.min(...valores),
    promedio: Math.round((suma / valores.length) * 10) / 10,
    maximo: Math.max(...valores),
  }
}

// Alto de cada barra en porcentaje. Se escala contra el máximo de la propia
// serie, no contra un tope fijo: una humedad de 58 y una temperatura de 27
// tienen que verse ambas con relieve.
export function alturaBarra(valor: number, maximo: number | null): number {
  if (!maximo || maximo <= 0) return 0
  return Math.max(4, Math.round((valor / maximo) * 100))
}

export function etiquetaEstado(estado: string): string {
  if (estado === 'optimo') return 'Óptimo'
  if (estado === 'advertencia') return 'Atención'
  if (estado === 'critico') return 'Crítico'
  if (estado === 'offline') return 'Sin señal'
  return 'Sin umbral'
}

export function rangoUmbral(minimo: number | null, maximo: number | null, unidad: string): string {
  if (minimo === null && maximo === null) return 'Sin umbral configurado'
  if (minimo === null) return `Máximo ${maximo} ${unidad}`
  if (maximo === null) return `Mínimo ${minimo} ${unidad}`
  return `Umbral ${minimo}–${maximo} ${unidad}`
}
