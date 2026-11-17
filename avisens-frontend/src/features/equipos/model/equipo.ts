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

// HU-37 · escenario 2: un equipo que llega al 95 % de su vida útil debe
// programar mantenimiento antes de fallar. El aviso diario por correo es del
// backend; aquí se marca en la tabla y en el panel del galpón.
export const UMBRAL_MANTENIMIENTO = 95

export function requiereMantenimiento(desgaste: number | null): boolean {
  return desgaste !== null && desgaste >= UMBRAL_MANTENIMIENTO
}

type EquipoConDesgaste = {
  estado_actual: string
  horas_operacion: number | null
  vida_util_horas: number | null
}

// Los dados de baja o ya en mantenimiento no cuentan: no hay nada que programar.
export function equiposPorMantener<T extends EquipoConDesgaste>(equipos: T[]): T[] {
  return equipos.filter((equipo) =>
    equipo.estado_actual === 'operativo'
    && requiereMantenimiento(porcentajeDesgaste(equipo.horas_operacion, equipo.vida_util_horas)),
  )
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  operativo: 'Operativo',
  en_mantenimiento: 'En mantenimiento',
  averiado: 'Averiado',
  baja: 'De baja',
}

export function etiquetaEstadoEquipo(estado: string): string {
  return ETIQUETAS_ESTADO[estado] ?? estado
}
