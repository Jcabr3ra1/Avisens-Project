import type { LecturaClima } from '@features/clima/api/clima'
import { climaVisual, type ClimaVisual } from '@features/granjas/propietario/climaVisual'

const HORAS_VIGENTE = 6

const CONDICION: Record<ClimaVisual, string> = {
  despejado: 'Despejado',
  nublado: 'Nublado',
  lluvia: 'Lluvia',
}

const entero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export function lecturaReciente(lecturas: LecturaClima[], ahora: number = Date.now()): LecturaClima | null {
  const ultima = lecturas.reduce<LecturaClima | null>(
    (actual, lectura) => (actual === null || lectura.fecha_hora > actual.fecha_hora ? lectura : actual),
    null,
  )
  if (!ultima) return null
  const edad = ahora - new Date(ultima.fecha_hora).getTime()
  return Number.isFinite(edad) && edad <= HORAS_VIGENTE * 3_600_000 ? ultima : null
}

export function fraseClima(lecturas: LecturaClima[], ahora: number = Date.now()): string | null {
  const lectura = lecturaReciente(lecturas, ahora)
  if (!lectura) return null
  const condicion = CONDICION[climaVisual([lectura], ahora)]
  return lectura.temperatura === null
    ? `Exterior: ${condicion}`
    : `Exterior: ${entero.format(lectura.temperatura)} °C · ${condicion}`
}
