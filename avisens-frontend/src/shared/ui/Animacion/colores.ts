type Rgb = [number, number, number]

export const PALETA_AVISENS = {
  bosque: '#005b48',
  marfil: '#f7f6ef',
  maiz: '#e3c565',
  salvia: '#c6d2bf',
  tinta: '#203b32',
} as const

export type OpcionesColor = {
  colores?: Record<string, string>
  quitarFondo?: boolean
  capas?: Record<string, string>
}

function aRgb(hex: string): Rgb {
  const valor = Number.parseInt(hex.replace('#', ''), 16)
  return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255]
}

export function colorMasCercano(color: Rgb, paleta: Array<[Rgb, Rgb]>): Rgb {
  let mejor = paleta[0]
  let distancia = Number.POSITIVE_INFINITY
  for (const par of paleta) {
    const d = par[0].reduce((suma, canal, i) => suma + (canal - color[i]) ** 2, 0)
    if (d < distancia) { distancia = d; mejor = par }
  }
  return mejor[1]
}

function esColor(valor: unknown): valor is number[] {
  return Array.isArray(valor) && valor.length >= 3 && valor.every((v) => typeof v === 'number')
}

function recorrerColores(nodo: unknown, cambiar: (color: number[]) => number[]) {
  if (Array.isArray(nodo)) { nodo.forEach((hijo) => recorrerColores(hijo, cambiar)); return }
  if (!nodo || typeof nodo !== 'object') return
  const objeto = nodo as Record<string, unknown>
  const relleno = objeto.c as { k?: unknown } | undefined
  if ((objeto.ty === 'fl' || objeto.ty === 'st') && relleno) {
    if (esColor(relleno.k)) relleno.k = cambiar(relleno.k)
    else if (Array.isArray(relleno.k)) {
      for (const fotograma of relleno.k as Array<Record<string, unknown>>) {
        if (fotograma && esColor(fotograma.s)) fotograma.s = cambiar(fotograma.s)
        if (fotograma && esColor(fotograma.e)) fotograma.e = cambiar(fotograma.e)
      }
    }
  }
  const degradado = objeto.g as { p?: number; k?: { k?: unknown } } | undefined
  if ((objeto.ty === 'gf' || objeto.ty === 'gs') && degradado?.p && Array.isArray(degradado.k?.k)) {
    const valores = degradado.k.k as number[]
    for (let indice = 0; indice < degradado.p; indice += 1) {
      const inicio = indice * 4 + 1
      const [r, g, b] = cambiar(valores.slice(inicio, inicio + 3))
      valores.splice(inicio, 3, r, g, b)
    }
  }
  Object.values(objeto).forEach((hijo) => recorrerColores(hijo, cambiar))
}

export function adaptarColores<T extends object>(datos: T, { colores = {}, quitarFondo = false, capas = {} }: OpcionesColor): T {
  const paleta: Array<[Rgb, Rgb]> = Object.entries(colores).map(([de, a]) => [aRgb(de), aRgb(a)])
  const copia = structuredClone(datos) as T & { layers?: Array<{ ty?: number; nm?: string }> }
  if (quitarFondo && copia.layers) copia.layers = copia.layers.filter((capa) => capa.ty !== 1)
  if (paleta.length) {
    recorrerColores(copia, (color) => {
      const nuevo = colorMasCercano([color[0] * 255, color[1] * 255, color[2] * 255], paleta)
      return [nuevo[0] / 255, nuevo[1] / 255, nuevo[2] / 255, color[3] ?? 1]
    })
  }
  for (const capa of copia.layers ?? []) {
    const destino = capa.nm ? capas[capa.nm] : undefined
    if (!destino) continue
    const [r, g, b] = aRgb(destino)
    recorrerColores(capa, (color) => [r / 255, g / 255, b / 255, color[3] ?? 1])
  }
  return copia
}

export const A_PALETA: Record<string, string> = Object.fromEntries(
  Object.values(PALETA_AVISENS).map((color) => [color, color]),
)
