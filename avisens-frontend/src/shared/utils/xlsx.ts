// Libro de Excel (.xlsx) armado en el navegador, sin librerías.
//
// Un .xlsx es un ZIP de XMLs y recursos (como imágenes PNG). Se empaquetan sin
// compresión (método "store"): Excel, LibreOffice y Google Sheets lo abren
// igual y no hay que cargar una dependencia de cientos de KB por un botón.

export type EstiloCelda =
  | 'titulo'
  | 'moneda'
  | 'decimal'
  | 'bannerTitulo'
  | 'bannerSubtitulo'
  | 'cabeceraTabla'
  | 'subtituloSeccion'
  | 'texto'
  | 'textoZebra'
  | 'entero'
  | 'enteroZebra'
  | 'decimalTabla'
  | 'decimalZebra'
  | 'monedaTabla'
  | 'monedaZebra'
  | 'totalEtiqueta'
  | 'totalDecimal'
  | 'totalMoneda'
  | 'etiquetaMeta'
  | 'valorMeta'

export interface Celda {
  valor: string | number | null
  estilo?: EstiloCelda
}

export type ValorCelda = string | number | null | Celda

export interface ImagenXlsx {
  datos: Uint8Array
  /** Columna inicial (base 0). */
  columna: number
  /** Fila inicial (base 0). */
  fila: number
  anchoPx: number
  altoPx: number
}

export interface RangoCombinado {
  filaInicio: number
  colInicio: number
  filaFin: number
  colFin: number
}

export interface HojaXlsx {
  nombre: string
  filas: ValorCelda[][]
  /** Ancho de cada columna, en caracteres. */
  anchos?: number[]
  /** Alto de fila en puntos (índice base 0 -> pt). */
  alturas?: Record<number, number>
  /** Celdas combinadas (índices base 0). */
  combinaciones?: RangoCombinado[]
  /** Imagen PNG incrustada en la hoja. */
  imagen?: ImagenXlsx
  /** Oculta la cuadrícula estándar de Excel para un acabado de documento. */
  ocultarCuadricula?: boolean
}

// Índices de cellXfs en styles.xml:
// 0 normal, 1 negrita, 2 #,##0, 3 0.00 (se mantienen por compatibilidad).
const INDICE_ESTILO: Record<EstiloCelda, number> = {
  titulo: 1,
  moneda: 2,
  decimal: 3,
  bannerTitulo: 4,
  bannerSubtitulo: 5,
  cabeceraTabla: 6,
  subtituloSeccion: 7,
  texto: 8,
  textoZebra: 9,
  entero: 10,
  enteroZebra: 11,
  decimalTabla: 12,
  decimalZebra: 13,
  monedaTabla: 14,
  monedaZebra: 15,
  totalEtiqueta: 16,
  totalDecimal: 17,
  totalMoneda: 18,
  etiquetaMeta: 19,
  valorMeta: 20,
}

function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Caracteres de control que XML 1.0 no admite.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

export function columnaExcel(indice: number): string {
  let resto = indice + 1
  let letras = ''
  while (resto > 0) {
    const modulo = (resto - 1) % 26
    letras = String.fromCharCode(65 + modulo) + letras
    resto = Math.floor((resto - 1) / 26)
  }
  return letras
}

// Excel rechaza nombres de hoja con []:*?/\ o de más de 31 caracteres.
export function nombreDeHoja(nombre: string): string {
  const limpio = nombre.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31)
  return limpio || 'Hoja'
}

function celdaXml(valor: ValorCelda, referencia: string): string {
  const celda: Celda = valor !== null && typeof valor === 'object' ? valor : { valor }
  const tieneEstilo = Boolean(celda.estilo)
  if ((celda.valor === null || celda.valor === '') && !tieneEstilo) return ''
  const estilo = celda.estilo ? ` s="${INDICE_ESTILO[celda.estilo]}"` : ''
  if (celda.valor === null || celda.valor === '') {
    return `<c r="${referencia}"${estilo}/>`
  }
  if (typeof celda.valor === 'number' && Number.isFinite(celda.valor)) {
    return `<c r="${referencia}"${estilo}><v>${celda.valor}</v></c>`
  }
  return `<c r="${referencia}" t="inlineStr"${estilo}><is><t xml:space="preserve">${escaparXml(String(celda.valor))}</t></is></c>`
}

function hojaXml(hoja: HojaXlsx, tieneDibujo: boolean): string {
  const vistas = hoja.ocultarCuadricula
    ? '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>'
    : ''
  const columnas = hoja.anchos?.length
    ? `<cols>${hoja.anchos.map((ancho, i) => `<col min="${i + 1}" max="${i + 1}" width="${ancho}" customWidth="1"/>`).join('')}</cols>`
    : ''
  const filas = hoja.filas.map((fila, i) => {
    const celdas = fila.map((valor, j) => celdaXml(valor, `${columnaExcel(j)}${i + 1}`)).join('')
    const altura = hoja.alturas?.[i]
    const attrAltura = altura ? ` ht="${altura}" customHeight="1"` : ''
    return `<row r="${i + 1}"${attrAltura}>${celdas}</row>`
  }).join('')
  const combinaciones = hoja.combinaciones?.length
    ? `<mergeCells count="${hoja.combinaciones.length}">${hoja.combinaciones.map((r) => (
      `<mergeCell ref="${columnaExcel(r.colInicio)}${r.filaInicio + 1}:${columnaExcel(r.colFin)}${r.filaFin + 1}"/>`
    )).join('')}</mergeCells>`
    : ''
  const dibujo = tieneDibujo ? '<drawing r:id="rId1"/>' : ''
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + `${vistas}${columnas}<sheetData>${filas}</sheetData>${combinaciones}${dibujo}</worksheet>`
}

function dibujoXml(imagen: ImagenXlsx): string {
  const emuAncho = Math.round(imagen.anchoPx * 9525)
  const emuAlto = Math.round(imagen.altoPx * 9525)
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"'
    + ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<xdr:oneCellAnchor>'
    + `<xdr:from><xdr:col>${imagen.columna}</xdr:col><xdr:colOff>76200</xdr:colOff><xdr:row>${imagen.fila}</xdr:row><xdr:rowOff>38100</xdr:rowOff></xdr:from>`
    + `<xdr:ext cx="${emuAncho}" cy="${emuAlto}"/>`
    + '<xdr:pic>'
    + '<xdr:nvPicPr><xdr:cNvPr id="1" name="Logo AVISENS"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>'
    + '<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'
    + `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emuAncho}" cy="${emuAlto}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>`
    + '</xdr:pic>'
    + '<xdr:clientData/>'
    + '</xdr:oneCellAnchor>'
    + '</xdr:wsDr>'
}

const ESTILOS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<fonts count="9">'
  + '<font><sz val="11"/><name val="Calibri"/></font>'
  + '<font><b/><sz val="11"/><name val="Calibri"/></font>'
  + '<font><b/><sz val="15"/><color rgb="FF0F172A"/><name val="Calibri"/></font>'
  + '<font><sz val="10"/><color rgb="FF475569"/><name val="Calibri"/></font>'
  + '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
  + '<font><b/><sz val="11"/><color rgb="FF0F766E"/><name val="Calibri"/></font>'
  + '<font><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/></font>'
  + '<font><b/><sz val="10"/><color rgb="FF0F172A"/><name val="Calibri"/></font>'
  + '<font><b/><sz val="9"/><color rgb="FF475569"/><name val="Calibri"/></font>'
  + '</fonts>'
  + '<fills count="7">'
  + '<fill><patternFill patternType="none"/></fill>'
  + '<fill><patternFill patternType="gray125"/></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/></patternFill></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FFF0FDFA"/></patternFill></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill>'
  + '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>'
  + '</fills>'
  + '<borders count="5">'
  + '<border><left/><right/><top/><bottom/><diagonal/></border>'
  + '<border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border>'
  + '<border><left style="thin"><color rgb="FF0F766E"/></left><right style="thin"><color rgb="FF0F766E"/></right><top style="thin"><color rgb="FF0F766E"/></top><bottom style="thin"><color rgb="FF0F766E"/></bottom><diagonal/></border>'
  + '<border><left/><right/><top/><bottom style="medium"><color rgb="FF0F766E"/></bottom><diagonal/></border>'
  + '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="medium"><color rgb="FF0F766E"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>'
  + '</borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="21">'
  // 0..3: estilos base existentes
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  + '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  // 4: bannerTitulo
  + '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>'
  // 5: bannerSubtitulo
  + '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>'
  // 6: cabeceraTabla
  + '<xf numFmtId="0" fontId="4" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
  // 7: subtituloSeccion
  + '<xf numFmtId="0" fontId="5" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>'
  // 8: texto
  + '<xf numFmtId="0" fontId="6" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'
  // 9: textoZebra
  + '<xf numFmtId="0" fontId="6" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'
  // 10: entero
  + '<xf numFmtId="3" fontId="6" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
  // 11: enteroZebra
  + '<xf numFmtId="3" fontId="6" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
  // 12: decimalTabla
  + '<xf numFmtId="2" fontId="6" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
  // 13: decimalZebra
  + '<xf numFmtId="2" fontId="6" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
  // 14: monedaTabla
  + '<xf numFmtId="3" fontId="6" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
  // 15: monedaZebra
  + '<xf numFmtId="3" fontId="6" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
  // 16: totalEtiqueta
  + '<xf numFmtId="0" fontId="7" fillId="5" borderId="4" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>'
  // 17: totalDecimal
  + '<xf numFmtId="2" fontId="7" fillId="5" borderId="4" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
  // 18: totalMoneda
  + '<xf numFmtId="3" fontId="7" fillId="5" borderId="4" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
  // 19: etiquetaMeta
  + '<xf numFmtId="0" fontId="8" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>'
  // 20: valorMeta
  + '<xf numFmtId="0" fontId="6" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>'
  + '</cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + '</styleSheet>'

function partesDelLibro(hojas: HojaXlsx[]): [string, string | Uint8Array][] {
  const nombres = hojas.map((hoja) => nombreDeHoja(hoja.nombre))
  const dibujos: { indiceHoja: number; indiceDibujo: number; imagen: ImagenXlsx }[] = []
  hojas.forEach((hoja, i) => {
    if (hoja.imagen) {
      dibujos.push({ indiceHoja: i + 1, indiceDibujo: dibujos.length + 1, imagen: hoja.imagen })
    }
  })

  const overridesDibujos = dibujos.map((d) => (
    `<Override PartName="/xl/drawings/drawing${d.indiceDibujo}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
  )).join('')
  const tipoPng = dibujos.length > 0 ? '<Default Extension="png" ContentType="image/png"/>' : ''

  const partes: [string, string | Uint8Array][] = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + tipoPng
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + overridesDibujos
      + '</Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + `<sheets>${nombres.map((nombre, i) => `<sheet name="${escaparXml(nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>`
      + '</workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
      + '</Relationships>'],
    ['xl/styles.xml', ESTILOS_XML],
  ]

  hojas.forEach((hoja, i) => {
    const dibujo = dibujos.find((d) => d.indiceHoja === i + 1)
    partes.push([`xl/worksheets/sheet${i + 1}.xml`, hojaXml(hoja, Boolean(dibujo))])
    if (dibujo) {
      partes.push([
        `xl/worksheets/_rels/sheet${i + 1}.xml.rels`,
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${dibujo.indiceDibujo}.xml"/>`
        + '</Relationships>',
      ])
      partes.push([`xl/drawings/drawing${dibujo.indiceDibujo}.xml`, dibujoXml(dibujo.imagen)])
      partes.push([
        `xl/drawings/_rels/drawing${dibujo.indiceDibujo}.xml.rels`,
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${dibujo.indiceDibujo}.png"/>`
        + '</Relationships>',
      ])
      partes.push([`xl/media/image${dibujo.indiceDibujo}.png`, dibujo.imagen.datos])
    }
  })

  return partes
}

// ─── ZIP sin compresión ───

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabla[n] = c >>> 0
  }
  return tabla
})()

export function crc32(datos: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of datos) crc = TABLA_CRC[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// 1980-01-01 00:00 en formato DOS: el ZIP exige una fecha y no importa cuál.
const FECHA_DOS = (0 << 9) | (1 << 5) | 1

export function empaquetarZip(archivos: [string, Uint8Array][]): Uint8Array {
  const codificador = new TextEncoder()
  const locales: Uint8Array[] = []
  const centrales: Uint8Array[] = []
  let desplazamiento = 0

  for (const [nombre, datos] of archivos) {
    const nombreBytes = codificador.encode(nombre)
    const crc = crc32(datos)

    const local = new Uint8Array(30 + nombreBytes.length)
    const vl = new DataView(local.buffer)
    vl.setUint32(0, 0x04034b50, true)
    vl.setUint16(4, 20, true)
    vl.setUint16(6, 0x0800, true) // nombres en UTF-8
    vl.setUint16(8, 0, true) // store
    vl.setUint16(10, 0, true)
    vl.setUint16(12, FECHA_DOS, true)
    vl.setUint32(14, crc, true)
    vl.setUint32(18, datos.length, true)
    vl.setUint32(22, datos.length, true)
    vl.setUint16(26, nombreBytes.length, true)
    local.set(nombreBytes, 30)

    const central = new Uint8Array(46 + nombreBytes.length)
    const vc = new DataView(central.buffer)
    vc.setUint32(0, 0x02014b50, true)
    vc.setUint16(4, 20, true)
    vc.setUint16(6, 20, true)
    vc.setUint16(8, 0x0800, true)
    vc.setUint16(10, 0, true)
    vc.setUint16(12, 0, true)
    vc.setUint16(14, FECHA_DOS, true)
    vc.setUint32(16, crc, true)
    vc.setUint32(20, datos.length, true)
    vc.setUint32(24, datos.length, true)
    vc.setUint16(28, nombreBytes.length, true)
    vc.setUint32(42, desplazamiento, true)
    central.set(nombreBytes, 46)

    locales.push(local, datos)
    centrales.push(central)
    desplazamiento += local.length + datos.length
  }

  const tamanoCentral = centrales.reduce((total, parte) => total + parte.length, 0)
  const fin = new Uint8Array(22)
  const vf = new DataView(fin.buffer)
  vf.setUint32(0, 0x06054b50, true)
  vf.setUint16(8, archivos.length, true)
  vf.setUint16(10, archivos.length, true)
  vf.setUint32(12, tamanoCentral, true)
  vf.setUint32(16, desplazamiento, true)

  const partes = [...locales, ...centrales, fin]
  const salida = new Uint8Array(partes.reduce((total, parte) => total + parte.length, 0))
  let posicion = 0
  for (const parte of partes) {
    salida.set(parte, posicion)
    posicion += parte.length
  }
  return salida
}

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function crearLibroXlsx(hojas: HojaXlsx[]): Uint8Array {
  const codificador = new TextEncoder()
  return empaquetarZip(
    partesDelLibro(hojas).map(([nombre, contenido]) => [
      nombre,
      typeof contenido === 'string' ? codificador.encode(contenido) : contenido,
    ]),
  )
}

let cacheLogoAvisens: Uint8Array | null | undefined

/** Descarga y cachea el logo PNG de AVISENS para incrustarlo en reportes Excel. */
export async function cargarLogoAvisens(): Promise<Uint8Array | null> {
  if (cacheLogoAvisens !== undefined) return cacheLogoAvisens
  try {
    const respuesta = await fetch('/logo-avisens.png')
    if (!respuesta.ok) {
      cacheLogoAvisens = null
      return null
    }
    cacheLogoAvisens = new Uint8Array(await respuesta.arrayBuffer())
    return cacheLogoAvisens
  } catch {
    cacheLogoAvisens = null
    return null
  }
}
