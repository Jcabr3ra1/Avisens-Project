export type DatosEquipo = {
  codigo: string
  nombre: string
  tipo: string
  modelo: string
  fabricante: string
  serial: string
  fecha_instalacion: string
  vida_util_horas: string
  costo_cop: string
  es_actuador: boolean
}

export const FORMULARIO_EQUIPO_INICIAL: DatosEquipo = {
  codigo: '',
  nombre: '',
  tipo: '',
  modelo: '',
  fabricante: '',
  serial: '',
  fecha_instalacion: '',
  vida_util_horas: '',
  costo_cop: '',
  es_actuador: false,
}

export const ESTADOS_EQUIPO = ['operativo', 'en_mantenimiento', 'averiado', 'baja']

// Los números llegan del formulario como texto. Un campo vacío no es 0: es
// "no lo sé", y mandar 0 falsearía la vida útil o el costo del equipo.
export function numeroOpcional(valor: string): number | undefined {
  const limpio = valor.trim()
  if (limpio === '') return undefined
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : undefined
}

// El desgaste solo se puede calcular si el equipo declara su vida útil.
export function porcentajeDesgaste(
  horasOperacion: number | null,
  vidaUtilHoras: number | null,
): number | null {
  if (!vidaUtilHoras || vidaUtilHoras <= 0) return null
  return Math.min(100, Math.round(((horasOperacion ?? 0) / vidaUtilHoras) * 100))
}
