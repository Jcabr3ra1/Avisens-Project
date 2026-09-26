// El navegador no puede guardar un Blob directamente: hace falta una URL
// temporal y un enlace que se pulse solo. Se revoca después porque si no el
// Blob se queda en memoria mientras dure la pestaña.
export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}

export function nombreConFecha(base: string, extension: string): string {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${base}-${ahora.getFullYear()}-${mes}-${dia}.${extension}`
}
