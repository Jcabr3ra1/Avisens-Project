import { CanvasTexture, SRGBColorSpace } from 'three'
import type { ZonaGalpon } from '@features/galpones/api/zonas'
import { esLecturaVigente, type SensorVista } from '../hooks/useMonitoreoAmbiental'

export interface PuntoTermico {
  id: number
  codigo: string
  x: number
  z: number
  altura: number
  valor: number | null
  minUmbral: number | null
  maxUmbral: number | null
  estado: SensorVista['estado']
  sinCalibrar: boolean
  antiguedadSegundos: number | null
}

function colorPorTemperatura(temp: number, minOptimo: number, maxOptimo: number): [number, number, number] {
  const rango = Math.max(1, maxOptimo - minOptimo)
  const criticoBajo = minOptimo - rango * 0.6
  const criticoAlto = maxOptimo + rango * 0.6

  if (temp <= criticoBajo) return [14, 165, 233] // Azul frío
  if (temp < minOptimo) {
    const t = (temp - criticoBajo) / (minOptimo - criticoBajo)
    return [
      Math.round(14 + (34 - 14) * t),
      Math.round(165 + (197 - 165) * t),
      Math.round(233 + (94 - 233) * t),
    ]
  }
  if (temp <= maxOptimo) {
    return [34, 197, 94] // Verde óptimo
  }
  if (temp < criticoAlto) {
    const t = (temp - maxOptimo) / (criticoAlto - maxOptimo)
    return [
      Math.round(34 + (249 - 34) * t),
      Math.round(197 + (115 - 197) * t),
      Math.round(94 + (22 - 94) * t),
    ]
  }
  return [239, 68, 68] // Rojo crítico
}

export function esSensorTermicoConFalla(punto: Pick<PuntoTermico, 'estado' | 'valor' | 'sinCalibrar' | 'antiguedadSegundos'>): boolean {
  if (!esLecturaVigente(punto.estado)) return true
  if (punto.valor === null || punto.sinCalibrar) return true
  if ((punto.antiguedadSegundos ?? 0) > 120) return true
  return false
}

export function construirTexturaTermica(params: {
  anchoMetros: number
  largoMetros: number
  puntos: PuntoTermico[]
  zonas: ZonaGalpon[]
  mostrarCuadricula?: boolean
  resolucion?: number
}): CanvasTexture {
  const { anchoMetros, largoMetros, puntos, zonas, mostrarCuadricula = false, resolucion = 150 } = params
  const aspecto = Math.max(0.25, Math.min(2.5, anchoMetros / Math.max(1, largoMetros)))
  const width = Math.max(64, Math.round(resolucion * aspecto))
  const height = resolucion

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const imgData = ctx.createImageData(width, height)

  const validos = puntos.filter((p) => !esSensorTermicoConFalla(p))
  const refMin = validos.find((p) => p.minUmbral !== null)?.minUmbral ?? 20
  const refMax = validos.find((p) => p.maxUmbral !== null)?.maxUmbral ?? 26

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const idx = (py * width + px) * 4

      if (validos.length === 0) {
        imgData.data[idx] = 100
        imgData.data[idx + 1] = 116
        imgData.data[idx + 2] = 139
        imgData.data[idx + 3] = 75
        continue
      }

      const worldX = (px / width - 0.5) * anchoMetros
      const worldZ = (py / height - 0.5) * largoMetros

      let sumaPesos = 0
      let sumaTemp = 0

      for (const s of validos) {
        const dx = worldX - s.x
        const dz = worldZ - s.z
        const distSq = dx * dx + dz * dz
        if (distSq < 0.02) {
          sumaTemp = s.valor!
          sumaPesos = 1
          break
        }
        const peso = 1 / Math.pow(distSq, 1.2)
        sumaTemp += s.valor! * peso
        sumaPesos += peso
      }

      const tempInterpolada = sumaTemp / sumaPesos
      const [r, g, b] = colorPorTemperatura(tempInterpolada, refMin, refMax)
      imgData.data[idx] = r
      imgData.data[idx + 1] = g
      imgData.data[idx + 2] = b
      imgData.data[idx + 3] = 185
    }
  }

  ctx.putImageData(imgData, 0, 0)

  // Divisiones de zonas
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.setLineDash([6, 4])
  ctx.lineWidth = 1.5

  if (zonas.length > 0) {
    zonas.forEach((z) => {
      if (
        z.coordenada_x_inicio === null ||
        z.coordenada_y_inicio === null ||
        z.coordenada_x_fin === null ||
        z.coordenada_y_fin === null
      ) return
      const x1 = ((z.coordenada_x_inicio + anchoMetros / 2) / anchoMetros) * width
      const y1 = ((z.coordenada_y_inicio + largoMetros / 2) / largoMetros) * height
      const w = ((z.coordenada_x_fin - z.coordenada_x_inicio) / anchoMetros) * width
      const h = ((z.coordenada_y_fin - z.coordenada_y_inicio) / largoMetros) * height
      ctx.strokeRect(x1, y1, w, h)
    })
  } else {
    ;[1 / 3, 2 / 3].forEach((ratio) => {
      const y = height * ratio
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    })
  }

  // Cuadrícula métrica en Modo Edición
  if (mostrarCuadricula) {
    ctx.setLineDash([])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
    ctx.lineWidth = 0.75
    for (let mX = 2; mX < anchoMetros; mX += 2) {
      const px = (mX / anchoMetros) * width
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, height)
      ctx.stroke()
    }
    for (let mZ = 2; mZ < largoMetros; mZ += 2) {
      const py = (mZ / largoMetros) * height
      ctx.beginPath()
      ctx.moveTo(0, py)
      ctx.lineTo(width, py)
      ctx.stroke()
    }
  }

  const textura = new CanvasTexture(canvas)
  textura.colorSpace = SRGBColorSpace
  textura.needsUpdate = true
  return textura
}