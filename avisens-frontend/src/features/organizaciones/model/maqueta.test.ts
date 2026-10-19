import { describe, expect, it } from 'vitest'
import type { GranjaOrganizacionDetalle } from '../api/organizaciones'
import {
  GALPON,
  MARGEN_SUELO,
  MAX_GALLINAS,
  MAX_GALPONES_POR_GRANJA,
  SEPARACION_GALLINAS,
  MAX_GRANJAS_MAQUETA,
  aleatorioConSemilla,
  describirMaqueta,
  distribuirMaqueta,
  sembrarArboles,
  sembrarPasto,
  ubicarGallinas,
} from './maqueta'

function granja(id: number, galpones: number, sensores = 0): GranjaOrganizacionDetalle {
  return {
    id,
    nombre: `Granja ${id}`,
    direccion: null,
    municipio: null,
    departamento: null,
    area_total_m2: null,
    activa: true,
    propietario: { id: 1, nombre_completo: 'Ana', email: 'ana@avisens.co', telefono: null, activo: true },
    galpones: Array.from({ length: galpones }, (_, indice) => ({
      id: id * 100 + indice,
      codigo: `G${indice + 1}`,
      nombre: `Galpón ${indice + 1}`,
      activo: true,
      _count: { dispositivo: 1, sensores },
    })),
  }
}

function seSolapan(a: { x: number; z: number; ancho: number; fondo: number }, b: typeof a) {
  return Math.abs(a.x - b.x) < (a.ancho + b.ancho) / 2 && Math.abs(a.z - b.z) < (a.fondo + b.fondo) / 2
}

describe('distribuirMaqueta', () => {
  it('sin granjas devuelve una maqueta vacía con radio mínimo', () => {
    const maqueta = distribuirMaqueta([])
    expect(maqueta.parcelas).toEqual([])
    expect(maqueta.radio).toBeGreaterThan(0)
    expect(maqueta.granjasOcultas).toBe(0)
  })

  it('ninguna parcela se solapa con otra', () => {
    const granjas = [granja(1, 1), granja(2, 7), granja(3, 0), granja(4, 12), granja(5, 3)]
    const { parcelas } = distribuirMaqueta(granjas)
    for (let i = 0; i < parcelas.length; i++) {
      for (let j = i + 1; j < parcelas.length; j++) {
        expect(seSolapan(parcelas[i], parcelas[j])).toBe(false)
      }
    }
  })

  it('cada galpón queda dentro de su parcela', () => {
    const { parcelas } = distribuirMaqueta([granja(1, 9), granja(2, 2)])
    for (const parcela of parcelas) {
      for (const galpon of parcela.galpones) {
        expect(Math.abs(galpon.x) + GALPON.ancho / 2).toBeLessThanOrEqual(parcela.ancho / 2)
        expect(Math.abs(galpon.z) + GALPON.largo / 2).toBeLessThanOrEqual(parcela.fondo / 2)
      }
    }
  })

  it('el radio envuelve todas las parcelas', () => {
    const { parcelas, radio } = distribuirMaqueta([granja(1, 4), granja(2, 4), granja(3, 4)])
    for (const parcela of parcelas) {
      const esquina = Math.hypot(Math.abs(parcela.x) + parcela.ancho / 2, Math.abs(parcela.z) + parcela.fondo / 2)
      expect(esquina).toBeLessThanOrEqual(radio + 1e-9)
    }
  })

  it('limita granjas y galpones dibujados e informa cuántos quedan fuera', () => {
    const granjas = Array.from({ length: MAX_GRANJAS_MAQUETA + 3 }, (_, indice) => granja(indice + 1, 1))
    granjas[0] = granja(1, MAX_GALPONES_POR_GRANJA + 5)
    const maqueta = distribuirMaqueta(granjas)
    expect(maqueta.parcelas).toHaveLength(MAX_GRANJAS_MAQUETA)
    expect(maqueta.granjasOcultas).toBe(3)
    expect(maqueta.parcelas[0].galpones).toHaveLength(MAX_GALPONES_POR_GRANJA)
    expect(maqueta.parcelas[0].galponesOcultos).toBe(5)
  })

  it('suma los sensores de todos los galpones de la granja, también los no dibujados', () => {
    const maqueta = distribuirMaqueta([granja(1, MAX_GALPONES_POR_GRANJA + 2, 3)])
    expect(maqueta.parcelas[0].sensores).toBe((MAX_GALPONES_POR_GRANJA + 2) * 3)
  })
})

describe('aleatorioConSemilla', () => {
  it('repite la misma secuencia con la misma semilla y queda en [0, 1)', () => {
    const a = aleatorioConSemilla(42)
    const b = aleatorioConSemilla(42)
    const valores = Array.from({ length: 50 }, () => a())
    expect(valores).toEqual(Array.from({ length: 50 }, () => b()))
    expect(valores.every(valor => valor >= 0 && valor < 1)).toBe(true)
  })
})

describe('describirMaqueta', () => {
  it('resume granjas, galpones y galpones con sensores en singular o plural', () => {
    expect(describirMaqueta('Avícola Sur', [granja(1, 1, 2)])).toBe(
      'Maqueta 3D de Avícola Sur: 1 granja, 1 galpón y 1 galpón con sensores asignados.',
    )
    expect(describirMaqueta('Avícola Sur', [granja(1, 2), granja(2, 1)])).toBe(
      'Maqueta 3D de Avícola Sur: 2 granjas, 3 galpones y 0 galpones con sensores asignados.',
    )
  })
})

describe('sembrarArboles', () => {
  const maqueta = distribuirMaqueta([granja(1, 4), granja(2, 2), granja(3, 7)])
  const radioArbol = 0.35
  const arboles = sembrarArboles(maqueta, aleatorioConSemilla(7), { variantes: 5, radioArbol })

  it('siembra muchos árboles', () => {
    expect(arboles.length).toBeGreaterThanOrEqual(60)
  })

  it('ningún árbol se encima con otro', () => {
    for (let i = 0; i < arboles.length; i++) {
      for (let j = i + 1; j < arboles.length; j++) {
        const distancia = Math.hypot(arboles[i].x - arboles[j].x, arboles[i].z - arboles[j].z)
        expect(distancia).toBeGreaterThanOrEqual((arboles[i].escala + arboles[j].escala) * radioArbol)
      }
    }
  })

  it('ningún árbol pisa una parcela ni se sale del suelo', () => {
    for (const arbol of arboles) {
      const radio = arbol.escala * radioArbol
      expect(Math.hypot(arbol.x, arbol.z) + radio).toBeLessThanOrEqual(maqueta.radio + MARGEN_SUELO)
      for (const parcela of maqueta.parcelas) {
        const dentro = Math.abs(arbol.x - parcela.x) < parcela.ancho / 2 + radio
          && Math.abs(arbol.z - parcela.z) < parcela.fondo / 2 + radio
        expect(dentro).toBe(false)
      }
    }
  })

  it('reparte las variantes disponibles y repite el bosque con la misma semilla', () => {
    expect(new Set(arboles.map(arbol => arbol.variante)).size).toBe(5)
    expect(sembrarArboles(maqueta, aleatorioConSemilla(7), { variantes: 5, radioArbol })).toEqual(arboles)
  })
})

describe('sembrarPasto', () => {
  const maqueta = distribuirMaqueta([granja(1, 4), granja(2, 2)])
  const arboles = sembrarArboles(maqueta, aleatorioConSemilla(3), { variantes: 3, radioArbol: 0.35 })
  const matas = sembrarPasto(maqueta, aleatorioConSemilla(4), arboles, { variantes: 4 })

  it('deja crecer pasto dentro de la granja, alrededor de los galpones', () => {
    const dentroDeGranja = matas.filter(mata => maqueta.parcelas.some(parcela =>
      Math.abs(mata.x - parcela.x) < parcela.ancho / 2 && Math.abs(mata.z - parcela.z) < parcela.fondo / 2))
    expect(dentroDeGranja.length).toBeGreaterThan(0)
  })

  it('siembra cientos de matas repartidas entre las variantes', () => {
    expect(matas.length).toBeGreaterThanOrEqual(150)
    expect(new Set(matas.map(mata => mata.variante)).size).toBe(4)
  })

  it('no pisa galpones, troncos ni el borde del suelo', () => {
    for (const mata of matas) {
      expect(Math.hypot(mata.x, mata.z)).toBeLessThanOrEqual(maqueta.radio + MARGEN_SUELO)
      for (const parcela of maqueta.parcelas) {
        for (const galpon of parcela.galpones) {
          const dentro = Math.abs(mata.x - parcela.x - galpon.x) < GALPON.ancho / 2
            && Math.abs(mata.z - parcela.z - galpon.z) < GALPON.largo / 2
          expect(dentro).toBe(false)
        }
      }
      for (const arbol of arboles) {
        expect(Math.hypot(arbol.x - mata.x, arbol.z - mata.z)).toBeGreaterThan(0.12)
      }
    }
  })
})

describe('ubicarGallinas', () => {
  const inactiva = granja(9, 2)
  inactiva.galpones = inactiva.galpones.map(galpon => ({ ...galpon, activo: false }))
  const maqueta = distribuirMaqueta([granja(1, 4), granja(2, 1), inactiva])
  const gallinas = ubicarGallinas(maqueta, aleatorioConSemilla(11))

  it('pone gallinas solo junto a galpones activos', () => {
    expect(gallinas.length).toBeGreaterThan(0)
    expect(gallinas.some(gallina => gallina.granjaId === 9)).toBe(false)
  })

  it('cada gallina queda dentro de su granja, fuera de las naves y sin encimarse', () => {
    for (const gallina of gallinas) {
      const parcela = maqueta.parcelas.find(item => item.id === gallina.granjaId)!
      expect(Math.abs(gallina.x)).toBeLessThan(parcela.ancho / 2)
      expect(Math.abs(gallina.z)).toBeLessThan(parcela.fondo / 2)
      for (const galpon of parcela.galpones) {
        const dentro = Math.abs(gallina.x - galpon.x) < (GALPON.ancho + 0.18) / 2 && Math.abs(gallina.z - galpon.z) < GALPON.largo / 2
        expect(dentro).toBe(false)
      }
      for (const otra of gallinas.filter(item => item !== gallina && item.granjaId === gallina.granjaId)) {
        expect(Math.hypot(otra.x - gallina.x, otra.z - gallina.z)).toBeGreaterThanOrEqual(SEPARACION_GALLINAS)
      }
    }
  })

  it('respeta el máximo total de gallinas', () => {
    const grande = distribuirMaqueta(Array.from({ length: 16 }, (_, indice) => granja(indice + 1, 12)))
    expect(ubicarGallinas(grande, aleatorioConSemilla(2)).length).toBeLessThanOrEqual(MAX_GALLINAS)
  })
})
