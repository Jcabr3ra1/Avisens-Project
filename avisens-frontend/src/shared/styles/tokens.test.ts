import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = join(import.meta.dirname, '../..')

function colorRaiz(nombre: string): number[] {
  const css = readFileSync(join(import.meta.dirname, 'index.css'), 'utf-8')
  const raiz = css.match(/:root\s*\{([^}]+)\}/)?.[1] ?? ''
  const tokens = new Map([...raiz.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
    .map(([, token, valor]) => [token, valor.trim()]))
  let valor = tokens.get(nombre) ?? ''
  const visitados = new Set([nombre])
  while (valor.startsWith('var(')) {
    const alias = valor.slice(4, -1)
    if (visitados.has(alias)) throw new Error(`Ciclo de color en ${nombre}`)
    visitados.add(alias)
    valor = tokens.get(alias) ?? ''
  }
  if (!/^#[\da-f]{6}$/i.test(valor)) throw new Error(`Color no resuelto: ${nombre}`)
  return [1, 3, 5].map((inicio) => parseInt(valor.slice(inicio, inicio + 2), 16) / 255)
}

function luminancia(rgb: number[]): number {
  return rgb.map((canal) => canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4)
    .reduce((suma, canal, indice) => suma + canal * [0.2126, 0.7152, 0.0722][indice], 0)
}

function hojasDeEstilo(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) return hojasDeEstilo(ruta)
    return entrada.name.endsWith('.css') ? [ruta] : []
  })
}

// Una declaración con `var(--x)` sin definir se descarta entera y en silencio:
// no hay error de compilación, de lint ni de consola, solo un botón blanco
// sobre blanco en producción. Así vivieron 97 referencias a trece variables
// que nadie había declarado. Esta prueba es la red que faltaba.
describe('tokens CSS', () => {
  const hojas = hojasDeEstilo(RAIZ)

  it('encuentra las hojas de estilo del proyecto', () => {
    expect(hojas.length).toBeGreaterThan(10)
  })

  it('toda variable usada sin valor de reserva está declarada', () => {
    const declaradas = new Set<string>()
    const usadas = new Map<string, string>()

    for (const ruta of hojas) {
      const css = readFileSync(ruta, 'utf-8')
      const corta = ruta.slice(RAIZ.length + 1)

      for (const [, nombre] of css.matchAll(/(?:^|[;{\s])(--[\w-]+)\s*:/g)) {
        declaradas.add(nombre)
      }
      // Con reserva —`var(--tip-x, 50%)`— la declaración sigue siendo válida,
      // así que esas se admiten: el patrón exige `)` inmediato.
      for (const [, nombre] of css.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
        if (!usadas.has(nombre)) usadas.set(nombre, corta)
      }
    }

    const huerfanas = [...usadas]
      .filter(([nombre]) => !declaradas.has(nombre))
      .map(([nombre, donde]) => `${nombre} (usada en ${donde})`)

    expect(huerfanas).toEqual([])
  })

  it('los textos y estados de la paleta mantienen al menos 4,5:1 de contraste', () => {
    const pares = [
      ...['--surface-page', '--surface-base', '--surface-subtle', '--surface-tinted', '--surface-hover']
        .flatMap((fondo) => ['--text-primary', '--text-secondary', '--text-muted', '--text-disabled']
          .map((texto) => [texto, fondo])),
      ['--on-primary', '--primary'],
      ['--on-primary', '--primary-hover'],
      ['--on-primary-muted', '--primary'],
      ['--on-accent', '--accent'],
      ['--text-primary', '--avisens-sage'],
      ['--success', '--success-soft'],
      ['--warning', '--warning-soft'],
      ['--danger', '--danger-soft'],
      ['--info', '--info-soft'],
    ]
    for (const [texto, fondo] of pares) {
      const a = luminancia(colorRaiz(texto))
      const b = luminancia(colorRaiz(fondo))
      const contraste = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      expect(contraste, `${texto} sobre ${fondo}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
