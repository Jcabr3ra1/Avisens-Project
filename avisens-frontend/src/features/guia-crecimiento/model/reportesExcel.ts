import type { ConsumoDiario } from '@features/consumos-diarios/api/consumosDiarios'
import type { Lote } from '@features/lotes/api/lotes'
import { gramosALibras } from '@features/lotes/model/pesoObjetivo'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import { diasDeVida } from '@shared/utils/fechas'
import type { HojaXlsx, ImagenXlsx, RangoCombinado, ValorCelda } from '@shared/utils/xlsx'
import type { IndicadorLote, PlanAlimentoGuia } from '../api/guiaCrecimiento'

function celdaTexto(valor: string | number | null, zebra: boolean): ValorCelda {
  return { valor, estilo: zebra ? 'textoZebra' : 'texto' }
}

function celdaEntero(valor: number | null, zebra: boolean): ValorCelda {
  return { valor, estilo: zebra ? 'enteroZebra' : 'entero' }
}

function celdaDecimal(valor: number | null, zebra: boolean): ValorCelda {
  return { valor, estilo: zebra ? 'decimalZebra' : 'decimalTabla' }
}

function imagenBanner(logo: Uint8Array | null): ImagenXlsx | undefined {
  if (!logo) return undefined
  return {
    datos: logo,
    columna: 0,
    fila: 0,
    anchoPx: 52,
    altoPx: 52,
  }
}

function cabeceraBanner(
  titulo: string,
  subtitulo: string,
  totalColumnas: number,
  logo: Uint8Array | null,
): {
  filas: ValorCelda[][]
  combinaciones: RangoCombinado[]
  alturas: Record<number, number>
  imagen?: ImagenXlsx
} {
  const colInicioTexto = logo ? 1 : 0
  const colFin = Math.max(colInicioTexto, totalColumnas - 1)
  const filaTitulo: ValorCelda[] = Array.from({ length: totalColumnas }, () => null)
  const filaSubtitulo: ValorCelda[] = Array.from({ length: totalColumnas }, () => null)
  filaTitulo[colInicioTexto] = { valor: titulo, estilo: 'bannerTitulo' }
  filaSubtitulo[colInicioTexto] = { valor: subtitulo, estilo: 'bannerSubtitulo' }

  return {
    filas: [filaTitulo, filaSubtitulo, []],
    combinaciones: [
      { filaInicio: 0, colInicio: colInicioTexto, filaFin: 0, colFin },
      { filaInicio: 1, colInicio: colInicioTexto, filaFin: 1, colFin },
    ],
    alturas: { 0: 26, 1: 19, 2: 8 },
    imagen: imagenBanner(logo),
  }
}

function fechaGeneracion(): string {
  return new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function hojasAlimentacionExcel(
  lote: Lote,
  registros: ConsumoDiario[],
  alimento: PlanAlimentoGuia | null,
  logo: Uint8Array | null = null,
): HojaXlsx[] {
  const consumosLote = registros
    .filter((r) => r.lote_id === lote.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)

  const planVigente = alimento !== null && alimento.efectiva && !alimento.desactualizado
    && !alimento.desglose.no_disponible
  const renglonesPlan = planVigente && alimento ? alimento.desglose.renglones : []

  const totalAlimentoKg = consumosLote.reduce((acc, r) => acc + (r.alimento_kg ?? 0), 0)
  const totalAguaL = consumosLote.reduce((acc, r) => acc + (r.agua_litros ?? 0), 0)

  const banner = cabeceraBanner(
    'AVISENS · Reporte de Alimentación',
    `Lote ${lote.codigo} · Generado el ${fechaGeneracion()}`,
    6,
    logo,
  )

  const filas: ValorCelda[][] = [...banner.filas]
  const combinaciones: RangoCombinado[] = [...banner.combinaciones]
  const alturas: Record<number, number> = { ...banner.alturas }

  // Ficha resumen del lote
  filas.push([
    { valor: 'Lote', estilo: 'etiquetaMeta' },
    { valor: lote.codigo, estilo: 'valorMeta' },
    { valor: 'Fecha ingreso', estilo: 'etiquetaMeta' },
    { valor: lote.fecha_ingreso.slice(0, 10), estilo: 'valorMeta' },
    { valor: 'Aves iniciales', estilo: 'etiquetaMeta' },
    { valor: lote.cantidad_inicial, estilo: 'entero' },
  ])
  alturas[filas.length - 1] = 20

  filas.push([
    { valor: 'Registros diarios', estilo: 'etiquetaMeta' },
    { valor: consumosLote.length, estilo: 'entero' },
    { valor: 'Alimento registrado (kg)', estilo: 'etiquetaMeta' },
    { valor: Number(totalAlimentoKg.toFixed(2)), estilo: 'decimalTabla' },
    { valor: 'Agua registrada (L)', estilo: 'etiquetaMeta' },
    { valor: Number(totalAguaL.toFixed(2)), estilo: 'decimalTabla' },
  ])
  alturas[filas.length - 1] = 20
  filas.push([])
  alturas[filas.length - 1] = 10

  // Sección 1: Consumos diarios registrados
  if (consumosLote.length > 0) {
    const idxSeccion = filas.length
    filas.push([
      { valor: 'Consumos diarios registrados', estilo: 'subtituloSeccion' },
      { valor: null, estilo: 'subtituloSeccion' },
      { valor: null, estilo: 'subtituloSeccion' },
      { valor: null, estilo: 'subtituloSeccion' },
      { valor: null, estilo: 'subtituloSeccion' },
      { valor: null, estilo: 'subtituloSeccion' },
    ])
    combinaciones.push({ filaInicio: idxSeccion, colInicio: 0, filaFin: idxSeccion, colFin: 5 })
    alturas[idxSeccion] = 22

    filas.push([
      'Fecha', 'Día de vida', 'Tipo de alimento',
      'Alimento (kg)', 'Agua (L)', 'Método de registro',
    ].map((texto) => ({ valor: texto, estilo: 'cabeceraTabla' })))
    alturas[filas.length - 1] = 24

    consumosLote.forEach((registro, idx) => {
      const zebra = idx % 2 === 1
      const dia = diasDeVida(lote.fecha_ingreso, new Date(`${registro.fecha.slice(0, 10)}T12:00:00`))
      filas.push([
        celdaTexto(registro.fecha.slice(0, 10), zebra),
        celdaEntero(dia, zebra),
        celdaTexto(registro.tipo_alimento?.nombre ?? '—', zebra),
        celdaDecimal(registro.alimento_kg, zebra),
        celdaDecimal(registro.agua_litros, zebra),
        celdaTexto(registro.metodo_registro ?? '—', zebra),
      ])
      alturas[filas.length - 1] = 19
    })

    filas.push([
      { valor: 'Total registrado', estilo: 'totalEtiqueta' },
      { valor: null, estilo: 'totalEtiqueta' },
      { valor: `${consumosLote.length} registros`, estilo: 'totalEtiqueta' },
      { valor: Number(totalAlimentoKg.toFixed(2)), estilo: 'totalDecimal' },
      { valor: Number(totalAguaL.toFixed(2)), estilo: 'totalDecimal' },
      { valor: null, estilo: 'totalEtiqueta' },
    ])
    alturas[filas.length - 1] = 21
    filas.push([])
    alturas[filas.length - 1] = 10
  }

  // Sección 2: Estimación del plan de alimentación
  if (renglonesPlan.length > 0 && alimento) {
    const idxSeccion = filas.length
    filas.push([
      { valor: `Estimación del plan de alimentación (versión ${alimento.version})`, estilo: 'subtituloSeccion' },
      { valor: null, estilo: 'subtituloSeccion' },
      { valor: null, estilo: 'subtituloSeccion' },
      { valor: null, estilo: 'subtituloSeccion' },
      { valor: null, estilo: 'subtituloSeccion' },
      { valor: null, estilo: 'subtituloSeccion' },
    ])
    combinaciones.push({ filaInicio: idxSeccion, colInicio: 0, filaFin: idxSeccion, colFin: 5 })
    alturas[idxSeccion] = 22

    filas.push([
      'Período', 'Alimento', 'Alimento total (kg)',
      'Consumo por ave (g)', 'Origen', 'Observación',
    ].map((texto) => ({ valor: texto, estilo: 'cabeceraTabla' })))
    alturas[filas.length - 1] = 24

    let totalPlanKg = 0
    renglonesPlan.forEach((renglon, idx) => {
      const zebra = idx % 2 === 1
      totalPlanKg += renglon.consumo_total_kg ?? 0
      filas.push([
        celdaTexto(`Día ${renglon.dia_inicio}–${renglon.dia_fin}`, zebra),
        celdaTexto(renglon.tipo_alimento_nombre_snapshot ?? '—', zebra),
        celdaDecimal(renglon.consumo_total_kg, zebra),
        celdaDecimal(renglon.consumo_por_ave_g, zebra),
        celdaTexto(`Plan versión ${alimento.version}`, zebra),
        celdaTexto('Estimación vigente', zebra),
      ])
      alturas[filas.length - 1] = 19
    })

    filas.push([
      { valor: 'Total estimado', estilo: 'totalEtiqueta' },
      { valor: `${renglonesPlan.length} etapas`, estilo: 'totalEtiqueta' },
      { valor: Number(totalPlanKg.toFixed(2)), estilo: 'totalDecimal' },
      { valor: null, estilo: 'totalEtiqueta' },
      { valor: null, estilo: 'totalEtiqueta' },
      { valor: null, estilo: 'totalEtiqueta' },
    ])
    alturas[filas.length - 1] = 21
  }

  return [{
    nombre: 'Alimentación',
    filas,
    anchos: [16, 15, 24, 20, 20, 22],
    alturas,
    combinaciones,
    imagen: banner.imagen,
    ocultarCuadricula: true,
  }]
}

export function hojasCrecimientoExcel(
  lote: Lote,
  indicadores: IndicadorLote[],
  curva: CurvaCrecimiento | null,
  logo: Uint8Array | null = null,
): HojaXlsx[] {
  const validos = indicadores.filter((dato) => dato.estado_calculo === 'calculado' && dato.dia_vida !== null)
  const indicadorPorDia = new Map(validos.map((dato) => [dato.dia_vida!, dato]))
  const curvaPorDia = new Map(curva?.serie.map((punto) => [punto.dia, punto]) ?? [])
  const dias = [...new Set([...indicadorPorDia.keys(), ...curvaPorDia.keys()])].sort((a, b) => a - b)
  const proyeccionDisponible = (curva?.modelo.puntos_usados ?? 0) >= 1

  const banner = cabeceraBanner(
    'AVISENS · Reporte de Crecimiento y Proyección',
    `Lote ${lote.codigo} · Generado el ${fechaGeneracion()}`,
    10,
    logo,
  )

  const filas: ValorCelda[][] = [...banner.filas]
  const alturas: Record<number, number> = { ...banner.alturas }

  filas.push([
    'Día de vida', 'Fecha indicador', 'Fecha pesaje', 'Peso registrado (g)',
    'Peso proyectado (g)', 'Rango mín (g)', 'Rango máx (g)',
    'Curva estándar (g)', 'FCR registrado', 'Estado',
  ].map((texto) => ({ valor: texto, estilo: 'cabeceraTabla' })))
  alturas[filas.length - 1] = 26

  dias.forEach((dia, idx) => {
    const zebra = idx % 2 === 1
    const indicador = indicadorPorDia.get(dia)
    const punto = curvaPorDia.get(dia)
    const pesoRegistrado = indicador?.estado_peso === 'disponible' ? indicador.peso_promedio_g : null
    filas.push([
      celdaEntero(dia, zebra),
      celdaTexto(indicador?.fecha.slice(0, 10) ?? '—', zebra),
      celdaTexto(indicador?.estado_peso === 'disponible' ? indicador.pesaje_fecha_snapshot?.slice(0, 10) ?? '—' : '—', zebra),
      celdaDecimal(pesoRegistrado, zebra),
      celdaDecimal(proyeccionDisponible ? punto?.proyectado_g ?? null : null, zebra),
      celdaDecimal(proyeccionDisponible ? punto?.min_g ?? null : null, zebra),
      celdaDecimal(proyeccionDisponible ? punto?.max_g ?? null : null, zebra),
      celdaDecimal(punto?.estandar_g ?? null, zebra),
      celdaDecimal(indicador?.fcr ?? null, zebra),
      celdaTexto(indicador?.estado_calculo ?? '—', zebra),
    ])
    alturas[filas.length - 1] = 19
  })

  return [{
    nombre: 'Crecimiento',
    filas,
    anchos: [13, 16, 15, 19, 19, 15, 15, 18, 15, 16],
    alturas,
    combinaciones: banner.combinaciones,
    imagen: banner.imagen,
    ocultarCuadricula: true,
  }]
}

export function hojasEjecutivoExcel(
  lote: Lote,
  indicadores: IndicadorLote[],
  curva: CurvaCrecimiento | null,
  alimento: PlanAlimentoGuia | null,
  logo: Uint8Array | null = null,
): HojaXlsx[] {
  const validos = indicadores
    .filter((i) => i.estado_calculo === 'calculado' && i.dia_vida !== null)
    .sort((a, b) => (a.dia_vida ?? 0) - (b.dia_vida ?? 0))
  const ultimoIndicador = validos.length > 0 ? validos[validos.length - 1] : null

  const avesIniciales = lote.cantidad_inicial
  const avesFinales = lote.cantidad_aves_vendidas ?? avesIniciales
  const pesoFinalG =
    lote.peso_promedio_final_g ??
    ultimoIndicador?.peso_promedio_g ??
    curva?.resumen.ultimo_pesaje.peso_g ??
    0
  const carneTotalKg = Math.round((avesFinales * pesoFinalG) / 1000)
  const alimentoTotalKg =
    alimento?.resultado.consumo_total_kg ??
    (ultimoIndicador?.consumo_acumulado_g
      ? Math.round((ultimoIndicador.consumo_acumulado_g * avesFinales) / 1000)
      : 0)
  const fcrFinal = lote.fcr_final ?? ultimoIndicador?.fcr ?? (carneTotalKg > 0 ? alimentoTotalKg / carneTotalKg : null)
  const mortalidadPct =
    lote.mortalidad_acumulada_final_pct ??
    (avesIniciales > 0 ? ((avesIniciales - avesFinales) / avesIniciales) * 100 : 0)

  const costoAlimentoCop = alimentoTotalKg * 2600
  const precioKgCop = lote.precio_venta_kg_cop ?? 6200
  const ingresoVentaCop = lote.valor_venta_total_cop ?? (carneTotalKg * precioKgCop)
  const margenCop = ingresoVentaCop - costoAlimentoCop

  const nombreGranja = lote.galpon?.granja?.nombre ?? 'Granja'
  const nombreGalpon = lote.galpon?.nombre ?? 'Galpón'
  const banner = cabeceraBanner(
    'AVISENS · Reporte Ejecutivo del Lote',
    `${nombreGranja} · ${nombreGalpon} · Lote ${lote.codigo} · ${fechaGeneracion()}`,
    7,
    logo,
  )

  const filas: ValorCelda[][] = [...banner.filas]
  const combinaciones: RangoCombinado[] = [...banner.combinaciones]
  const alturas: Record<number, number> = { ...banner.alturas }

  const agregarSeccion = (titulo: string) => {
    const idx = filas.length
    filas.push(Array.from({ length: 7 }, (_, c) => ({ valor: c === 0 ? titulo : null, estilo: 'subtituloSeccion' })))
    combinaciones.push({ filaInicio: idx, colInicio: 0, filaFin: idx, colFin: 6 })
    alturas[idx] = 22
  }

  agregarSeccion('1. Indicadores Zootécnicos Clave')
  filas.push([
    { valor: 'Aves iniciales', estilo: 'etiquetaMeta' },
    { valor: avesIniciales, estilo: 'entero' },
    { valor: 'Aves vendidas / actuales', estilo: 'etiquetaMeta' },
    { valor: avesFinales, estilo: 'entero' },
    { valor: 'Mortalidad (%)', estilo: 'etiquetaMeta' },
    { valor: Number(mortalidadPct.toFixed(2)), estilo: 'decimalTabla' },
    null,
  ])
  alturas[filas.length - 1] = 20
  filas.push([
    { valor: 'Peso promedio (g)', estilo: 'etiquetaMeta' },
    { valor: pesoFinalG, estilo: 'decimalTabla' },
    { valor: 'Peso promedio (lb)', estilo: 'etiquetaMeta' },
    { valor: Number(gramosALibras(pesoFinalG).toFixed(2)), estilo: 'decimalTabla' },
    { valor: 'FCR', estilo: 'etiquetaMeta' },
    { valor: fcrFinal !== null ? Number(fcrFinal.toFixed(2)) : null, estilo: 'decimalTabla' },
    null,
  ])
  alturas[filas.length - 1] = 20
  filas.push([])
  alturas[filas.length - 1] = 10

  agregarSeccion('2. Balance Financiero Preliminar (COP)')
  filas.push([
    'Concepto', 'Cantidad', 'Unidad', 'Valor estimado (COP)', 'Detalle', '', '',
  ].map((t) => ({ valor: t, estilo: 'cabeceraTabla' })))
  alturas[filas.length - 1] = 22
  filas.push([
    celdaTexto('Carne producida / ingreso', false),
    celdaEntero(carneTotalKg, false),
    celdaTexto('kg', false),
    { valor: ingresoVentaCop, estilo: 'monedaTabla' },
    celdaTexto(`Base $ ${precioKgCop.toLocaleString('es-CO')} / kg`, false),
    celdaTexto('', false),
    celdaTexto('', false),
  ])
  alturas[filas.length - 1] = 19
  filas.push([
    celdaTexto('Alimento consumido / costo', true),
    celdaEntero(alimentoTotalKg, true),
    celdaTexto('kg', true),
    { valor: costoAlimentoCop, estilo: 'monedaZebra' },
    celdaTexto('Base $ 2.600 / kg', true),
    celdaTexto('', true),
    celdaTexto('', true),
  ])
  alturas[filas.length - 1] = 19
  filas.push([
    { valor: 'Margen bruto preliminar', estilo: 'totalEtiqueta' },
    { valor: null, estilo: 'totalEtiqueta' },
    { valor: 'COP', estilo: 'totalEtiqueta' },
    { valor: margenCop, estilo: 'totalMoneda' },
    { valor: 'Venta carne − costo alimento', estilo: 'totalEtiqueta' },
    { valor: null, estilo: 'totalEtiqueta' },
    { valor: null, estilo: 'totalEtiqueta' },
  ])
  alturas[filas.length - 1] = 21
  filas.push([])
  alturas[filas.length - 1] = 10

  agregarSeccion('3. Historial de Crecimiento y Consumo')
  filas.push([
    'Día de vida', 'Fecha', 'Peso promedio (g)', 'Peso (lb)',
    'Consumo acum. (g/ave)', 'FCR', 'Estado',
  ].map((t) => ({ valor: t, estilo: 'cabeceraTabla' })))
  alturas[filas.length - 1] = 24

  validos.forEach((ind, idx) => {
    const zebra = idx % 2 === 1
    const pesoG = ind.peso_promedio_g ?? null
    filas.push([
      celdaEntero(ind.dia_vida, zebra),
      celdaTexto(ind.fecha.slice(0, 10), zebra),
      celdaDecimal(pesoG, zebra),
      celdaDecimal(pesoG !== null ? Number(gramosALibras(pesoG).toFixed(2)) : null, zebra),
      celdaDecimal(ind.consumo_acumulado_g ?? null, zebra),
      celdaDecimal(ind.fcr ?? null, zebra),
      celdaTexto(ind.estado_peso ?? 'Registrado', zebra),
    ])
    alturas[filas.length - 1] = 19
  })

  return [{
    nombre: 'Ejecutivo',
    filas,
    anchos: [24, 16, 18, 22, 24, 14, 16],
    alturas,
    combinaciones,
    imagen: banner.imagen,
    ocultarCuadricula: true,
  }]
}
