import { Color } from 'three'

const memoria = new Map<string, Promise<Color>>()

export function colorDelHorizonte(url: string): Promise<Color> {
  const guardado = memoria.get(url)
  if (guardado) return guardado
  const promesa = new Promise<Color>((resolver) => {
    const imagen = new Image()
    imagen.onload = () => {
      const lienzo = document.createElement('canvas')
      lienzo.width = 24
      lienzo.height = 8
      const contexto = lienzo.getContext('2d', { willReadFrequently: true })
      if (!contexto) {
        resolver(new Color(0x86a46a))
        return
      }
      const alto = imagen.naturalHeight
      contexto.drawImage(imagen, 0, alto * 0.8, imagen.naturalWidth, alto * 0.12, 0, 0, 24, 8)
      const { data } = contexto.getImageData(0, 0, 24, 8)
      let r = 0
      let g = 0
      let b = 0
      const total = data.length / 4
      for (let indice = 0; indice < data.length; indice += 4) {
        r += data[indice]
        g += data[indice + 1]
        b += data[indice + 2]
      }
      resolver(new Color().setRGB(r / total / 255, g / total / 255, b / total / 255, 'srgb'))
    }
    imagen.onerror = () => resolver(new Color(0x86a46a))
    imagen.src = url
  })
  memoria.set(url, promesa)
  return promesa
}
