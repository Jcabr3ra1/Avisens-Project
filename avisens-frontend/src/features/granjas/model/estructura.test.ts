import { describe, expect, it } from 'vitest'
import type { SensorVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import {
  avesActuales,
  contarSensores,
  densidad,
  diasDeVida,
  estadoOperativoDeGalpon,
  lecturaPorTipo,
  porcentajeOcupacion,
  puntosDeGrafica,
  resumirGranja,
  serieCronologica,
} from './estructura'

function sensor(parcial: Partial<SensorVista>): SensorVista {
  return {
    id: 1,
    codigo: 'S-1',
    tipo: 'temperatura',
    unidad: '°C',
    variableUmbral: 'temperatura',
    valor: 24,
    minUmbral: 20,
    maxUmbral: 28,
    estado: 'optimo',
    ultimaLecturaTs: Date.now(),
    x: null,
    y: null,
    ...parcial,
  }
}

describe('estadoOperativoDeGalpon', () => {
  it('un galpón desactivado está inactivo aunque sus sensores midan bien', () => {
    expect(estadoOperativoDeGalpon(false, [sensor({ estado: 'optimo' })])).toBe('inactivo')
  })

  it('sin sensores no hay datos que interpretar', () => {
    expect(estadoOperativoDeGalpon(true, [])).toBe('sin_datos')
  })

  it('un solo sensor crítico pone el galpón en alerta', () => {
    const sensores = [sensor({ estado: 'optimo' }), sensor({ id: 2, estado: 'critico' })]
    expect(estadoOperativoDeGalpon(true, sensores)).toBe('alerta')
  })

  it('la alerta pesa más que la advertencia', () => {
    const sensores = [sensor({ estado: 'advertencia' }), sensor({ id: 2, estado: 'critico' })]
    expect(estadoOperativoDeGalpon(true, sensores)).toBe('alerta')
  })

  it('con todos los sensores caídos no se afirma que esté normal', () => {
    const sensores = [sensor({ estado: 'offline' }), sensor({ id: 2, estado: 'offline' })]
    expect(estadoOperativoDeGalpon(true, sensores)).toBe('sin_datos')
  })

  it('sensores sin umbral configurado no bastan para declarar alerta', () => {
    expect(estadoOperativoDeGalpon(true, [sensor({ estado: 'sin_umbral' })])).toBe('normal')
  })
})

describe('contarSensores', () => {
  it('separa en línea, offline y con alerta', () => {
    const sensores = [
      sensor({ id: 1, estado: 'optimo' }),
      sensor({ id: 2, estado: 'advertencia' }),
      sensor({ id: 3, estado: 'critico' }),
      sensor({ id: 4, estado: 'offline' }),
    ]
    expect(contarSensores(sensores)).toEqual({
      total: 4,
      enLinea: 3,
      offline: 1,
      conAlerta: 2,
    })
  })
})

describe('lecturaPorTipo', () => {
  it('encuentra el sensor por fragmento del tipo', () => {
    const sensores = [
      sensor({ id: 1, tipo: 'humedad relativa', valor: 65 }),
      sensor({ id: 2, tipo: 'Temp. ambiente', valor: 24.5 }),
    ]
    expect(lecturaPorTipo(sensores, 'temp')?.valor).toBe(24.5)
  })

  it('ignora sensores sin lectura', () => {
    const sensores = [sensor({ tipo: 'temperatura', valor: null })]
    expect(lecturaPorTipo(sensores, 'temp')).toBeNull()
  })
})

describe('avesActuales', () => {
  it('descuenta la mortalidad acumulada', () => {
    expect(avesActuales(10_000, 3)).toBe(9700)
  })

  it('sin dato de mortalidad devuelve las que entraron', () => {
    expect(avesActuales(10_000, null)).toBe(10_000)
  })

  it('nunca devuelve un número negativo', () => {
    expect(avesActuales(100, 150)).toBe(0)
  })
})

describe('densidad y ocupación', () => {
  it('calcula aves por metro cuadrado', () => {
    expect(densidad(1200, 10, 12)).toBe(10)
  })

  it('sin medidas del galpón no inventa una densidad', () => {
    expect(densidad(1200, null, 12)).toBeNull()
    expect(densidad(1200, 10, null)).toBeNull()
  })

  it('un área de cero no produce una división infinita', () => {
    expect(densidad(1200, 0, 12)).toBeNull()
  })

  it('la ocupación es el porcentaje de la capacidad usada', () => {
    expect(porcentajeOcupacion(7500, 10_000)).toBe(75)
  })

  it('sin capacidad registrada no hay ocupación', () => {
    expect(porcentajeOcupacion(7500, null)).toBeNull()
    expect(porcentajeOcupacion(7500, 0)).toBeNull()
  })
})

describe('diasDeVida', () => {
  it('cuenta los días transcurridos desde el ingreso', () => {
    const ahora = new Date('2026-09-01T12:00:00Z').getTime()
    expect(diasDeVida('2026-08-12T12:00:00Z', ahora)).toBe(20)
  })

  it('una fecha futura no da días negativos', () => {
    const ahora = new Date('2026-09-01T00:00:00Z').getTime()
    expect(diasDeVida('2026-09-10T00:00:00Z', ahora)).toBe(0)
  })

  it('una fecha inválida no rompe la vista', () => {
    expect(diasDeVida('no-es-fecha')).toBe(0)
  })
})

describe('resumirGranja', () => {
  it('suma capacidad, aves alojadas y lotes activos', () => {
    const galpones = [
      { activo: true, capacidadAves: 8000, loteActivo: { cantidadInicial: 7500 } },
      { activo: true, capacidadAves: 10_000, loteActivo: { cantidadInicial: 9200 } },
      { activo: false, capacidadAves: 6000, loteActivo: null },
    ]
    expect(resumirGranja(galpones, 2)).toEqual({
      galpones: 3,
      galponesActivos: 2,
      capacidadInstalada: 24_000,
      avesAlojadas: 16_700,
      lotesActivos: 2,
      alertasAbiertas: 2,
    })
  })

  it('un galpón sin capacidad registrada no rompe la suma', () => {
    const galpones = [{ activo: true, capacidadAves: null, loteActivo: null }]
    expect(resumirGranja(galpones, 0).capacidadInstalada).toBe(0)
  })

  it('una granja sin galpones da un resumen en ceros', () => {
    expect(resumirGranja([], 0)).toEqual({
      galpones: 0,
      galponesActivos: 0,
      capacidadInstalada: 0,
      avesAlojadas: 0,
      lotesActivos: 0,
      alertasAbiertas: 0,
    })
  })
})

describe('serieCronologica', () => {
  it('ordena del más viejo al más reciente', () => {
    const indicadores = [
      { fecha: '2026-08-20' },
      { fecha: '2026-08-18' },
      { fecha: '2026-08-19' },
    ]
    expect(serieCronologica(indicadores).map((i) => i.fecha)).toEqual([
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
    ])
  })

  it('no muta el arreglo original', () => {
    const indicadores = [{ fecha: '2026-08-20' }, { fecha: '2026-08-18' }]
    serieCronologica(indicadores)
    expect(indicadores[0].fecha).toBe('2026-08-20')
  })
})

describe('puntosDeGrafica', () => {
  it('reparte los puntos a lo ancho y escala al alto', () => {
    const puntos = puntosDeGrafica([0, 10], 100, 40)
    expect(puntos).toEqual([
      { x: 0, y: 40 },
      { x: 100, y: 0 },
    ])
  })

  it('un solo valor no es una evolución', () => {
    expect(puntosDeGrafica([5], 100, 40)).toEqual([])
  })

  it('ignora los huecos de la serie', () => {
    expect(puntosDeGrafica([1, null, 3], 100, 40)).toHaveLength(2)
  })

  it('una serie plana no divide por cero', () => {
    const puntos = puntosDeGrafica([7, 7, 7], 100, 40)
    expect(puntos.every((punto) => Number.isFinite(punto.y))).toBe(true)
  })
})
