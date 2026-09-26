import { describe, expect, it } from 'vitest'
import type { ProspectoDetalle } from '../api/prospectos'
import {
  campoSenalado,
  contrasenaSugerida,
  errorDeConversion,
  payloadDeConversion,
  prellenarDesde,
  primerCampoInvalido,
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
    granja_nombre: 'La Esperanza',
    granja_municipio: 'Montería',
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
    const form = prellenarDesde(prospecto({ nombre_granja: null }))
    expect(form.organizacion_nombre).toBe('Organización de Juan Alberto')
  })

  it('nunca mete una identidad de WhatsApp en el teléfono', () => {
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

  it('rechaza correos incompletos', () => {
    expect(errorDeConversion(formulario({ email: 'juan.ejemplo.com' }))).toMatch(/no parece válido/)
    expect(errorDeConversion(formulario({ email: 'juan@' }))).toMatch(/no parece válido/)
    expect(errorDeConversion(formulario({ email: 'juan@ejemplo' }))).toMatch(/no parece válido/)
  })
})

describe('primerCampoInvalido', () => {
  it('un formulario completo no señala ningún campo', () => {
    expect(primerCampoInvalido(formulario())).toBeNull()
  })

  it('señala el mismo campo que describe errorDeConversion', () => {
    expect(primerCampoInvalido(formulario({ cedula: '' }))).toBe('cedula')
    expect(primerCampoInvalido(formulario({ email: 'sin-arroba' }))).toBe('email')
    expect(primerCampoInvalido(formulario({ granja_nombre: '' }))).toBe('granja_nombre')
    expect(primerCampoInvalido(formulario({ password: 'abc' }))).toBe('password')
  })

  it('gana el primer campo en el orden visual del formulario', () => {
    expect(primerCampoInvalido(formulario({ nombre_completo: '', cedula: '', email: '' })))
      .toBe('nombre_completo')
    expect(primerCampoInvalido(formulario({ granja_nombre: '', email: '' })))
      .toBe('granja_nombre')
  })

  it('los opcionales vacíos no cuentan', () => {
    const soloObligatorios = formulario({
      telefono: '',
      organizacion_nombre: '',
      granja_municipio: '',
    })
    expect(primerCampoInvalido(soloObligatorios)).toBeNull()
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
    const payload = payloadDeConversion(formulario())
    expect('rol_id' in payload).toBe(false)
  })
})

describe('contrasenaSugerida', () => {
  it('no usa caracteres que se confunden al dictarla', () => {
    const clave = contrasenaSugerida(200)
    expect(clave).not.toMatch(/[lI1O0]/)
  })

  it('tiene el largo pedido', () => {
    expect(contrasenaSugerida(12)).toHaveLength(12)
  })
})

describe('campoDuplicado', () => {
  it('saca el campo del mensaje del backend', () => {
    expect(campoSenalado('Ya existe un registro con ese valor en: cedula')).toBe('cedula')
    expect(campoSenalado('Ya existe un registro con ese valor en: email')).toBe('email')
  })

  it('acepta que el backend lo llame correo', () => {
    expect(campoSenalado('Ya existe un registro con ese valor en: correo')).toBe('email')
  })

  it('no señala nada si el mensaje es otro', () => {
    expect(campoSenalado('Este prospecto ya esta cerrado')).toBeNull()
    expect(campoSenalado('')).toBeNull()
  })

  it('ignora un campo que el formulario no tiene', () => {
    expect(campoSenalado('Ya existe un registro con ese valor en: nit')).toBeNull()
  })
})

describe('la granja del cliente nuevo', () => {
  it('no se prellena del prospecto, porque el chatbot ya no la pregunta', () => {
    const form = prellenarDesde(prospecto({ nombre_granja: 'La Esperanza' }))
    expect(form.granja_nombre).toBe('')
    expect(form.granja_municipio).toBe('')
  })

  it('sin nombre de granja no se convierte', () => {
    expect(errorDeConversion(formulario({ granja_nombre: '' }))).toMatch(/granja/i)
    expect(errorDeConversion(formulario({ granja_nombre: '   ' }))).toMatch(/granja/i)
    expect(errorDeConversion(formulario({ granja_nombre: 'A' }))).toMatch(/corto/i)
  })

  it('el municipio es opcional y no viaja vacío', () => {
    const sin = payloadDeConversion(formulario({ granja_municipio: '  ' }))
    expect(sin).not.toHaveProperty('granja_municipio')
    const con = payloadDeConversion(formulario({ granja_municipio: ' Montería ' }))
    expect(con.granja_municipio).toBe('Montería')
  })

  it('el nombre de la granja viaja siempre y sin espacios', () => {
    expect(payloadDeConversion(formulario({ granja_nombre: '  La Esperanza  ' })).granja_nombre)
      .toBe('La Esperanza')
  })
})

describe('campoSenalado con el 400 de class-validator', () => {
  it('marca el campo que nombra el mensaje', () => {
    expect(campoSenalado('granja_nombre must be longer than or equal to 2 characters'))
      .toBe('granja_nombre')
  })

  it('con varios errores marca el primero', () => {
    expect(campoSenalado('cedula should not be empty, granja_nombre must be a string'))
      .toBe('cedula')
  })

  it('sigue reconociendo el 409 de duplicados', () => {
    expect(campoSenalado('Ya existe un registro con ese valor en: cedula')).toBe('cedula')
  })

  it('no inventa un campo cuando el mensaje no nombra ninguno', () => {
    expect(campoSenalado('Los datos enviados no son válidos.')).toBeNull()
    expect(campoSenalado('organizacion must be active')).toBeNull()
  })
})
