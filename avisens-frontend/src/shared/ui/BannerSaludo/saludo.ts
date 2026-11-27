export type FaseBanner = 'amanecer' | 'dia' | 'tarde' | 'noche'

export function saludoSegunHora(hora = new Date().getHours()): string {
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function faseSegunHora(hora = new Date().getHours()): FaseBanner {
  if (hora >= 5 && hora < 8) return 'amanecer'
  if (hora >= 8 && hora < 17) return 'dia'
  if (hora >= 17 && hora < 20) return 'tarde'
  return 'noche'
}
