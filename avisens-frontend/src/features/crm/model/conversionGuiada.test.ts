import { describe, expect, it } from 'vitest'
import type { FormularioConversion } from './conversion'
import { errorDelPaso, usuarioSugerido } from './conversionGuiada'

const completo: FormularioConversion = {
  nombre_completo: 'Luisa Fernanda Rojas',
  cedula: '1067123456',
  username: 'luisa.rojas',
  email: '',
  telefono: '3001112233',
  organizacion_nombre: '',
  granja_nombre: 'Avícola San Rafael',
  granja_municipio: 'Cereté',
  password: 'ClaveSegura23',
}

describe('errorDelPaso', () => {
  it('un formulario completo no tiene errores en ningún paso', () => {
    for (const paso of ['propietario', 'granja', 'acceso', 'confirmar'] as const) {
      expect(errorDelPaso(completo, paso)).toBeNull()
    }
  })

  it('el paso del propietario solo se detiene por sus propios campos', () => {
    const sinCedula = { ...completo, cedula: '' }
    expect(errorDelPaso(sinCedula, 'propietario')?.campo).toBe('cedula')
    const sinGranja = { ...completo, granja_nombre: '' }
    expect(errorDelPaso(sinGranja, 'propietario')).toBeNull()
    expect(errorDelPaso(sinGranja, 'granja')?.campo).toBe('granja_nombre')
  })

  it('el paso de acceso valida usuario y contraseña con las reglas del backend', () => {
    expect(errorDelPaso({ ...completo, username: 'ab' }, 'acceso')?.campo).toBe('username')
    expect(errorDelPaso({ ...completo, password: 'corta' }, 'acceso')?.campo).toBe('password')
  })

  it('confirmar vuelve a revisar todo', () => {
    expect(errorDelPaso({ ...completo, nombre_completo: '' }, 'confirmar')?.campo).toBe('nombre_completo')
  })
})

describe('usuarioSugerido', () => {
  it('une primer nombre y último apellido, sin tildes ni símbolos', () => {
    expect(usuarioSugerido('Luisa Fernanda Rojas')).toBe('luisa.rojas')
    expect(usuarioSugerido('José Ñúñez de la Hoz')).toBe('jose.hoz')
  })

  it('con una sola palabra la usa entera y garantiza el mínimo de 3 caracteres', () => {
    expect(usuarioSugerido('Pedro')).toBe('pedro')
    expect(usuarioSugerido('Al')).toBe('ala')
    expect(usuarioSugerido('  ')).toBe('')
  })

  it('siempre cumple la regla del usuario de acceso', () => {
    for (const nombre of ['María José Ospina Gutiérrez', 'Ana', 'Juan Pablo Segundo de los Ríos Bermúdez Castañeda Arango']) {
      expect(usuarioSugerido(nombre)).toMatch(/^[a-z0-9][a-z0-9._-]{2,29}$/)
    }
  })
})
