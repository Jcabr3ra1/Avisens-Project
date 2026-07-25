// data.ts — Tipos y datos mock del módulo de Bitácora Productiva (EP-06).
// Registra peso, mortalidad y consumo del lote activo por galpón.
// Los pesos objetivo siguen la tabla de rendimiento del Manual Italcol.

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Categoría del registro en la bitácora
export type TipoRegistro = 'peso' | 'mortalidad' | 'consumo' | 'sanitario'

// Un registro individual en la bitácora del lote
export type RegistroBitacora = {
  id: number
  tipo: TipoRegistro
  fecha: string          // Formato DD/MM/YYYY
  galpon: string
  valor: number          // Peso en g, cantidad de aves, kg de alimento…
  unidad: string
  observacion?: string
  operario: string
}

// Punto de la curva de crecimiento del lote (peso real vs objetivo)
export type PuntoCurva = {
  semana: number
  pesoReal: number       // Gramos — promedio de la muestra del lote
  pesoObjetivo: number   // Gramos — según Manual Italcol para la semana
  muestraAves: number    // Número de aves en la muestra de pesaje
}

// Resumen de mortalidad diaria del lote
export type RegistroMortalidad = {
  id: number
  fecha: string
  galpon: string
  cantidadAves: number
  causaProbable: string  // 'calor' | 'aplastamiento' | 'enfermedad' | 'otra'
  operario: string
}

// Registro de consumo diario de alimento y agua
export type RegistroConsumo = {
  id: number
  fecha: string
  galpon: string
  alimentoKg: number    // Kilogramos de alimento consumidos en el día
  aguaLitros: number    // Litros de agua consumidos en el día
  consumoPorAve: number // Gramos de alimento por ave (calculado)
  relacionAguaAlimento: number // Litros de agua por kg de alimento
}

// ─── Datos mock ───────────────────────────────────────────────────────────────

// Curvas de crecimiento por galpón — semanas completas según el día de vida
// (semana completa = floor(diaVida / 7), mismo criterio en los 3 galpones).
// Pesos objetivo según el estándar Ross 308 para pollos de engorde.
export const CURVAS_PESO: Record<string, PuntoCurva[]> = {
  // GP-01 (día 32 → 4 semanas). Corre caliente para su edad (ver Monitoreo) →
  // desviación leve, dentro de la zona óptima ±7%.
  'GP-01': [
    { semana: 1, pesoReal: 178,  pesoObjetivo: 185,  muestraAves: 30 },
    { semana: 2, pesoReal: 462,  pesoObjetivo: 468,  muestraAves: 30 },
    { semana: 3, pesoReal: 878,  pesoObjetivo: 890,  muestraAves: 25 },
    { semana: 4, pesoReal: 1430, pesoObjetivo: 1480, muestraAves: 25 }, // -3.4%
  ],
  // GP-02 (día 18 → 2 semanas). Humedad y temperatura en advertencia →
  // desviación leve, todavía dentro de la zona óptima.
  'GP-02': [
    { semana: 1, pesoReal: 180, pesoObjetivo: 185, muestraAves: 28 },
    { semana: 2, pesoReal: 445, pesoObjetivo: 468, muestraAves: 28 }, // -4.9%
  ],
  // GP-03 (día 41 → 5 semanas). Temperatura crítica sostenida — la desviación
  // se sale de la zona óptima desde la semana 3, coherente con el estrés
  // calórico que ya reporta Monitoreo/Alertas para este galpón.
  'GP-03': [
    { semana: 1, pesoReal: 182,  pesoObjetivo: 185,  muestraAves: 28 },
    { semana: 2, pesoReal: 455,  pesoObjetivo: 468,  muestraAves: 27 },
    { semana: 3, pesoReal: 820,  pesoObjetivo: 890,  muestraAves: 25 }, // -7.9%
    { semana: 4, pesoReal: 1340, pesoObjetivo: 1480, muestraAves: 24 }, // -9.5%
    { semana: 5, pesoReal: 1920, pesoObjetivo: 2150, muestraAves: 22 }, // -10.7%
  ],
}

// Registros generales de la bitácora (mezcla de tipos)
export const REGISTROS_BITACORA: RegistroBitacora[] = [
  { id: 1,  tipo: 'peso',      fecha: '28/06/2026', galpon: 'GP-01', valor: 1430,  unidad: 'g/ave',  observacion: 'Muestra de 25 aves — zona norte', operario: 'Edison' },
  { id: 2,  tipo: 'mortalidad', fecha: '28/06/2026', galpon: 'GP-01', valor: 3,    unidad: 'aves',   observacion: 'Causa probable: calor', operario: 'Edison' },
  { id: 3,  tipo: 'consumo',   fecha: '28/06/2026', galpon: 'GP-01', valor: 980,   unidad: 'kg',     observacion: 'Consumo normal', operario: 'Edison' },
  { id: 4,  tipo: 'peso',      fecha: '21/06/2026', galpon: 'GP-01', valor: 878,   unidad: 'g/ave',  observacion: 'Muestra de 25 aves', operario: 'Edison' },
  { id: 5,  tipo: 'mortalidad', fecha: '27/06/2026', galpon: 'GP-01', valor: 2,    unidad: 'aves',   observacion: 'Causa probable: aplastamiento', operario: 'Edison' },
  { id: 6,  tipo: 'sanitario', fecha: '25/06/2026', galpon: 'GP-01', valor: 1,    unidad: 'evento',  observacion: 'Aplicación vitaminas C y E en agua — refuerzo calor', operario: 'Edison' },
  { id: 7,  tipo: 'peso',      fecha: '28/06/2026', galpon: 'GP-02', valor: 620,   unidad: 'g/ave',  observacion: 'Muestra de 20 aves', operario: 'Edison' },
  { id: 8,  tipo: 'mortalidad', fecha: '28/06/2026', galpon: 'GP-02', valor: 1,    unidad: 'aves',   observacion: 'Sin causa aparente', operario: 'Edison' },
  { id: 9,  tipo: 'consumo',   fecha: '28/06/2026', galpon: 'GP-02', valor: 850,   unidad: 'kg',     observacion: 'Consumo normal', operario: 'Edison' },
]

// Registros de mortalidad por galpón (EP-06 HU-27)
export const REGISTROS_MORTALIDAD: RegistroMortalidad[] = [
  { id: 1, fecha: '30/06/2026', galpon: 'GP-01', cantidadAves: 2, causaProbable: 'calor',          operario: 'Edison' },
  { id: 2, fecha: '29/06/2026', galpon: 'GP-01', cantidadAves: 3, causaProbable: 'calor',          operario: 'Edison' },
  { id: 3, fecha: '28/06/2026', galpon: 'GP-01', cantidadAves: 3, causaProbable: 'calor',          operario: 'Edison' },
  { id: 4, fecha: '27/06/2026', galpon: 'GP-01', cantidadAves: 2, causaProbable: 'aplastamiento',  operario: 'Edison' },
  { id: 5, fecha: '30/06/2026', galpon: 'GP-02', cantidadAves: 1, causaProbable: 'sin causa',      operario: 'Edison' },
  { id: 6, fecha: '29/06/2026', galpon: 'GP-02', cantidadAves: 2, causaProbable: 'enfermedad',     operario: 'Edison' },
]

// Registros de consumo diario (EP-06 HU-28)
export const REGISTROS_CONSUMO: RegistroConsumo[] = [
  { id: 1, fecha: '30/06/2026', galpon: 'GP-01', alimentoKg: 990,  aguaLitros: 1980, consumoPorAve: 53.3, relacionAguaAlimento: 2.0 },
  { id: 2, fecha: '29/06/2026', galpon: 'GP-01', alimentoKg: 980,  aguaLitros: 1950, consumoPorAve: 52.8, relacionAguaAlimento: 1.99 },
  { id: 3, fecha: '28/06/2026', galpon: 'GP-01', alimentoKg: 975,  aguaLitros: 1960, consumoPorAve: 52.5, relacionAguaAlimento: 2.01 },
  { id: 4, fecha: '30/06/2026', galpon: 'GP-02', alimentoKg: 850,  aguaLitros: 1700, consumoPorAve: 49.4, relacionAguaAlimento: 2.0 },
  { id: 5, fecha: '29/06/2026', galpon: 'GP-02', alimentoKg: 835,  aguaLitros: 1670, consumoPorAve: 48.5, relacionAguaAlimento: 2.0 },
]
