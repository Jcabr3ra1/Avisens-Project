import { describe, expect, it } from 'vitest'
import type { Sensor } from '../api/sensores'
import { datosFicha, payloadFicha, validarFicha } from './fichaActuador'

const rele: Sensor = {
  id: 30,
  codigo: 'REL-K2-G1-D10',
  tipo: 'Ventiladores',
  canal: 'rele:k2',
  unidad_medida: 'estado',
  modelo: 'Relé K2',
  fabricante: null,
  coordenada_x: null,
  coordenada_y: null,
  altura_metros: null,
  fecha_instalacion: '2026-10-01T00:00:00.000Z',
  ultima_calibracion: null,
  proxima_calibracion: null,
  estado: 'activo',
  galpon: { id: 1, nombre: 'Galpón 1', granja: { id: 1, propietario_id: 5 } },
  dispositivo: { id: 10, nombre: 'ESP32', codigo_topic: 'G1-ESP32-01' },
}

describe('ficha del actuador', () => {
  it('carga los datos guardados; la fecha DATE no se corre por la zona horaria', () => {
    expect(datosFicha(rele)).toEqual({
      nombre: 'Ventiladores',
      modelo: 'Relé K2',
      fabricante: '',
      fecha_instalacion: '2026-10-01',
      estado: 'activo',
    })
  })

  it('sin cambios no envía nada', () => {
    expect(payloadFicha(rele, datosFicha(rele))).toEqual({})
  })

  it('envía solo lo administrativo que cambió, nunca la identidad física', () => {
    const payload = payloadFicha(rele, {
      ...datosFicha(rele),
      nombre: '  Ventiladores túnel ',
      fabricante: 'Songle',
      estado: 'mantenimiento',
    })
    expect(payload).toEqual({ tipo: 'Ventiladores túnel', fabricante: 'Songle', estado: 'mantenimiento' })
    for (const campo of ['canal', 'dispositivo_id', 'galpon_id', 'codigo', 'unidad_medida']) {
      expect(payload).not.toHaveProperty(campo)
    }
  })

  it('los opcionales pueden quedar vacíos: vaciar la fecha la borra', () => {
    expect(payloadFicha(rele, { ...datosFicha(rele), fecha_instalacion: '', modelo: '' })).toEqual({
      fecha_instalacion: null,
      modelo: '',
    })
  })

  it('valida nombre obligatorio, fecha y estado', () => {
    expect(validarFicha({ ...datosFicha(rele), nombre: '  ' })).toMatch(/obligatorio/)
    expect(validarFicha({ ...datosFicha(rele), nombre: 'x'.repeat(81) })).toMatch(/80/)
    expect(validarFicha({ ...datosFicha(rele), fecha_instalacion: '01/10/2026' })).toMatch(/fecha/)
    expect(validarFicha({ ...datosFicha(rele), estado: 'retirado' })).toMatch(/estado/)
    expect(validarFicha(datosFicha(rele))).toBeNull()
  })
})
