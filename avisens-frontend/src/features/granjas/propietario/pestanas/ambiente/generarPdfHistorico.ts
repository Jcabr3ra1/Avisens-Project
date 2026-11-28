import type { HistoricoMedicionesResponse } from '@features/sensores/api/mediciones'

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN_X = 42

const ETIQUETA_VARIABLE: Record<HistoricoMedicionesResponse['variable'], string> = {
  temperatura: 'Temperatura',
  humedad: 'Humedad relativa',
  co2: 'Dióxido de carbono (CO2)',
  nh3: 'Amoníaco (NH3)',
  luminosidad: 'Luminosidad',
}

function aAsciiSeguro(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function fmtFechaCorta(iso: string, granularidad: 'hora' | 'dia'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(granularidad === 'hora' ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d)
}

function fmtNum(val: number | null, unidad = ''): string {
  if (val === null || !Number.isFinite(val)) return '-'
  return unidad ? `${val.toFixed(1)} ${unidad}` : val.toFixed(1)
}

function textCmd(
  x: number,
  y: number,
  texto: string,
  size = 10,
  bold = false,
  rgb = '0.1 0.14 0.12',
): string {
  const font = bold ? '/F2' : '/F1'
  return `BT ${font} ${size} Tf ${rgb} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${aAsciiSeguro(texto)}) Tj ET\n`
}

function rectCmd(
  x: number,
  y: number,
  w: number,
  h: number,
  fillRgb: string,
  strokeRgb?: string,
): string {
  if (strokeRgb) {
    return `${fillRgb} rg ${strokeRgb} RG 0.6 w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B\n`
  }
  return `${fillRgb} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`
}

function lineCmd(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rgb = '0.82 0.86 0.84',
  width = 0.6,
  dash?: string,
): string {
  const dashOp = dash ? `[${dash}] 0 d ` : '[] 0 d '
  return `q ${rgb} RG ${width.toFixed(2)} w ${dashOp}${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q\n`
}

function construirGraficoVectorial(
  datos: HistoricoMedicionesResponse,
  x: number,
  yTop: number,
  w: number,
  h: number,
): string {
  const serie = datos.serie
  if (serie.length === 0) return ''

  let out = rectCmd(x, yTop - h, w, h, '0.98 0.99 0.98', '0.84 0.89 0.86')

  const padL = 42
  const padR = 14
  const padT = 18
  const padB = 26
  const gx = x + padL
  const gyBot = yTop - h + padB
  const gw = w - padL - padR
  const gh = h - padT - padB

  const valores: number[] = []
  for (const p of serie) {
    valores.push(p.promedio, p.minimo, p.maximo)
    if (p.objetivo_min !== null) valores.push(p.objetivo_min)
    if (p.objetivo_max !== null) valores.push(p.objetivo_max)
  }
  let vMin = Math.min(...valores)
  let vMax = Math.max(...valores)
  if (vMax - vMin < 1) {
    vMin -= 1
    vMax += 1
  } else {
    const pad = (vMax - vMin) * 0.1
    vMin -= pad
    vMax += pad
  }

  const xOf = (idx: number) =>
    serie.length === 1 ? gx + gw / 2 : gx + (idx / (serie.length - 1)) * gw
  const yOf = (val: number) => gyBot + ((val - vMin) / (vMax - vMin)) * gh

  // Grid + Y labels
  for (let i = 0; i <= 4; i++) {
    const ratio = i / 4
    const val = vMin + (vMax - vMin) * ratio
    const yy = gyBot + gh * ratio
    out += lineCmd(gx, yy, gx + gw, yy, '0.88 0.91 0.89', 0.5, '2 2')
    out += textCmd(x + 6, yy - 3, val.toFixed(1), 8, false, '0.38 0.44 0.41')
  }

  // Target band polygon where both objetivo_min and objetivo_max exist
  const puntosObj = serie
    .map((p, idx) => ({ p, idx }))
    .filter((item) => item.p.objetivo_min !== null && item.p.objetivo_max !== null)

  if (puntosObj.length >= 2) {
    out += 'q 0.06 0.66 0.42 rg '
    // Approximate translucent green with light mint fill
    out += '0.88 0.96 0.92 rg '
    const primero = puntosObj[0]
    out += `${xOf(primero.idx).toFixed(2)} ${yOf(primero.p.objetivo_max!).toFixed(2)} m\n`
    for (let i = 1; i < puntosObj.length; i++) {
      const it = puntosObj[i]
      out += `${xOf(it.idx).toFixed(2)} ${yOf(it.p.objetivo_max!).toFixed(2)} l\n`
    }
    for (let i = puntosObj.length - 1; i >= 0; i--) {
      const it = puntosObj[i]
      out += `${xOf(it.idx).toFixed(2)} ${yOf(it.p.objetivo_min!).toFixed(2)} l\n`
    }
    out += 'f Q\n'
  }

  // Target min/max dashed lines
  if (puntosObj.length >= 2) {
    out += 'q 0.09 0.52 0.34 RG 0.9 w [4 3] 0 d '
    out += `${xOf(puntosObj[0].idx).toFixed(2)} ${yOf(puntosObj[0].p.objetivo_max!).toFixed(2)} m `
    for (let i = 1; i < puntosObj.length; i++) {
      out += `${xOf(puntosObj[i].idx).toFixed(2)} ${yOf(puntosObj[i].p.objetivo_max!).toFixed(2)} l `
    }
    out += 'S Q\n'

    out += 'q 0.09 0.52 0.34 RG 0.9 w [4 3] 0 d '
    out += `${xOf(puntosObj[0].idx).toFixed(2)} ${yOf(puntosObj[0].p.objetivo_min!).toFixed(2)} m `
    for (let i = 1; i < puntosObj.length; i++) {
      out += `${xOf(puntosObj[i].idx).toFixed(2)} ${yOf(puntosObj[i].p.objetivo_min!).toFixed(2)} l `
    }
    out += 'S Q\n'
  }

  // Real average curve
  if (serie.length >= 2) {
    out += 'q 0.09 0.40 0.28 RG 1.8 w [] 0 d '
    out += `${xOf(0).toFixed(2)} ${yOf(serie[0].promedio).toFixed(2)} m `
    for (let i = 1; i < serie.length; i++) {
      out += `${xOf(i).toFixed(2)} ${yOf(serie[i].promedio).toFixed(2)} l `
    }
    out += 'S Q\n'
  } else {
    const cx = xOf(0)
    const cy = yOf(serie[0].promedio)
    out += rectCmd(cx - 2.5, cy - 2.5, 5, 5, '0.09 0.40 0.28')
  }

  // X axis labels (first, middle, last)
  const indicesX = Array.from(new Set([0, Math.floor((serie.length - 1) / 2), serie.length - 1]))
  for (const idx of indicesX) {
    const lbl = fmtFechaCorta(serie[idx].fecha, datos.granularidad)
    const lx = Math.min(gx + gw - 54, Math.max(gx, xOf(idx) - 22))
    out += textCmd(lx, gyBot - 14, lbl, 7.5, false, '0.38 0.44 0.41')
  }

  out += textCmd(
    gx,
    yTop - 13,
    'Curva real (linea solida) vs. banda objetivo Italcol (verde)',
    8.5,
    true,
    '0.09 0.40 0.28',
  )

  return out
}

export function generarPdfHistorico(datos: HistoricoMedicionesResponse): Uint8Array {
  const pages: string[] = []
  const zonaNombre =
    datos.zona_id !== null
      ? (datos.zonas.find((z) => z.id === datos.zona_id)?.nombre ?? `Zona #${datos.zona_id}`)
      : 'Todas las zonas'
  const variableNombre = ETIQUETA_VARIABLE[datos.variable]

  // Page 1 header + metadata + KPIs + chart
  let p1 = ''
  p1 += rectCmd(0, PAGE_H - 68, PAGE_W, 68, '0.09 0.40 0.28')
  p1 += textCmd(MARGIN_X, PAGE_H - 30, 'AVISENS · Reporte Historico Ambiental', 16, true, '1 1 1')
  p1 += textCmd(
    MARGIN_X,
    PAGE_H - 48,
    `${datos.galpon.granja} · ${datos.galpon.nombre} (${datos.galpon.codigo})`,
    10,
    false,
    '0.85 0.94 0.89',
  )

  let y = PAGE_H - 92
  p1 += rectCmd(MARGIN_X, y - 48, PAGE_W - MARGIN_X * 2, 54, '0.96 0.98 0.97', '0.84 0.89 0.86')
  p1 += textCmd(MARGIN_X + 12, y - 10, `Variable: ${variableNombre} (${datos.unidad_medida})`, 9.5, true)
  p1 += textCmd(MARGIN_X + 270, y - 10, `Zona: ${zonaNombre}`, 9.5, false)
  p1 += textCmd(
    MARGIN_X + 12,
    y - 26,
    `Periodo: ${fmtFechaCorta(datos.desde, 'dia')} al ${fmtFechaCorta(datos.hasta, 'dia')}`,
    9.5,
    false,
  )
  p1 += textCmd(
    MARGIN_X + 270,
    y - 26,
    `Granularidad: ${datos.granularidad === 'hora' ? 'Por hora' : 'Diaria'}`,
    9.5,
    false,
  )
  p1 += textCmd(
    MARGIN_X + 12,
    y - 42,
    `Generado: ${fmtFechaCorta(new Date().toISOString(), 'hora')}`,
    8.5,
    false,
    '0.4 0.46 0.43',
  )

  y -= 68
  const cardW = (PAGE_W - MARGIN_X * 2 - 24) / 4
  const kpis = [
    ['Promedio', fmtNum(datos.resumen.promedio_general, datos.unidad_medida)],
    ['Minimo / Maximo', `${fmtNum(datos.resumen.minimo_general)} / ${fmtNum(datos.resumen.maximo_general)}`],
    ['Total lecturas', String(datos.resumen.total_lecturas)],
    ['Fuera de objetivo', String(datos.resumen.puntos_fuera_de_rango)],
  ]
  kpis.forEach(([label, val], idx) => {
    const cx = MARGIN_X + idx * (cardW + 8)
    p1 += rectCmd(cx, y - 40, cardW, 40, '1 1 1', '0.84 0.89 0.86')
    p1 += textCmd(cx + 8, y - 14, label, 8, false, '0.4 0.46 0.43')
    p1 += textCmd(cx + 8, y - 31, val, 10.5, true, '0.09 0.25 0.18')
  })

  y -= 56
  p1 += construirGraficoVectorial(datos, MARGIN_X, y, PAGE_W - MARGIN_X * 2, 185)
  y -= 208

  const drawTableHeader = (currY: number) => {
    let chunk = rectCmd(MARGIN_X, currY - 20, PAGE_W - MARGIN_X * 2, 20, '0.13 0.35 0.25')
    const cols = [
      [MARGIN_X + 8, 'Fecha / Periodo'],
      [MARGIN_X + 150, 'Promedio'],
      [MARGIN_X + 225, 'Min / Max'],
      [MARGIN_X + 315, 'Objetivo'],
      [MARGIN_X + 405, 'Lecturas'],
      [MARGIN_X + 460, 'Estado'],
    ] as const
    for (const [cx, title] of cols) {
      chunk += textCmd(cx, currY - 13, title, 8.5, true, '1 1 1')
    }
    return chunk
  }

  p1 += textCmd(MARGIN_X, y, 'Detalle de registros agregados', 11, true, '0.09 0.25 0.18')
  y -= 10
  p1 += drawTableHeader(y)
  y -= 20

  let currentPage = p1
  const bottomLimit = 46

  for (let i = 0; i < datos.serie.length; i++) {
    if (y - 18 < bottomLimit) {
      pages.push(currentPage)
      currentPage = ''
      y = PAGE_H - 52
      currentPage += textCmd(
        MARGIN_X,
        PAGE_H - 30,
        `AVISENS · Historico ${datos.galpon.nombre} (${variableNombre}) - Cont.`,
        10,
        true,
        '0.09 0.40 0.28',
      )
      currentPage += drawTableHeader(y)
      y -= 20
    }

    const row = datos.serie[i]
    const bg = i % 2 === 0 ? '1 1 1' : '0.97 0.98 0.97'
    currentPage += rectCmd(MARGIN_X, y - 18, PAGE_W - MARGIN_X * 2, 18, bg, '0.90 0.93 0.91')

    const objetivoTxt =
      row.objetivo_min !== null && row.objetivo_max !== null
        ? `${row.objetivo_min}-${row.objetivo_max}`
        : 'Sin umbral'
    const fuera =
      (row.objetivo_min !== null && row.promedio < row.objetivo_min) ||
      (row.objetivo_max !== null && row.promedio > row.objetivo_max)
    const estadoTxt = row.objetivo_min === null ? 'Sin ref.' : fuera ? 'Fuera' : 'Optimo'
    const estadoRgb = row.objetivo_min === null ? '0.4 0.45 0.42' : fuera ? '0.75 0.15 0.15' : '0.09 0.45 0.25'

    currentPage += textCmd(MARGIN_X + 8, y - 12, fmtFechaCorta(row.fecha, datos.granularidad), 8.2)
    currentPage += textCmd(MARGIN_X + 150, y - 12, fmtNum(row.promedio, datos.unidad_medida), 8.2, true)
    currentPage += textCmd(MARGIN_X + 225, y - 12, `${row.minimo.toFixed(1)} / ${row.maximo.toFixed(1)}`, 8.2)
    currentPage += textCmd(MARGIN_X + 315, y - 12, objetivoTxt, 8.2)
    currentPage += textCmd(MARGIN_X + 415, y - 12, String(row.lecturas), 8.2)
    currentPage += textCmd(MARGIN_X + 460, y - 12, estadoTxt, 8.2, true, estadoRgb)
    y -= 18
  }

  pages.push(currentPage)

  // Assemble valid PDF 1.4 objects
  const objects: string[] = []
  const addObj = (body: string) => {
    objects.push(body)
    return objects.length
  }

  const fontRegularId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const fontBoldId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
  const pagesObjId = addObj('') // placeholder for /Pages

  const pageIds: number[] = []
  for (const streamContent of pages) {
    const bytes = new TextEncoder().encode(streamContent).length
    const contentId = addObj(`<< /Length ${bytes} >>\nstream\n${streamContent}endstream`)
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>`,
    )
    pageIds.push(pageId)
  }

  objects[pagesObjId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`)

  const chunks: string[] = ['%PDF-1.4\n']
  const offsets: number[] = [0]
  let currentOffset = chunks[0].length

  for (let i = 0; i < objects.length; i++) {
    offsets.push(currentOffset)
    const entry = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
    chunks.push(entry)
    currentOffset += new TextEncoder().encode(entry).length
  }

  const xrefOffset = currentOffset
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  chunks.push(xref)

  return new TextEncoder().encode(chunks.join(''))
}
