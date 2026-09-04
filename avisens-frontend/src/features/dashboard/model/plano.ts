import type { SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'

export type SensorUbicado = SensorVista & { x: number; y: number }

// Cuando el galpón no declara medidas, se asume una planta de referencia para
// que el plano igual se dibuje: sin esto, un galpón sin ancho ni largo no
// podría mostrar nada aunque sus sensores sí tengan coordenadas.
export const ANCHO_POR_DEFECTO = 12
export const LARGO_POR_DEFECTO = 60

export function sensoresUbicados(sensores: SensorVista[]): SensorUbicado[] {
  return sensores.filter(
    (sensor): sensor is SensorUbicado => sensor.x !== null && sensor.y !== null,
  )
}

// Posición en porcentaje sobre el plano. El galpón se dibuja apaisado: el
// largo va en horizontal, que es como se recorre por dentro.
export function posicionPorcentaje(
  sensor: SensorUbicado,
  ancho: number,
  largo: number,
): { left: string; top: string } {
  const limitar = (valor: number) => Math.min(96, Math.max(4, valor))
  return {
    left: `${limitar((sensor.y / largo) * 100)}%`,
    top: `${limitar((sensor.x / ancho) * 100)}%`,
  }
}

const UMBRAL_RECIENTE_MS = 10 * 60_000

// La frescura real de la lectura más nueva del galpón. La maqueta decía
// siempre "LIVE · hace 2s"; esto dice lo que de verdad pasó.
export function frescuraLecturas(sensores: SensorVista[]): {
  texto: string
  enVivo: boolean
} {
  const marcas = sensores
    .map((sensor) => sensor.ultimaLecturaTs)
    .filter((marca): marca is number => marca !== null)

  if (marcas.length === 0) return { texto: 'sin lecturas', enVivo: false }

  const transcurrido = Date.now() - Math.max(...marcas)
  const minutos = Math.floor(transcurrido / 60_000)
  const enVivo = transcurrido < UMBRAL_RECIENTE_MS

  if (minutos < 1) return { texto: 'hace segundos', enVivo }
  if (minutos < 60) return { texto: `hace ${minutos} min`, enVivo }

  const horas = Math.floor(minutos / 60)
  if (horas < 24) return { texto: `hace ${horas} h`, enVivo }
  return { texto: `hace ${Math.floor(horas / 24)} d`, enVivo }
}
