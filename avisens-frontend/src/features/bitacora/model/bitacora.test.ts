import { describe, expect, it } from 'vitest'
import { FORMULARIO_INICIAL, formularioDesde, payloadRegistro, type EventoSanitario } from './bitacora'

describe('evento sanitario', () => {
  it('envía dosis, vía, aves tratadas e insumo de bodega', () => {
    const form = {
      ...FORMULARIO_INICIAL,
      fecha: '2026-11-18',
      tipo: 'tratamiento',
      producto: 'Enrofloxacina',
      dosis: ' 0,5 ml por ave ',
      via_aplicacion: 'agua',
      cantidad_aves: '35',
      insumo_id: '2',
    }
    expect(payloadRegistro('sanitario', form, 7)).toEqual({
      lote_id: 7,
      fecha: '2026-11-18',
      metodo_registro: 'manual',
      observaciones: undefined,
      tipo: 'tratamiento',
      producto: 'Enrofloxacina',
      diagnostico: undefined,
      cantidad_aves: 35,
      dosis: '0,5 ml por ave',
      via_aplicacion: 'agua',
      insumo_id: 2,
    })
  })

  it('los campos nuevos son opcionales', () => {
    const payload = payloadRegistro('sanitario', { ...FORMULARIO_INICIAL, fecha: '2026-11-18' }, 7) as Record<string, unknown>
    expect(payload.cantidad_aves).toBeUndefined()
    expect(payload.dosis).toBeUndefined()
    expect(payload.via_aplicacion).toBeUndefined()
    expect(payload.insumo_id).toBeUndefined()
  })

  it('al corregir un evento carga los campos guardados', () => {
    const evento: EventoSanitario = {
      id: 1, lote_id: 7, fecha: '2026-11-10T00:00:00.000Z', tipo: 'vacunacion', producto: 'Newcastle',
      diagnostico: null, cantidad_aves: 500, observaciones: null, insumo_id: 4, dosis: '1 gota', via_aplicacion: 'ocular',
    }
    expect(formularioDesde('sanitario', evento)).toMatchObject({
      fecha: '2026-11-10', cantidad_aves: '500', insumo_id: '4', dosis: '1 gota', via_aplicacion: 'ocular',
    })
  })
})
