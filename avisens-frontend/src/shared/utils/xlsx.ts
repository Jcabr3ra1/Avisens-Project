// Libro de Excel (.xlsx) armado en el navegador, sin librerías.
//
// Un .xlsx es un ZIP de unos pocos XML. Para un reporte de tablas basta con
// texto y números, así que se escriben esos XML a mano y se empaquetan sin
// compresión (método "store"): Excel, LibreOffice y Google Sheets lo abren
// igual y no hay que cargar una dependencia de cientos de KB por un botón.

export type EstiloCelda = 'titulo' | 'moneda' | 'decimal'

export interface Celda {
  valor: string | number | null
  estilo?: EstiloCelda
}

export type ValorCelda = string | number | null | Celda

export interface HojaXlsx {
  nombre: string
  filas: ValorCelda[][]
  /** Ancho de cada columna, en caracteres. */
  anchos?: number[]
}

// Índices de cellXfs en styles.xml: 0 normal, 1 negrita, 2 #,##0, 3 0.00.
const INDICE_ESTILO: Record<EstiloCelda, number> = { titulo: 1, moneda: 2, decimal: 3 }

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
  if (celda.valor === null || celda.valor === '') return ''
  const estilo = celda.estilo ? ` s="${INDICE_ESTILO[celda.estilo]}"` : ''
  if (typeof celda.valor === 'number' && Number.isFinite(celda.valor)) {
    return `<c r="${referencia}"${estilo}><v>${celda.valor}</v></c>`
  }
  return `<c r="${referencia}" t="inlineStr"${estilo}><is><t xml:space="preserve">${escaparXml(String(celda.valor))}</t></is></c>`
}

function hojaXml(hoja: HojaXlsx): string {
  const columnas = hoja.anchos?.length
    ? `<cols>${hoja.anchos.map((ancho, i) => `<col min="${i + 1}" max="${i + 1}" width="${ancho}" customWidth="1"/>`).join('')}</cols>`
    : ''
  const filas = hoja.filas.map((fila, i) => {
    const celdas = fila.map((valor, j) => celdaXml(valor, `${columnaExcel(j)}${i + 1}`)).join('')
    return `<row r="${i + 1}">${celdas}</row>`
  }).join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `${columnas}<sheetData>${filas}</sheetData></worksheet>`
}

const ESTILOS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
  + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="4">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  + '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '</cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + '</styleSheet>'

function partesDelLibro(hojas: HojaXlsx[]): [string, string][] {
  const nombres = hojas.map((hoja) => nombreDeHoja(hoja.nombre))
  return [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
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
    ...hojas.map((hoja, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, hojaXml(hoja)]),
  ]
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
    partesDelLibro(hojas).map(([nombre, xml]) => [nombre, codificador.encode(xml)]),
  )
}
