import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = join(import.meta.dirname, '../..')

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
})
