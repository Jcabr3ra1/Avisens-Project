export const MAX_BYTES_FOTO = 3 * 1024 * 1024

export const TIPOS_FOTO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const

export function validarArchivoFoto(archivo: File): string | null {
  if (!TIPOS_FOTO_PERMITIDOS.includes(archivo.type as (typeof TIPOS_FOTO_PERMITIDOS)[number])) {
    return 'Solo se permiten fotografías en formato JPG, PNG o WebP.'
  }
  if (archivo.size === 0) {
    return 'El archivo seleccionado está vacío.'
  }
  if (archivo.size > MAX_BYTES_FOTO) {
    return 'La fotografía supera el tamaño máximo permitido de 3 MB.'
  }
  return null
}
