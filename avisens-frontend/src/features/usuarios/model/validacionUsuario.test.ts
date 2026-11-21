import { describe, expect, it } from 'vitest'
import { erroresDeUsuario, limpiarTelefono } from './validacionUsuario'

const valido = { cedula: '1098765432', telefono: '3001234567', email: 'maria@granja.com' }

describe('erroresDeUsuario (QA 17-nov)', () => {
  it('acepta datos válidos y los opcionales vacíos', () => {
    expect(erroresDeUsuario(valido)).toEqual({})
    expect(erroresDeUsuario({ cedula: '987654', telefono: '', email: '' })).toEqual({})
    expect(erroresDeUsuario({ ...valido, telefono: '+57 300 123 4567' })).toEqual({})
  })

  it('rechaza una cédula con @, letras o puntos', () => {
    expect(erroresDeUsuario({ ...valido, cedula: '987654321@' }).cedula).toMatch(/solo lleva números/)
    expect(erroresDeUsuario({ ...valido, cedula: 'CC12345678' }).cedula).toMatch(/solo lleva números/)
    expect(erroresDeUsuario({ ...valido, cedula: '1.098.765' }).cedula).toMatch(/solo lleva números/)
    expect(erroresDeUsuario({ ...valido, cedula: '123' }).cedula).toMatch(/de 6 a 10/)
  })

  it('rechaza un teléfono de menos de 10 dígitos o con letras', () => {
    expect(erroresDeUsuario({ ...valido, telefono: '123' }).telefono).toMatch(/al menos 10/)
    expect(erroresDeUsuario({ ...valido, telefono: '300abc4567' }).telefono).toMatch(/solo lleva números/)
  })

  it('rechaza un correo sin dominio en español', () => {
    expect(erroresDeUsuario({ ...valido, email: 'a@aa' }).email).toMatch(/correo válido/)
    expect(erroresDeUsuario({ ...valido, email: 'sin-arroba.com' }).email).toMatch(/correo válido/)
  })

  it('quita el formato del teléfono', () => {
    expect(limpiarTelefono('(300) 123-4567')).toBe('3001234567')
  })
})
