export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency }).format(value)
}

export function formatNumber(value: number): string {
  return value.toLocaleString('es-CO')
}
