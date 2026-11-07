import { describe, expect, it } from 'vitest'
import {
  construirCalculadorAvesVivas,
  construirGradienteEtapas,
  obtenerEtapaDelDia,
  obtenerFasesCiclo,
} from './etapasAlimentacion'
import type { PlanAlimentoGuia } from '../api/guiaCrecimiento'

describe('etapasAlimentacion', () => {
  describe('obtenerFasesCiclo (fallback estándar)', () => {
    it('genera 3 etapas para un ciclo corto (4 lb ~ día 31 <= 34)', () => {
      const fases = obtenerFasesCiclo(31)

      expect(fases).toHaveLength(3)
      expect(fases[0]).toMatchObject({
        orden: 1,
        etapa: 'preinicio',
        nombreEtapa: 'Preinicio',
        alimento: 'Alimento Preinicio',
        diaInicio: 1,
        diaFin: 8,
      })
      expect(fases[1]).toMatchObject({
        orden: 2,
        etapa: 'inicio',
        nombreEtapa: 'Inicio',
        alimento: 'Alimento Inicio',
        diaInicio: 9,
        diaFin: 21,
      })
      expect(fases[2]).toMatchObject({
        orden: 3,
        etapa: 'engorde',
        nombreEtapa: 'Engorde',
        alimento: 'Alimento Engorde',
        diaInicio: 22,
        diaFin: 31,
      })
    })

    it('genera 4 etapas para un ciclo pesado (5.5 lb ~ día 38 >= 35)', () => {
      const fases = obtenerFasesCiclo(38)

      expect(fases).toHaveLength(4)
      expect(fases[0].etapa).toBe('preinicio')
      expect(fases[1].etapa).toBe('inicio')
      expect(fases[2]).toMatchObject({
        etapa: 'engorde',
        diaInicio: 22,
        diaFin: 34,
      })
      expect(fases[3]).toMatchObject({
        etapa: 'finalizacion',
        nombreEtapa: 'Finalización',
        alimento: 'Alimento Finalizador',
        diaInicio: 35,
        diaFin: 38,
      })
    })

    it('genera 4 etapas para un ciclo de 7 lb (~ día 47)', () => {
      const fases = obtenerFasesCiclo(47)

      expect(fases).toHaveLength(4)
      expect(fases[3]).toMatchObject({
        etapa: 'finalizacion',
        diaInicio: 35,
        diaFin: 47,
      })
    })
  })

  describe('obtenerFasesCiclo (con datos del backend)', () => {
    it('mapea correctamente las fases enviadas por la API', () => {
      const mockAlimento: PlanAlimentoGuia = {
        id: 1,
        version: 1,
        vigente: true,
        estado_alimento: 'calculado',
        version_algoritmo: '1.0.0',
        motivo: null,
        fecha_creacion: '2026-03-01',
        creado_por: { id: 1, nombre_completo: 'Admin' },
        plan: { id: 1, version: 1, dia_objetivo: 42, fecha_salida_calculada: null, curva: null },
        corte: { dia: 1, cantidad_inicial: 1000, muertes: 0, aves_vivas: 1000, mortalidad_por_dia: [] },
        resultado: { consumo_por_ave_g: 4500, consumo_total_kg: 4500 },
        desglose: {
          no_disponible: false,
          estado: 'calculado',
          version: '1.0.0',
          marca_alimento_snapshot: 'Italcol',
          renglones: [],
          fases: [
            {
              orden: 1,
              etapa: 'preinicio',
              nombre_etapa: 'Preiniciador',
              alimento: 'Pollito Preiniciador Italcol',
              dia_inicio: 1,
              dia_fin: 8,
              consumo_por_ave_g: 220,
              consumo_total_kg: 220,
              bultos_40kg: 6,
            },
            {
              orden: 2,
              etapa: 'inicio',
              nombre_etapa: 'Iniciación',
              alimento: 'Pollito Iniciación Italcol',
              dia_inicio: 9,
              dia_fin: 21,
              consumo_por_ave_g: 980,
              consumo_total_kg: 980,
              bultos_40kg: 25,
            },
          ],
        },
        efectiva: true,
        plan_vigente: null,
        desactualizado: false,
        motivos_desactualizacion: [],
        antiguedad_dias: 0,
        alimento_estimado: {
          disponible: true,
          motivo_no_disponible: null,
          base: {
            estimacion_version: 1,
            plan_version: 1,
            dia_corte: 1,
            calculada_el: '2026-03-01',
            antiguedad_dias: 0,
            corte_es_hoy: true,
            corresponde_al_plan_vigente: true,
          },
          total_kg: '4500',
          hasta_corte_kg: '0',
          pendiente_tras_corte_kg: '4500',
          pendiente_desde_hoy_kg: '4500',
          requiere_recalculo: false,
          motivos_recalculo: [],
        },
      }

      const fases = obtenerFasesCiclo(42, mockAlimento)

      expect(fases).toHaveLength(2)
      expect(fases[0].alimento).toBe('Pollito Preiniciador Italcol')
      expect(fases[0].bultos40kg).toBe(6)
      expect(fases[1].alimento).toBe('Pollito Iniciación Italcol')
    })

    it('normaliza las etapas del backend (preiniciacion -> preinicio, iniciacion -> inicio)', () => {
      const mockAlimento = {
        desglose: {
          fases: [
            {
              orden: 1,
              etapa: 'preiniciacion',
              nombre_etapa: 'Preiniciación',
              alimento: 'Alimento Preinicio',
              dia_inicio: 1,
              dia_fin: 8,
              consumo_por_ave_g: 210,
              consumo_total_kg: 420,
              bultos_40kg: 11,
            },
            {
              orden: 2,
              etapa: 'iniciacion',
              nombre_etapa: 'Iniciación',
              alimento: 'Alimento Inicio',
              dia_inicio: 9,
              dia_fin: 21,
              consumo_por_ave_g: 980,
              consumo_total_kg: 1960,
              bultos_40kg: 49,
            },
            {
              orden: 3,
              etapa: 'engorde',
              nombre_etapa: 'Engorde',
              alimento: 'Alimento Engorde',
              dia_inicio: 22,
              dia_fin: 23,
              consumo_por_ave_g: 260,
              consumo_total_kg: 520,
              bultos_40kg: 13,
            },
          ],
        },
      } as unknown as PlanAlimentoGuia

      const fases = obtenerFasesCiclo(23, mockAlimento)
      expect(fases).toHaveLength(3)
      expect(fases[0].etapa).toBe('preinicio')
      expect(fases[0].nombreEtapa).toBe('Preinicio')
      expect(fases[1].etapa).toBe('inicio')
      expect(fases[1].nombreEtapa).toBe('Inicio')
      expect(fases[2].etapa).toBe('engorde')
      expect(fases[2].nombreEtapa).toBe('Engorde')
    })
  })

  describe('obtenerEtapaDelDia', () => {
    const fases = obtenerFasesCiclo(42) // 4 etapas: 1-8, 9-21, 22-34, 35-42

    it('identifica la etapa de preinicio en el día 5', () => {
      const etapa = obtenerEtapaDelDia(5, fases)

      expect(etapa).not.toBeNull()
      expect(etapa?.etapa).toBe('preinicio')
      expect(etapa?.nombreEtapa).toBe('Preinicio')
      expect(etapa?.alimento).toBe('Alimento Preinicio')
      expect(etapa?.diaInicio).toBe(1)
      expect(etapa?.diaFin).toBe(8)
      expect(etapa?.diasParaCambio).toBe(4) // 8 - 5 + 1
      expect(etapa?.proximaEtapa).toBe('Inicio')
      expect(etapa?.proximoAlimento).toBe('Alimento Inicio')
    })

    it('identifica la etapa de inicio en el día 15', () => {
      const etapa = obtenerEtapaDelDia(15, fases)

      expect(etapa?.etapa).toBe('inicio')
      expect(etapa?.diasParaCambio).toBe(7) // 21 - 15 + 1
      expect(etapa?.proximaEtapa).toBe('Engorde')
    })

    it('identifica la etapa de finalización en el día 36', () => {
      const etapa = obtenerEtapaDelDia(36, fases)

      expect(etapa?.etapa).toBe('finalizacion')
      expect(etapa?.nombreEtapa).toBe('Finalización')
      expect(etapa?.proximaEtapa).toBeNull()
      expect(etapa?.diasParaCambio).toBe(0)
    })
  })

  describe('construirGradienteEtapas', () => {
    it('genera un linear-gradient difuso con las 4 etapas para 42 días', () => {
      const fases = obtenerFasesCiclo(42)
      const gradiente = construirGradienteEtapas(fases, 1, 42)

      expect(gradiente).toContain('linear-gradient(90deg,')
      // Debe contener los 4 colores de las etapas
      expect(gradiente).toContain('#10b981') // preinicio
      expect(gradiente).toContain('#3b82f6') // inicio
      expect(gradiente).toContain('#f59e0b') // engorde
      expect(gradiente).toContain('#8b5cf6') // finalizacion
      // Inicia en 0% y termina en 100%
      expect(gradiente).toContain('#10b981 0%')
      expect(gradiente).toContain('#8b5cf6 100%')
    })

    it('genera un linear-gradient difuso con 3 etapas para ciclos cortos (31 días)', () => {
      const fases = obtenerFasesCiclo(31)
      const gradiente = construirGradienteEtapas(fases, 1, 31)

      expect(gradiente).toContain('linear-gradient(90deg,')
      expect(gradiente).toContain('#10b981')
      expect(gradiente).toContain('#3b82f6')
      expect(gradiente).toContain('#f59e0b')
      expect(gradiente).not.toContain('#8b5cf6') // No debe tener finalizador
    })

    it('devuelve fallback seguro para lista vacía', () => {
      const gradiente = construirGradienteEtapas([], 1, 42)
      expect(gradiente).toBe('var(--primary)')
    })
  })

  describe('mortalidad de la bitácora y cálculo a nivel de lote', () => {
    it('construirCalculadorAvesVivas descuenta bajas progresivamente según el día', () => {
      const calc = construirCalculadorAvesVivas(
        600,
        [
          { dia: 5, cantidad_aves: 10 },
          { dia: 12, cantidad_aves: 10 },
        ],
      )

      expect(calc.totalBajas).toBe(20)
      expect(calc.avesVivasActual).toBe(580)
      // Antes de la primera baja
      expect(calc.avesVivasEnDia(1)).toBe(600)
      expect(calc.avesVivasEnDia(4)).toBe(600)
      // Tras la baja del día 5
      expect(calc.avesVivasEnDia(5)).toBe(590)
      expect(calc.avesVivasEnDia(11)).toBe(590)
      // Tras la baja del día 12
      expect(calc.avesVivasEnDia(12)).toBe(580)
      expect(calc.avesVivasEnDia(23)).toBe(580)
    })

    it('topa las fases al día final de faena si el backend guardó un horizonte de 40 días', () => {
      const mockAlimentoConHorizonte40 = {
        desglose: {
          fases: [
            {
              orden: 1,
              etapa: 'preinicio',
              nombre_etapa: 'Preinicio',
              alimento: 'Pollito Preiniciador',
              dia_inicio: 1,
              dia_fin: 8,
              consumo_por_ave_g: 222,
              consumo_total_kg: 133,
              bultos_40kg: 4,
            },
            {
              orden: 2,
              etapa: 'inicio',
              nombre_etapa: 'Inicio',
              alimento: 'Súper Pollito Iniciación',
              dia_inicio: 9,
              dia_fin: 21,
              consumo_por_ave_g: 1163,
              consumo_total_kg: 698,
              bultos_40kg: 18,
            },
            {
              orden: 3,
              etapa: 'engorde',
              nombre_etapa: 'Engorde',
              alimento: 'Súper Pollo Engorde Granja',
              dia_inicio: 22,
              dia_fin: 40, // guardado anteriormente a 40 días
              consumo_por_ave_g: 3511,
              consumo_total_kg: 2107,
              bultos_40kg: 53,
            },
          ],
        },
      } as unknown as PlanAlimentoGuia

      // Si el día de faena calculado es 23
      const fases = obtenerFasesCiclo(23, mockAlimentoConHorizonte40, undefined, 600)

      expect(fases).toHaveLength(3)
      // Engorde debe terminar en el día 23, no en el 40
      expect(fases[2].diaInicio).toBe(22)
      expect(fases[2].diaFin).toBe(23)
      // El consumo debe recalcularse para 2 días (días 22 y 23), NO 2.107 kg ni 53 bultos
      expect(fases[2].consumoTotalKg).toBeLessThan(300)
      expect(fases[2].bultos40kg).toBeLessThan(10)
      expect(fases[2].avesVivas).toBe(600)
    })

    it('ajusta el consumo y las aves vivas por etapa según la bitácora', () => {
      const mortalidad = [
        { dia: 5, cantidad_aves: 20 },
      ]
      const fases = obtenerFasesCiclo(23, null, undefined, 600, mortalidad)

      expect(fases[0].avesVivas).toBe(580)
      expect(fases[1].avesVivas).toBe(580)
      expect(fases[2].avesVivas).toBe(580)
      // El total de kg para 580 vivas debe ser menor que para 600
      const fasesSinMortalidad = obtenerFasesCiclo(23, null, undefined, 600, [])
      expect(fases[0].consumoTotalKg).toBeLessThan(fasesSinMortalidad[0].consumoTotalKg!)
    })
  })
})

