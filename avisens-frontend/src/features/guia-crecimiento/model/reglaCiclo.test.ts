import { describe, expect, it } from 'vitest'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import {
  diaDeFraccion, diaTrasTecla, fraseDeCrecimiento, lecturaDelDia, marcasDeRegla,
  posicionDeDia, severidadPorDia, textoDeLlegada,
} from './reglaCiclo'

const curva = (cambios: Partial<CurvaCrecimiento> = {}): CurvaCrecimiento => ({
  lote_id: 1,
  codigo: 'LOT-1',
  dia_actual: 9,
  dia_final: 32,
  peso_objetivo_g: 2270,
  referencias: { genetica: { linea: 'Cobb 500', sexo: 'mixto', version: 1, fuente: 'x' }, marca: null },
  serie: [
    { dia: 8, real_g: null, proyectado_g: 250, min_g: 220, max_g: 280, estandar_g: 260, marca_g: null },
    { dia: 9, real_g: 280, proyectado_g: 290, min_g: 250, max_g: 330, estandar_g: 289, marca_g: null },
    { dia: 10, real_g: null, proyectado_g: 330, min_g: 290, max_g: 370, estandar_g: 340, marca_g: null },
  ],
  resumen: {
    ultimo_pesaje: { dia: 9, peso_g: 280 },
    desvio_vs_estandar_pct: -3.1,
    peso_final_g: 2300,
    dia_al_objetivo: 31.2,
    fecha_al_objetivo: '2026-11-15',
    punto_inflexion: { dia: 20, peso_g: 900, ganancia_max_g_dia: 80 },
  },
  modelo: { nombre: 'g', version: '2', confianza: 0.8, puntos_usados: 4 },
  ...cambios,
})

describe('regla del ciclo', () => {
  it('marca el primer día y cada semana sin repetir el día de salida', () => {
    expect(marcasDeRegla(1, 32)).toEqual([1, 7, 14, 21, 28])
    expect(marcasDeRegla(1, 42)).toEqual([1, 7, 14, 21, 28, 35])
    expect(marcasDeRegla(1, 7)).toEqual([1])
    expect(marcasDeRegla(1, 3)).toEqual([1])
  })

  it('ubica un día entre 0 y 1 aunque llegue fuera de rango', () => {
    expect(posicionDeDia(1, 1, 32)).toBe(0)
    expect(posicionDeDia(32, 1, 32)).toBe(1)
    expect(posicionDeDia(16.5, 1, 32)).toBeCloseTo(0.5, 5)
    expect(posicionDeDia(-4, 1, 32)).toBe(0)
    expect(posicionDeDia(90, 1, 32)).toBe(1)
    expect(posicionDeDia(5, 5, 5)).toBe(0)
  })

  it('convierte la posición del puntero en un día entero válido', () => {
    expect(diaDeFraccion(0, 1, 32)).toBe(1)
    expect(diaDeFraccion(1, 1, 32)).toBe(32)
    expect(diaDeFraccion(0.5, 1, 32)).toBe(17)
    expect(diaDeFraccion(-1, 1, 32)).toBe(1)
    expect(diaDeFraccion(3, 1, 32)).toBe(32)
  })

  it('mueve el día con el teclado sin salirse de la regla', () => {
    expect(diaTrasTecla('ArrowRight', 9, 1, 32)).toBe(10)
    expect(diaTrasTecla('ArrowUp', 9, 1, 32)).toBe(10)
    expect(diaTrasTecla('ArrowLeft', 9, 1, 32)).toBe(8)
    expect(diaTrasTecla('ArrowDown', 1, 1, 32)).toBe(1)
    expect(diaTrasTecla('PageUp', 9, 1, 32)).toBe(16)
    expect(diaTrasTecla('PageDown', 3, 1, 32)).toBe(1)
    expect(diaTrasTecla('Home', 9, 1, 32)).toBe(1)
    expect(diaTrasTecla('End', 9, 1, 32)).toBe(32)
    expect(diaTrasTecla('End', 32, 1, 32)).toBe(32)
    expect(diaTrasTecla('a', 9, 1, 32)).toBeNull()
  })

  it('deja la alerta más grave de cada día', () => {
    const mapa = severidadPorDia([
      { dia: 2, severidad: 'baja' }, { dia: 2, severidad: 'alta' }, { dia: 5, severidad: 'media' },
      { dia: 5, severidad: 'baja' },
    ])
    expect(mapa.get(2)).toBe('alta')
    expect(mapa.get(5)).toBe('media')
    expect(mapa.get(7)).toBeUndefined()
  })
})

describe('lectura del día', () => {
  it('reúne lo real, lo proyectado y el estándar del día elegido', () => {
    const lectura = lecturaDelDia(curva(), 9)
    expect(lectura).toMatchObject({ dia: 9, esHoy: true, real: 280, proyectado: 290, estandar: 289, minimo: 250, maximo: 330 })
    expect(lectura?.desvioPct).toBeCloseTo(-3.1, 1)
  })

  it('no inventa un pesaje ni una desviación donde no hubo pesaje', () => {
    const lectura = lecturaDelDia(curva(), 10)
    expect(lectura).toMatchObject({ dia: 10, esHoy: false, real: null, proyectado: 330, estandar: 340, desvioPct: null })
  })

  it('devuelve null para un día fuera de la serie', () => {
    expect(lecturaDelDia(curva(), 99)).toBeNull()
    expect(lecturaDelDia(null, 9)).toBeNull()
  })
})

describe('frase de crecimiento', () => {
  it('pide pesajes cuando no hay curva ni datos suficientes', () => {
    expect(fraseDeCrecimiento(null)).toMatch(/al menos tres pesajes/)
    const poca = curva({ modelo: { nombre: 'g', version: '2', confianza: 0.2, puntos_usados: 1 } })
    expect(fraseDeCrecimiento(poca)).toBe('Hay 1 pesaje; registra 2 más para mostrar la tendencia.')
  })

  it('compara con la curva y dice cuándo llega a la meta', () => {
    expect(fraseDeCrecimiento(curva())).toBe(
      'Tu lote va 3,1 % por debajo de la curva; llegaría a 2,27 kg el día 32.',
    )
  })
})

describe('llegada a la meta', () => {
  it('dice el día y la fecha en que llega al peso objetivo', () => {
    expect(textoDeLlegada(curva())).toMatchObject({ etiqueta: 'Llega a 2,27 kg', valor: 'Día 32', tenue: false })
  })

  it('avisa cuando el lote no alcanza la meta o no tiene una', () => {
    const sinLlegada = curva({ resumen: { ...curva().resumen, dia_al_objetivo: null } })
    expect(textoDeLlegada(sinLlegada)).toMatchObject({ valor: 'No lo alcanza', tenue: true })
    expect(textoDeLlegada(curva({ peso_objetivo_g: null }))).toMatchObject({ valor: 'Sin definir', tenue: true })
  })

  it('marca cuando llega después del día de salida', () => {
    const tarde = curva({ resumen: { ...curva().resumen, dia_al_objetivo: 35.4 } })
    expect(textoDeLlegada(tarde).detalle).toContain('después del día de salida (32)')
  })
})
