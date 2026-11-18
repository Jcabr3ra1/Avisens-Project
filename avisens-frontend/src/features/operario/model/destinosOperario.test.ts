import { describe, expect, it } from 'vitest'
import { rutaDeAtencion, rutaDeOperario } from './destinosOperario'

describe('rutaDeOperario', () => {
  it('traduce las pestañas de /granjas a pantallas del operario', () => {
    expect(rutaDeOperario('/granjas?pestana=alertas')).toBe('/alertas')
    expect(rutaDeOperario('/granjas?pestana=ambiente')).toBe('/monitoreo/sensores')
    expect(rutaDeOperario('/granjas')).toBe('/bitacora')
  })

  it('deja igual las rutas que el operario ya puede abrir', () => {
    expect(rutaDeOperario('/guia-crecimiento?lote=2')).toBe('/guia-crecimiento?lote=2')
  })
})

describe('rutaDeAtencion', () => {
  it('lleva cada pendiente a su pantalla', () => {
    expect(rutaDeAtencion({ tipo: 'alerta' })).toBe('/alertas')
    expect(rutaDeAtencion({ tipo: 'sensor' })).toBe('/monitoreo/sensores')
    expect(rutaDeAtencion({ tipo: 'crecimiento', loteId: 7 })).toBe('/guia-crecimiento?lote=7')
    expect(rutaDeAtencion({ tipo: 'crecimiento' })).toBe('/guia-crecimiento')
  })
})
