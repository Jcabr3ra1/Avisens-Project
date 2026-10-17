import { describe, expect, it } from 'vitest'
import { A_PALETA, adaptarColores, colorMasCercano, PALETA_AVISENS } from './colores'

const relleno = (r: number, g: number, b: number) => ({ ty: 'fl', c: { k: [r, g, b, 1] } })

describe('adaptarColores', () => {
  it('lleva cada color al tono más cercano de la paleta', () => {
    const datos = { layers: [{ ty: 4, shapes: [relleno(0.07, 0.72, 0.63), relleno(0.1, 0.1, 0.1), relleno(1, 0.8, 0.1)] }] }
    const resultado = adaptarColores(datos, { colores: A_PALETA })
    const colores = resultado.layers[0].shapes.map((forma) => forma.c.k.slice(0, 3).map((v) => Math.round(v * 255)))
    expect(colores).toEqual([[0, 91, 72], [32, 59, 50], [227, 197, 101]])
  })

  it('no modifica la animación original', () => {
    const datos = { layers: [{ ty: 4, shapes: [relleno(1, 0, 0)] }] }
    adaptarColores(datos, { colores: A_PALETA })
    expect(datos.layers[0].shapes[0].c.k).toEqual([1, 0, 0, 1])
  })

  it('quita la capa de fondo sólido y pinta capas por nombre', () => {
    const datos = { layers: [{ ty: 1, nm: 'fondo' }, { ty: 4, nm: 'punto', shapes: [relleno(0, 0, 0)] }] }
    const resultado = adaptarColores(datos, { quitarFondo: true, capas: { punto: PALETA_AVISENS.maiz } })
    expect(resultado.layers.map((capa) => capa.nm)).toEqual(['punto'])
    const capa = resultado.layers[0] as { shapes: Array<{ c: { k: number[] } }> }
    expect(capa.shapes[0].c.k.map((v) => Math.round(v * 255)).slice(0, 3)).toEqual([227, 197, 101])
  })

  it('recolorea también los colores animados por fotogramas', () => {
    const datos = { layers: [{ ty: 4, shapes: [{ ty: 'fl', c: { a: 1, k: [{ t: 0, s: [0.78, 0.9, 0.98, 1] }, { t: 10, s: [0.1, 0.1, 0.1, 1] }] } }] }] }
    const resultado = adaptarColores(datos, { colores: A_PALETA })
    const fotogramas = resultado.layers[0].shapes[0].c.k.map((f) => f.s.slice(0, 3).map((v) => Math.round(v * 255)))
    expect(fotogramas).toEqual([[247, 246, 239], [32, 59, 50]])
  })

  it('recolorea cada parada de un degradado sin tocar su posición', () => {
    const datos = { layers: [{ ty: 4, shapes: [{ ty: 'gf', g: { p: 2, k: { a: 0, k: [0, 0.78, 0.9, 0.98, 1, 0.1, 0.1, 0.1] } } }] }] }
    const resultado = adaptarColores(datos, { colores: A_PALETA })
    const valores = resultado.layers[0].shapes[0].g.k.k.map((v) => Math.round(v * 255))
    expect(valores).toEqual([0, 247, 246, 239, 255, 32, 59, 50])
  })

  it('elige el color más cercano por distancia', () => {
    expect(colorMasCercano([10, 10, 10], [[[0, 0, 0], [1, 1, 1]], [[255, 255, 255], [2, 2, 2]]])).toEqual([1, 1, 1])
  })
})
