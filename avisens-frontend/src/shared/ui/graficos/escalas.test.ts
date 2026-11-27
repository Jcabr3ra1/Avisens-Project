import { describe, expect, it } from 'vitest'
import { marcasDePeso } from './escalas'

describe('marcasDePeso', () => {
  it('usa pasos de 1 kg por encima de 3 kg y de medio kilo por debajo', () => {
    expect(marcasDePeso(3258)).toEqual([0, 1000, 2000, 3000, 4000])
    expect(marcasDePeso(1100)).toEqual([0, 500, 1000, 1500])
    expect(marcasDePeso(0)).toEqual([0, 500])
  })
})
