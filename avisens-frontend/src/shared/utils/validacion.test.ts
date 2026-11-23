import { describe, expect, it } from 'vitest'
import {
  esUrlHttpSegura,
  validarCodigo,
  validarNit,
  validarNombreEntidad,
  validarNombrePersona,
  validarTelefonoPublico,
  validarTextoSeguro,
  validarUrlHttp,
} from './validacion'

describe('validacion compartida de texto y URLs', () => {
  it('acepta nombres válidos con tildes y rechaza caracteres raros o solo números', () => {
    expect(validarNombrePersona('María José O\'Connor')).toBeNull()
    expect(validarNombrePersona('Juan <script>')).toMatch(/letras/)
    expect(validarNombrePersona('123456')).toMatch(/letras/)

    expect(validarNombreEntidad('Granja El Mirador #2')).toBeNull()
    expect(validarNombreEntidad('999999')).toMatch(/letras/)
    expect(validarNombreEntidad('Galpón 😀')).toMatch(/emojis/)
  })

  it('valida texto seguro, códigos, NIT y teléfonos sin dígitos', () => {
    expect(validarTextoSeguro('Temperatura 28°C, sin novedades.', 'Observaciones')).toBeNull()
    expect(validarTextoSeguro('<img src=x>', 'Observaciones')).toMatch(/no permitidos/)
    expect(validarTextoSeguro('12345', 'Causa', { exigirLetras: true })).toMatch(/palabras/)

    expect(validarCodigo('LOTE-2026/01')).toBeNull()
    expect(validarCodigo('M@L CODIGO')).toMatch(/solo admite/)

    expect(validarNit('900.123.456-7')).toBeNull()
    expect(validarNit('abc!@#')).toMatch(/6 y 10 dígitos/)

    expect(validarTelefonoPublico('+57 (300) 123-4567', true)).toBeNull()
    expect(validarTelefonoPublico('-------', true)).toMatch(/7 a 13 dígitos/)
  })

  it('bloquea protocolos inseguros en URLs', () => {
    expect(esUrlHttpSegura('https://avisens.co/img.png')).toBe(true)
    expect(esUrlHttpSegura('javascript:alert(1)')).toBe(false)
    expect(validarUrlHttp('data:text/html,<h1>x</h1>')).toMatch(/http:\/\//)
  })
})
