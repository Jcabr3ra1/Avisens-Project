import type { HojaXlsx, ValorCelda } from '@shared/utils/xlsx'
import type {
  CodigoAviso,
  FiltroReporte,
  ReporteFinanciero,
} from '../api/reporte-financiero'
import { fechaCorta } from './movimiento'

export type ModoReporte = 'lote' | 'periodo'

export interface FormularioReporte {
  modo: ModoReporte
  lote_id: string
  granja_id: string
  fecha_desde: string
  fecha_hasta: string
}

export function formularioReporteVacio(hoy: string): FormularioReporte {
  return {
    modo: 'lote',
    lote_id: '',
    granja_id: '',
    // Por defecto, el mes en curso hasta hoy.
    fecha_desde: `${hoy.slice(0, 7)}-01`,
    fecha_hasta: hoy,
  }
}

// Mismo tope que el backend: más de dos años deja de ser un ciclo.
const DIAS_MAXIMOS = 731

export function errorDeFiltro(form: FormularioReporte): string {
  if (form.modo === 'lote') {
    return form.lote_id ? '' : 'Elige el lote del ciclo que quieres revisar.'
  }
  if (!form.fecha_desde || !form.fecha_hasta) return 'Elige la fecha inicial y la final del periodo.'
  if (form.fecha_desde > form.fecha_hasta) return 'La fecha inicial no puede ser posterior a la final.'
  const dias = (Date.parse(form.fecha_hasta) - Date.parse(form.fecha_desde)) / 86_400_000
  if (dias > DIAS_MAXIMOS) return 'El periodo no puede superar dos años.'
  return ''
}

export function filtroDesdeFormulario(form: FormularioReporte): FiltroReporte {
  if (form.modo === 'lote') return { lote_id: Number(form.lote_id) }
  const filtro: FiltroReporte = { fecha_desde: form.fecha_desde, fecha_hasta: form.fecha_hasta }
  if (form.granja_id) filtro.granja_id = Number(form.granja_id)
  return filtro
}

export function formatoCop(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

export function formatoPorcentaje(valor: number | null): string {
  if (valor === null) return '—'
  return `${valor.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

/** Texto que identifica qué se reportó: «Lote L-001» o «Del … al …». */
export function descripcionAlcance(reporte: ReporteFinanciero, nombreGranja?: string): string {
  const { alcance } = reporte
  if (alcance.tipo === 'lote') {
    const lote = reporte.lotes[0]
    return lote ? `Ciclo del lote ${lote.codigo} · ${lote.granja}` : 'Ciclo del lote'
  }
  const rango = `Del ${fechaCorta(alcance.fecha_desde)} al ${fechaCorta(alcance.fecha_hasta)}`
  return nombreGranja ? `${rango} · ${nombreGranja}` : `${rango} · Todas las granjas`
}

// Los avisos de ciclo en curso solo informan; el resto señala datos que faltan.
export function esAvisoInformativo(codigo: CodigoAviso): boolean {
  return codigo === 'ciclo-en-curso'
}

export function nombreArchivoReporte(reporte: ReporteFinanciero): string {
  const { alcance } = reporte
  const base = alcance.tipo === 'lote'
    ? `reporte-financiero-${reporte.lotes[0]?.codigo ?? `lote-${alcance.lote_id}`}`
    : `reporte-financiero-${alcance.fecha_desde}-a-${alcance.fecha_hasta}`
  return base.replace(/[^\w.-]+/g, '-')
}

const ESTADO_LOTE: Record<string, string> = {
  activo: 'Activo',
  finalizado: 'Finalizado',
  inactivo: 'Inactivo',
}

const titulo = (valor: string): ValorCelda => ({ valor, estilo: 'titulo' })
const moneda = (valor: number | null): ValorCelda => ({ valor, estilo: 'moneda' })
const decimal = (valor: number | null): ValorCelda => ({ valor, estilo: 'decimal' })

/** Las hojas del Excel: resumen, detalle por lote y totales por categoría. */
export function hojasDelReporte(reporte: ReporteFinanciero, nombreGranja?: string): HojaXlsx[] {
  const { totales, gastos_generales: generales } = reporte
  const resumen: ValorCelda[][] = [
    [titulo('Reporte financiero por ciclo — AVISENS')],
    [descripcionAlcance(reporte, nombreGranja)],
    ['Generado', new Date(reporte.generado_en).toLocaleString('es-CO')],
    [],
    [titulo('Concepto'), titulo('Valor (COP)')],
    ['Ingresos', moneda(totales.ingresos)],
    ['Egresos', moneda(totales.egresos)],
    ['Balance', moneda(totales.balance)],
    ['Margen neto (%)', decimal(totales.margen_neto_pct)],
    ['Movimientos', totales.movimientos],
  ]
  if (generales.movimientos > 0) {
    resumen.push(
      [],
      [titulo('Gastos generales de granja (sin lote)')],
      ['Ingresos', moneda(generales.ingresos)],
      ['Egresos', moneda(generales.egresos)],
      ['Balance', moneda(generales.balance)],
    )
  }
  resumen.push([], [titulo(reporte.completo ? 'Datos completos' : 'Avisos de datos incompletos')])
  reporte.avisos.forEach((aviso) => resumen.push([aviso.mensaje]))

  const lotes: ValorCelda[][] = [[
    'Lote', 'Granja', 'Estado', 'Día de vida', 'Aves iniciales', 'Aves vivas',
    'Ingresos', 'Egresos', 'Balance', 'Margen neto (%)', 'Costo por ave',
    'Presupuesto', 'Presupuesto usado (%)', 'Peso actual (kg)', 'Peso objetivo (kg)',
  ].map(titulo)]
  reporte.lotes.forEach((lote) => lotes.push([
    lote.codigo,
    lote.granja,
    ESTADO_LOTE[lote.estado] ?? lote.estado,
    lote.dia_vida,
    lote.cantidad_inicial,
    lote.aves_vivas,
    moneda(lote.ingresos),
    moneda(lote.egresos),
    moneda(lote.balance),
    decimal(lote.margen_neto_pct),
    moneda(lote.costo_por_ave),
    moneda(lote.presupuesto_cop),
    decimal(lote.presupuesto_usado_pct),
    decimal(lote.peso_actual_kg),
    decimal(lote.peso_objetivo_kg),
  ]))

  const categorias: ValorCelda[][] = [
    ['Tipo', 'Categoría', 'Movimientos', 'Total (COP)'].map(titulo),
    ...reporte.por_categoria.map((categoria): ValorCelda[] => [
      categoria.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
      categoria.nombre,
      categoria.movimientos,
      moneda(categoria.total),
    ]),
  ]

  return [
    { nombre: 'Resumen', filas: resumen, anchos: [44, 20] },
    { nombre: 'Lotes', filas: lotes, anchos: [14, 22, 12, 11, 13, 11, 16, 16, 16, 14, 14, 16, 14, 13, 14] },
    { nombre: 'Categorías', filas: categorias, anchos: [10, 28, 13, 18] },
  ]
}
