import { describe, expect, it } from 'vitest'
import {
  errorDeRegistro,
  FORMULARIO_INICIAL,
  formularioDesde,
  payloadRegistro,
  PESO_MAXIMO_G,
  PESO_MINIMO_G,
  AVES_MAXIMO,
  type EventoSanitario,
  type FormularioRegistro,
} from './bitacora'

function formularioPeso(datos: Partial<FormularioRegistro> = {}): FormularioRegistro {
  return {
    ...FORMULARIO_INICIAL,
    fecha: '2026-10-30',
    peso_promedio_g: '2500',
    ...datos,
  }
}

describe('errorDeRegistro', () => {
  it('valida peso promedio dentro de rango razonable', () => {
    expect(errorDeRegistro('peso', formularioPeso())).toBe('')
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: String(PESO_MAXIMO_G) }))).toBe('')
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: String(PESO_MINIMO_G) }))).toBe('')
  })

  it('rechaza peso promedio negativo, cero o vacío', () => {
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: '' }))).toMatch(/peso promedio/)
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: '0' }))).toMatch(/al menos/)
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: '-10' }))).toMatch(/al menos/)
  })

  it('rechaza valores astronómicos de peso promedio dejando margen sobre tablas', () => {
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: String(PESO_MAXIMO_G + 1) }))).toMatch(/razonable/)
    expect(errorDeRegistro('peso', formularioPeso({ peso_promedio_g: '1000000000000' }))).toMatch(/razonable/)
  })

  it('rechaza peso objetivo fuera de rango razonable si se suministra', () => {
    expect(errorDeRegistro('peso', formularioPeso({ peso_objetivo_g: '999999' }))).toMatch(/razonable/)
    expect(errorDeRegistro('peso', formularioPeso({ peso_objetivo_g: '0' }))).toMatch(/al menos/)
  })

  it('rechaza cantidad desproporcionada de aves pesadas', () => {
    expect(errorDeRegistro('peso', formularioPeso({ cantidad_aves_pesadas: String(AVES_MAXIMO + 1) }))).toMatch(/no puede superar/)
  })

  it('valida fecha obligatoria', () => {
    expect(errorDeRegistro('peso', formularioPeso({ fecha: '' }))).toMatch(/fecha/)
  })
})

describe('errorDeRegistro · sanidad (QA 17-nov)', () => {
  const base = { ...FORMULARIO_INICIAL, fecha: '2026-11-17', tipo: 'tratamiento' }

  it('rechaza producto o diagnóstico de solo números', () => {
    expect(errorDeRegistro('sanitario', { ...base, producto: '77777' })).toMatch(/producto o vacuna/)
    expect(errorDeRegistro('sanitario', { ...base, diagnostico: '8888' })).toMatch(/diagnóstico/)
  })

  it('acepta nombres con números y los campos vacíos', () => {
    expect(errorDeRegistro('sanitario', { ...base, producto: 'Enrofloxacina 10 %', diagnostico: 'CRD' })).toBe('')
    expect(errorDeRegistro('sanitario', base)).toBe('')
  })

  it('las aves tratadas son un entero entre 1 y el máximo', () => {
    expect(errorDeRegistro('sanitario', { ...base, cantidad_aves: '35' })).toBe('')
    expect(errorDeRegistro('sanitario', { ...base, cantidad_aves: '0' })).toMatch(/al menos 1/)
    expect(errorDeRegistro('sanitario', { ...base, cantidad_aves: '2.5' })).toMatch(/entero/)
    expect(errorDeRegistro('sanitario', { ...base, cantidad_aves: String(AVES_MAXIMO + 1) })).toMatch(/no pueden superar/)
  })
})

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
      cantidad_insumo: 2.5, evento_padre_id: 10,
    }
    expect(formularioDesde('sanitario', evento)).toMatchObject({
      fecha: '2026-11-10', cantidad_aves: '500', insumo_id: '4', dosis: '1 gota', via_aplicacion: 'ocular',
      cantidad_insumo: '2.5', evento_padre_id: '10',
    })
  })

  it('envia evento_padre_id y cantidad_insumo al crear y los omite al editar', () => {
    const form = {
      ...FORMULARIO_INICIAL,
      fecha: '2026-11-18',
      tipo: 'seguimiento',
      insumo_id: '2',
      cantidad_insumo: '1.5',
      evento_padre_id: '10',
    }
    expect(payloadRegistro('sanitario', form, 7, false)).toMatchObject({
      evento_padre_id: 10,
      cantidad_insumo: 1.5,
      insumo_id: 2,
    })
    const payloadEdicion = payloadRegistro('sanitario', form, 7, true) as Record<string, unknown>
    expect(payloadEdicion.evento_padre_id).toBeUndefined()
    expect(payloadEdicion.cantidad_insumo).toBeUndefined()
  })

  it('exige seleccionar insumo cuando se indica cantidad_insumo', () => {
    expect(
      errorDeRegistro('sanitario', { ...FORMULARIO_INICIAL, fecha: '2026-11-18', cantidad_insumo: '2' }),
    ).toMatch(/insumo de bodega/)
    expect(
      errorDeRegistro('sanitario', { ...FORMULARIO_INICIAL, fecha: '2026-11-18', insumo_id: '2', cantidad_insumo: '0' }),
    ).toMatch(/mayor que 0/)
  })
})
