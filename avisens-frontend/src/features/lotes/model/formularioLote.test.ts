import { describe, expect, it } from 'vitest'
import {
  actualizarPayloadLote,
  crearFormularioLote,
  crearPayloadLote,
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
