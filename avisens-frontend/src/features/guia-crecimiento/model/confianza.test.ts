import { describe, expect, it } from 'vitest'
import {
  etiquetaConfianza, etiquetaSeveridad, resumenDeAlertas, textoDeRango,
} from './confianza'

describe('confianza de la proyección', () => {
  it('nombra cada nivel en español y tolera que el modelo no lo envíe', () => {
    expect(etiquetaConfianza('alta')).toBe('Confianza alta')
    expect(etiquetaConfianza('media')).toBe('Confianza media')
    expect(etiquetaConfianza('baja')).toBe('Confianza baja')
    expect(etiquetaConfianza(undefined)).toBeNull()
  })

  it('describe el rango de peso en kilos y avisa la cobertura cuando está calibrada', () => {
    expect(textoDeRango({ min: 3002, max: 3844, cobertura_pct: 90 }, 'peso'))
      .toBe('Entre 3,00 kg y 3,84 kg · cubre cerca del 90 % de los casos')
    expect(textoDeRango({ min: 900, max: 1200 }, 'peso')).toBe('Entre 900 g y 1,20 kg')
  })

  it('describe los rangos de mortalidad y consumo con su unidad', () => {
    expect(textoDeRango({ min: 2.1, max: 3.46 }, 'mortalidad')).toBe('Entre 2,1 % y 3,5 %')
    expect(textoDeRango({ min: 1200, max: 1500.5 }, 'consumo')).toBe('Entre 1.200 kg y 1.501 kg')
  })

  it('no inventa un rango cuando falta o es incoherente', () => {
    expect(textoDeRango(undefined, 'peso')).toBeNull()
    expect(textoDeRango(null, 'consumo')).toBeNull()
    expect(textoDeRango({ min: 5, max: 1 }, 'mortalidad')).toBeNull()
  })
})

describe('alertas tempranas', () => {
  it('nombra la gravedad con palabras, no solo con color', () => {
    expect(etiquetaSeveridad('alta')).toBe('Urgente')
    expect(etiquetaSeveridad('media')).toBe('Atención')
    expect(etiquetaSeveridad('baja')).toBe('Revisar')
  })

  it('resume cuántas alertas hay y cuál es la más grave', () => {
    expect(resumenDeAlertas({ total: 0, severidad_maxima: 'ninguna' }))
      .toBe('Sin alertas: peso, consumo y mortalidad van dentro de lo esperado.')
    expect(resumenDeAlertas({ total: 1, severidad_maxima: 'media' }))
      .toBe('1 alerta · la más grave requiere atención.')
    expect(resumenDeAlertas({ total: 3, severidad_maxima: 'alta' }))
      .toBe('3 alertas · la más grave es urgente.')
    expect(resumenDeAlertas({ total: 2, severidad_maxima: 'baja' }))
      .toBe('2 alertas · conviene revisarlas.')
  })
})
