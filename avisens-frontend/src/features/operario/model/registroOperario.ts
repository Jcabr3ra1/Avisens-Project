// Validación de los registros rápidos de Mi jornada (mortalidad y consumo).
// Caso CP-03 de la auditoría QA 2026-10-30: no aceptar negativos, letras ni
// decimales en las aves, ni fechas futuras. Devuelve el mensaje de error o
// null si el dato es válido.

export function validarFechaRegistro(fecha: string, hoy: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return 'Indica la fecha del registro.'
  if (fecha > hoy) return 'La fecha no puede ser posterior a hoy.'
  return null
}

export function validarMortalidad(cantidad: string, avesDelLote: number): string | null {
  const texto = cantidad.trim()
  if (!texto) return 'Indica cuántas aves fallecieron.'
  if (!/^\d+$/.test(texto)) return 'Las aves fallecidas se cuentan en números enteros, sin decimales ni signos.'
  const numero = Number(texto)
  if (numero < 1) return 'Indica al menos un ave.'
  if (numero > avesDelLote) {
    return `No puede superar las ${avesDelLote.toLocaleString('es-CO')} aves con que inició el lote.`
  }
  return null
}

function validarCantidadOpcional(valor: string, nombre: string): string | null {
  const texto = valor.trim()
  if (!texto) return null
  const numero = Number(texto)
  if (!Number.isFinite(numero)) return `${nombre} debe ser un número.`
  if (numero <= 0) return `${nombre} debe ser mayor que cero.`
  return null
}

export function validarConsumo(alimento: string, agua: string): string | null {
  if (!alimento.trim() && !agua.trim()) return 'Indica al menos el alimento o el agua consumida.'
  return validarCantidadOpcional(alimento, 'El alimento') ?? validarCantidadOpcional(agua, 'El agua')
}
