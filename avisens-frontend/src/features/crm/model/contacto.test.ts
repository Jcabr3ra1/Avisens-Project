import { describe, expect, it } from 'vitest'
import { esIdentidadWhatsapp, etiquetaContacto, sePuedeLlamar } from './contacto'

describe('esIdentidadWhatsapp', () => {
  it('reconoce la identidad que manda Meta cuando se oculta el número', () => {
    // Forma real vista en producción: dos letras, punto y dígitos.
    expect(esIdentidadWhatsapp('CO.1639897497563370')).toBe(true)
  })

  it('un teléfono normal no es una identidad', () => {
    expect(esIdentidadWhatsapp('573001234567')).toBe(false)
    expect(esIdentidadWhatsapp('+57 300 123 4567')).toBe(false)
  })

  it('aguanta el nulo y los espacios de sobra', () => {
    expect(esIdentidadWhatsapp(null)).toBe(false)
    expect(esIdentidadWhatsapp(' CO.123 ')).toBe(true)
  })
})

describe('sePuedeLlamar', () => {
  it('a una identidad de WhatsApp no se la puede llamar', () => {
    // Este es el bug que arregla: `tel:CO.1639…` abre el marcador con basura
    // y el asesor cree que el sistema perdió el número.
    expect(sePuedeLlamar('CO.1639897497563370')).toBe(false)
  })

  it('a un teléfono sí', () => {
    expect(sePuedeLlamar('573001234567')).toBe(true)
  })

  it('sin contacto no hay a quién llamar', () => {
    expect(sePuedeLlamar(null)).toBe(false)
    expect(sePuedeLlamar('   ')).toBe(false)
  })
})

describe('etiquetaContacto', () => {
  it('no llama teléfono a lo que no lo es', () => {
    expect(etiquetaContacto('CO.1639897497563370')).toBe('Usuario de WhatsApp')
    expect(etiquetaContacto('573001234567')).toBe('Teléfono')
    expect(etiquetaContacto(null)).toBe('Teléfono')
  })
})
