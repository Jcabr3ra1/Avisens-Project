import { describe, expect, it } from 'vitest'
import {
  MARCAS_ALIMENTO,
  SEXOS_LOTE,
  actualizarPayloadLote,
  crearFormularioLote,
  crearPayloadLote,
  tieneCurvaObjetivo,
} from './formularioLote'

describe('formulario de lote sin proveedor', () => {
  it('crea un formulario sin proveedor preseleccionado', () => {
    expect(crearFormularioLote(7).proveedor_id).toBeNull()
  })

  it('omite el proveedor al crear cuando aún no se conoce', () => {
    const formulario = crearFormularioLote(7)
    formulario.cantidad_inicial = 100

    expect(crearPayloadLote(formulario)).not.toHaveProperty('proveedor_id')
  })

  it('envía null al editar para retirar un proveedor ya asignado', () => {
    const formulario = crearFormularioLote(7)
    formulario.cantidad_inicial = 100

    expect(actualizarPayloadLote(formulario).proveedor_id).toBeNull()
  })
})

describe('vocabulario del lote', () => {
  it('los sexos son los que tiene sembrados la curva objetivo', () => {
    // La curva se busca por (marca, sexo). Si el formulario deja escribir
    // 'Macho ' o 'M', no hay coincidencia y el lote se queda sin referencia
    // sin que nada lo avise.
    expect([...SEXOS_LOTE]).toEqual(['macho', 'hembra', 'mixto'])
  })

  it('se ofrecen las cuatro marcas que el backend acepta', () => {
    expect([...MARCAS_ALIMENTO]).toEqual(['italcol', 'solla', 'contegral', 'finca'])
  })
})

describe('tieneCurvaObjetivo', () => {
  it('solo italcol y solla tienen curva sembrada', () => {
    expect(tieneCurvaObjetivo('italcol')).toBe(true)
    expect(tieneCurvaObjetivo('solla')).toBe(true)
    expect(tieneCurvaObjetivo('contegral')).toBe(false)
    expect(tieneCurvaObjetivo('finca')).toBe(false)
  })

  it('no se deja engañar por mayúsculas ni espacios', () => {
    expect(tieneCurvaObjetivo(' Italcol ')).toBe(true)
  })
})
