import { describe, expect, it } from 'vitest'
import type { HistoricoMedicionesResponse } from '@features/sensores/api/mediciones'
import { generarPdfHistorico } from './generarPdfHistorico'

function crearRespuesta(cantidadPuntos: number): HistoricoMedicionesResponse {
  const serie = Array.from({ length: cantidadPuntos }, (_, idx) => ({
    fecha: new Date(Date.UTC(2026, 9, 1 + idx, 12, 0, 0)).toISOString(),
    promedio: 29 + (idx % 4) * 0.5,
    minimo: 28,
    maximo: 31.5,
    lecturas: 24,
    objetivo_min: 28,
    objetivo_max: 30.5,
  }))

  return {
    galpon: { id: 1, nombre: 'Galpón Norte', codigo: 'G-01', granja: 'Granja Sol' },
    variable: 'temperatura',
    unidad_medida: '°C',
    zona_id: null,
    zonas: [{ id: 10, nombre: 'Zona A', codigo: 'ZA' }],
    granularidad: 'dia',
    desde: '2026-10-01T00:00:00.000Z',
    hasta: '2026-11-27T23:59:59.000Z',
    sin_datos: false,
    mensaje: null,
    rango_sugerido: null,
    resumen: {
      promedio_general: 29.8,
      minimo_general: 28,
      maximo_general: 31.5,
      total_lecturas: cantidadPuntos * 24,
      puntos_fuera_de_rango: 2,
    },
    serie,
  }
}

describe('generarPdfHistorico', () => {
  it('genera un binario PDF 1.4 válido con cabecera, tabla de referencias y cierre EOF', () => {
    const bytes = generarPdfHistorico(crearRespuesta(5))
    const texto = new TextDecoder().decode(bytes)

    expect(texto.startsWith('%PDF-1.4\n')).toBe(true)
    expect(texto.endsWith('%%EOF')).toBe(true)
    expect(texto).toContain('AVISENS')
    expect(texto).toContain('Galpon Norte')
    expect(texto).toContain('/Type /Page')
  })

  it('pagina correctamente cuando hay muchos registros históricos', () => {
    const bytes = generarPdfHistorico(crearRespuesta(60))
    const texto = new TextDecoder().decode(bytes)
    const paginas = texto.match(/\/Type \/Page\b/g) ?? []

    expect(paginas.length).toBeGreaterThan(1)
  })
})
