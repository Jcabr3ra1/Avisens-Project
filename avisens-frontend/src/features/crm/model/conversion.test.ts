import { describe, expect, it } from 'vitest'
import type { ProspectoDetalle } from '../api/prospectos'
import {
  contrasenaSugerida,
  errorDeConversion,
  payloadDeConversion,
  prellenarDesde,
  type FormularioConversion,
} from './conversion'

function prospecto(cambios: Partial<ProspectoDetalle> = {}): ProspectoDetalle {
  return {
    nombre: 'Juan Alberto',
    nombre_granja: 'La Esperanza',
    documento: null,
    email: 'juan@ejemplo.com',
    telefono: '3001234567',
    whatsapp_id: null,
    ...cambios,
  } as ProspectoDetalle
}

function formulario(cambios: Partial<FormularioConversion> = {}): FormularioConversion {
  return {
    nombre_completo: 'Juan Alberto',
    cedula: '1234567890',
    email: 'juan@ejemplo.com',
    telefono: '3001234567',
    organizacion_nombre: 'La Esperanza',
    password: 'Abcd2345efgh',
    ...cambios,
  }
}

describe('prellenarDesde', () => {
  it('trae lo que el prospecto ya dio', () => {
    const form = prellenarDesde(prospecto())
    expect(form.nombre_completo).toBe('Juan Alberto')
    expect(form.email).toBe('juan@ejemplo.com')
    expect(form.organizacion_nombre).toBe('La Esperanza')
  })

  it('sin granja propone el nombre que usaría el backend', () => {
    // Así el asesor ve de antemano cómo va a llamarse la organización y puede
    // cambiarlo, en vez de descubrirlo después en el listado.
    const form = prellenarDesde(prospecto({ nombre_granja: null }))
    expect(form.organizacion_nombre).toBe('Organización de Juan Alberto')
  })

  it('nunca mete una identidad de WhatsApp en el teléfono', () => {
    // `telefono` ya viene limpio del backend: si la persona no dio número, es
    // null y el campo se queda vacío para que el asesor lo pregunte.
    const form = prellenarDesde(prospecto({ telefono: null, whatsapp_id: 'CO.1639897497563370' }))
    expect(form.telefono).toBe('')
  })

  it('la cédula queda vacía porque el cuestionario no la pregunta', () => {
    expect(prellenarDesde(prospecto()).cedula).toBe('')
  })
})

describe('errorDeConversion', () => {
  it('un formulario completo pasa', () => {
    expect(errorDeConversion(formulario())).toBe('')
  })

  it('la cédula dice qué hacer, no solo que falta', () => {
    expect(errorDeConversion(formulario({ cedula: '' }))).toMatch(/pídesela al cliente/)
  })

  it('rechaza una contraseña corta', () => {
    expect(errorDeConversion(formulario({ password: 'abc' }))).toMatch(/8 caracteres/)
  })

  it('rechaza un correo sin arroba', () => {
    expect(errorDeConversion(formulario({ email: 'juan.ejemplo.com' }))).toMatch(/no parece válido/)
  })
})

describe('payloadDeConversion', () => {
  it('normaliza el correo y omite los opcionales vacíos', () => {
    const payload = payloadDeConversion(
      formulario({ email: '  Juan@Ejemplo.COM ', telefono: '  ' }),
    )
    expect(payload.email).toBe('juan@ejemplo.com')
    expect('telefono' in payload).toBe(false)
  })

  it('no manda el rol: un prospecto convertido es siempre Propietario', () => {
    // Dejar que la pantalla eligiera el rol sería abrir la puerta a crear un
    // administrador desde el CRM.
    const payload = payloadDeConversion(formulario())
    expect('rol_id' in payload).toBe(false)
  })
})

describe('contrasenaSugerida', () => {
  it('no usa caracteres que se confunden al dictarla', () => {
    // El asesor se la va a leer por teléfono: sin l/1, O/0 ni I mayúscula.
    const clave = contrasenaSugerida(200)
    expect(clave).not.toMatch(/[lI1O0]/)
  })

  it('tiene el largo pedido', () => {
    expect(contrasenaSugerida(12)).toHaveLength(12)
  })
})
