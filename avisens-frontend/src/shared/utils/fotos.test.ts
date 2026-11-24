import { describe, expect, it } from 'vitest'
import { MAX_BYTES_FOTO, validarArchivoFoto } from './fotos'

function archivoFalso(tipo: string, tamano: number): File {
  return { type: tipo, size: tamano, name: 'prueba.jpg' } as File
}

describe('validarArchivoFoto', () => {
  it('acepta JPG, PNG y WebP dentro del límite', () => {
    expect(validarArchivoFoto(archivoFalso('image/jpeg', 1024))).toBeNull()
    expect(validarArchivoFoto(archivoFalso('image/png', 2048))).toBeNull()
    expect(validarArchivoFoto(archivoFalso('image/webp', 4096))).toBeNull()
  })

  it('rechaza formatos no permitidos', () => {
    expect(validarArchivoFoto(archivoFalso('image/svg+xml', 512))).toContain('JPG, PNG o WebP')
    expect(validarArchivoFoto(archivoFalso('application/pdf', 512))).toContain('JPG, PNG o WebP')
  })

  it('rechaza archivos vacíos o mayores a 3 MB', () => {
    expect(validarArchivoFoto(archivoFalso('image/jpeg', 0))).toContain('vacío')
    expect(validarArchivoFoto(archivoFalso('image/jpeg', MAX_BYTES_FOTO + 1))).toContain('3 MB')
  })
})
