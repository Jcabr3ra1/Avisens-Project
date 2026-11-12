// Texto corto para «hace cuánto» se actualizó una pantalla. Lo usa el botón
// Actualizar para confirmar que la petición de verdad se hizo (auditoría QA
// 2026-10-30, punto 5 del plan de acción).
export function haceCuanto(desde: Date, ahora: Date = new Date()): string {
  const segundos = Math.max(0, Math.floor((ahora.getTime() - desde.getTime()) / 1000))
  if (segundos < 5) return 'justo ahora'
  if (segundos < 60) return `hace ${segundos} s`
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  return horas === 1 ? 'hace 1 hora' : `hace ${horas} horas`
}
