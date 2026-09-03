import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { mensajeDeError } from './errores'

function errorConRespuesta(status: number, data: unknown): AxiosError {
  const error = new AxiosError('fallo')
  error.response = {
    status, data, statusText: '', headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  }
  return error
}

describe('mensajeDeError', () => {
  it('usa el respaldo cuando el error no viene de axios', () => {
    expect(mensajeDeError(new Error('roto'), 'respaldo')).toBe('respaldo')
  })

  it('distingue el fallo de red de una respuesta del servidor', () => {
    // Sin `response` la petición nunca llegó: decir "revisa tu conexión"
    // orienta mejor que repetir el mensaje genérico de la pantalla.
    const sinRespuesta = new AxiosError('Network Error')
    expect(mensajeDeError(sinRespuesta, 'respaldo')).toContain('conexión')
  })

  it('prefiere el mensaje que manda el backend', () => {
    const error = errorConRespuesta(400, { message: 'El código ya existe' })
    expect(mensajeDeError(error, 'respaldo')).toBe('El código ya existe')
  })

  it('traduce el estado cuando el cuerpo no explica nada', () => {
    expect(mensajeDeError(errorConRespuesta(403, {}), 'respaldo')).not.toBe('respaldo')
  })
})
