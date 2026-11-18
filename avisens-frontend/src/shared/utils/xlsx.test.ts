import { describe, expect, it } from 'vitest'
import { columnaExcel, crc32, crearLibroXlsx, empaquetarZip, nombreDeHoja } from './xlsx'

const decodificar = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

describe('xlsx', () => {
  it('calcula el CRC-32 estándar', () => {
    // Valor de referencia del CRC-32 para «123456789».
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('nombra columnas como Excel', () => {
    expect(columnaExcel(0)).toBe('A')
    expect(columnaExcel(25)).toBe('Z')
    expect(columnaExcel(26)).toBe('AA')
    expect(columnaExcel(701)).toBe('ZZ')
  })

  it('limpia nombres de hoja que Excel rechazaría', () => {
    expect(nombreDeHoja('Lotes/2026: [ciclo]')).toBe('Lotes 2026   ciclo')
    expect(nombreDeHoja('x'.repeat(40))).toHaveLength(31)
    expect(nombreDeHoja('   ')).toBe('Hoja')
  })

  it('empaqueta un ZIP con firma, directorio central y cierre', () => {
    const zip = empaquetarZip([['a.txt', new TextEncoder().encode('hola')]])
    const vista = new DataView(zip.buffer)
    expect(vista.getUint32(0, true)).toBe(0x04034b50)
    expect(vista.getUint32(zip.length - 22, true)).toBe(0x06054b50)
    expect(vista.getUint16(zip.length - 22 + 10, true)).toBe(1)
  })

  it('arma un libro con hojas, textos escapados, números y estilos', () => {
    const libro = crearLibroXlsx([
      {
        nombre: 'Resumen',
        filas: [
          [{ valor: 'Concepto', estilo: 'titulo' }, 'Valor'],
          ['Ingresos & ventas <aves>', { valor: 1500000, estilo: 'moneda' }],
          ['Sin dato', null],
        ],
      },
      { nombre: 'Lotes', filas: [['L-001']] },
    ])
    const texto = decodificar(libro)

    expect(texto).toContain('xl/worksheets/sheet2.xml')
    expect(texto).toContain('<sheet name="Lotes" sheetId="2" r:id="rId2"/>')
    expect(texto).toContain('<c r="A1" t="inlineStr" s="1">')
    expect(texto).toContain('Ingresos &amp; ventas &lt;aves&gt;')
    expect(texto).toContain('<c r="B2" s="2"><v>1500000</v></c>')
    // Una celda nula no se escribe.
    expect(texto).toContain('<row r="3"><c r="A3" t="inlineStr"><is><t xml:space="preserve">Sin dato</t></is></c></row>')
  })
})
