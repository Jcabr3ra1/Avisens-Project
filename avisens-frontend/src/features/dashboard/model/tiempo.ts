export const LECTURA_VIGENTE_MIN = 30

const MINUTO = 60_000

export function tiempoRelativo(ts: number, ahora: number = Date.now()): string {
  const minutos = Math.floor(Math.max(0, ahora - ts) / MINUTO)
  if (minutos < 1) return 'hace un momento'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return horas === 1 ? 'hace 1 hora' : `hace ${horas} horas`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'ayer' : `hace ${dias} días`
}

export function lecturaVigente(ts: number | null, ahora: number = Date.now()): boolean {
  return ts !== null && ahora - ts <= LECTURA_VIGENTE_MIN * MINUTO
}

export function saludoDelDia(hora: number): string {
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
