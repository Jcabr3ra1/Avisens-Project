import { describe, expect, it } from 'vitest'
import type { Granja } from '../api/granjas'
import type { Galpon } from '@features/galpones/api/galpones'
import type { Lote } from '@features/lotes/api/lotes'
import {
  enlaceMapa, faltantesGalpon, faltantesGranja, faltantesLote, formDatosGranja, formDatosLote,
  payloadDatosGranja, payloadDatosLote, pendientesAdminGranja, textoFaltantes, unir,
} from './datosDescriptivos'

const granja: Granja = {
  id: 1, nombre: 'el jaller', direccion: null, municipio: null, departamento: null,
  latitud: null, longitud: null, area_total_m2: null, activa: true, fecha_creacion: '2026-10-01',
  propietario: { id: 56, nombre_completo: 'jaller' },
}

const galpon = {
  id: 31, codigo: 'GAL-31', nombre: 'jallergalpon', capacidad_aves: 500, ancho_metros: null, largo_metros: null,
  orientacion: null, tipo_techo: null, plano_url: null, fecha_construccion: null, activo: true,
  granja: { id: 1, nombre: 'el jaller', propietario_id: 56 },
} satisfies Galpon

const lote = {
  id: 9, codigo: 'LOT-9', fecha_ingreso: '2026-10-16', cantidad_inicial: 500, raza: null, sexo: null,
  marca_alimento: null, linea_genetica: null, costo_pollito_unitario: null, presupuesto_total_cop: null,
  fecha_salida_estimada: null, fecha_salida_real: null, estado: 'activo',
  galpon: { id: 31, nombre: 'jallergalpon', granja: { id: 1, nombre: 'el jaller', propietario_id: 56 } },
  proveedor: null,
} as Lote

describe('qué le falta a cada nivel', () => {
  it('lista los datos vacíos en lenguaje natural', () => {
    expect(faltantesGranja(granja)).toEqual(['el municipio', 'la dirección'])
    expect(pendientesAdminGranja(granja)).toEqual(['las coordenadas', 'el área'])
    expect(faltantesGalpon(galpon)).toEqual(['las medidas', 'el techo', 'la orientación', 'la fecha de construcción'])
    expect(faltantesLote(lote)).toEqual(['la línea genética', 'el sexo', 'la marca de alimento', 'el proveedor'])
    expect(textoFaltantes(['el municipio', 'el área'])).toBe('Faltan el municipio y el área')
    expect(textoFaltantes(['el área'])).toBe('Falta el área')
    expect(textoFaltantes(['las medidas'])).toBe('Faltan las medidas')
    expect(unir(['a', 'b', 'c'])).toBe('a, b y c')
    expect(textoFaltantes([])).toBe('')
  })

  it('una granja completa no pide nada', () => {
    expect(faltantesGranja({
      ...granja, direccion: 'Vereda', municipio: 'Rionegro', departamento: 'Antioquia',
      latitud: 6.15, longitud: -75.37, area_total_m2: 5000,
    })).toEqual([])
  })
})

const granjaCompleta = { direccion: ' Vereda El Progreso ', municipio: 'Rionegro', departamento: 'Antioquia' }

describe('payloadDatosGranja', () => {
  it('limpia los textos y solo envía lo que el propietario puede escribir', () => {
    expect(payloadDatosGranja(granjaCompleta)).toEqual({
      error: null,
      payload: { direccion: 'Vereda El Progreso', municipio: 'Rionegro', departamento: 'Antioquia' },
    })
  })

  it('exige todos los campos', () => {
    expect(payloadDatosGranja(formDatosGranja(granja)).error).toMatch(/ninguno es opcional/)
    expect(payloadDatosGranja({ ...granjaCompleta, municipio: '  ' }).error).toMatch(/ninguno es opcional/)
  })
})

describe('payloadDatosLote', () => {
  it('exige línea, sexo, marca y proveedor', () => {
    const completo = { ...formDatosLote(lote), linea_genetica_id: '2', sexo: 'mixto', marca_alimento: 'italcol', proveedor_id: '3' }
    expect(payloadDatosLote(completo)).toEqual({
      error: null,
      payload: { linea_genetica_id: 2, sexo: 'mixto', marca_alimento: 'italcol', proveedor_id: 3 },
    })
    expect(payloadDatosLote({ ...completo, proveedor_id: '' }).error).toMatch(/ninguno es opcional/)
  })
})

describe('enlaceMapa', () => {
  it('abre Google Maps en las coordenadas de la granja', () => {
    expect(enlaceMapa(6.1553, -75.3739)).toBe('https://www.google.com/maps?q=6.1553,-75.3739')
  })
})
