import { describe, expect, it } from 'vitest'
import { PARTES_VACIAS, componerDireccion, descomponerDireccion, errorDireccion, type PartesDireccion } from './direccion'

const partes = (cambios: Partial<PartesDireccion>): PartesDireccion => ({ ...PARTES_VACIAS, ...cambios })

describe('QA-05: dirección guiada de la granja', () => {
  it('rechaza la dirección "1111…" que se pudo guardar en la prueba', () => {
    expect(errorDireccion(partes({ complemento: '11111111111111111111111111111111111111' }))).toMatch(/tipo de vía/)
    expect(errorDireccion(partes({ tipoVia: 'Vereda', via: '1111111111' }))).toMatch(/no solo números/)
  })

  it('arma una dirección urbana con el formato colombiano', () => {
    const urbana = partes({ tipoVia: 'Carrera', via: '10A', numero: '5', placa: '23', complemento: 'Barrio Centro' })
    expect(errorDireccion(urbana)).toBe('')
    expect(componerDireccion(urbana)).toBe('Carrera 10A # 5-23, Barrio Centro')
  })

  it('exige número de cruce y placa en calles, carreras y transversales', () => {
    expect(errorDireccion(partes({ tipoVia: 'Transversal', via: '3' }))).toMatch(/vía que cruza/)
    expect(errorDireccion(partes({ tipoVia: 'Calle', via: '3', numero: '4' }))).toMatch(/placa/)
    expect(errorDireccion(partes({ tipoVia: 'Calle', via: 'abc', numero: '4', placa: '1' }))).toMatch(/10A/)
  })

  it('acepta direcciones rurales por nombre de vereda', () => {
    const rural = partes({ tipoVia: 'Vereda', via: 'El Progreso', complemento: 'Finca La Esperanza' })
    expect(errorDireccion(rural)).toBe('')
    expect(componerDireccion(rural)).toBe('Vereda El Progreso, Finca La Esperanza')
  })

  it('un kilómetro necesita la vía o finca de referencia', () => {
    expect(errorDireccion(partes({ tipoVia: 'Kilómetro', via: '4' }))).toMatch(/complemento/)
    expect(errorDireccion(partes({ tipoVia: 'Kilómetro', via: '4', complemento: 'Vía Toribío' }))).toBe('')
  })

  it('vuelve a leer por partes una dirección guardada con el formato guiado', () => {
    expect(descomponerDireccion('Calle 10 # 5-23, Barrio Centro')).toEqual({
      tipoVia: 'Calle', via: '10', numero: '5', placa: '23', complemento: 'Barrio Centro',
    })
    expect(descomponerDireccion('Vereda El Progreso')).toEqual(partes({ tipoVia: 'Vereda', via: 'El Progreso' }))
  })

  it('una dirección antigua con texto se conserva en el complemento; una de solo números se descarta', () => {
    expect(descomponerDireccion('Finca Los Pinos, sector alto').complemento).toBe('Finca Los Pinos, sector alto')
    expect(descomponerDireccion('11111111111111111111')).toEqual(PARTES_VACIAS)
  })
})
