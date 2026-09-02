// Días de vida de un lote.
//
// Dos trampas que ya costaron caro y por eso esto vive en un solo sitio:
//
// 1. `fecha_ingreso` es una columna de solo fecha, y llega como '2026-08-12'.
//    `new Date` la interpreta como medianoche UTC, mientras que `Date.now()`
//    es hora local. Restando milisegundos, en Colombia (UTC-5) la diferencia
//    cruza las 24 h a las 7 p.m. del mismo día de ingreso: el contador
//    avanzaba un día cada tarde en vez de a medianoche.
//
// 2. `semanaVida = Math.floor(diaVida / 7)` elige el umbral ambiental del
//    galpón. Un día de más adelanta el cambio de semana, así que las alertas
//    empezaban a compararse contra el rango de la semana siguiente antes de
//    tiempo.
//
// Se comparan días de calendario en hora local, que es como los cuenta quien
// trabaja en la granja. La convención es la del backend —el día de ingreso es
// el día 0— para que la pantalla muestre lo mismo con o sin indicadores
// calculados.

function aMedianocheLocal(fecha: Date): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime()
}

// Una fecha de solo día ('2026-08-12') se ancla al día local, no a UTC.
function interpretarFecha(valor: string): Date | null {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor)
  const fecha = new Date(soloFecha ? `${valor}T00:00:00` : valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export function diasDeVida(fechaIngreso: string, ahora: Date = new Date()): number {
  const inicio = interpretarFecha(fechaIngreso)
  if (inicio === null) return 0
  const dias = Math.round((aMedianocheLocal(ahora) - aMedianocheLocal(inicio)) / 86_400_000)
  return Math.max(dias, 0)
}

// La semana de vida con la que se busca el umbral del galpón.
export function semanaDeVida(diaVida: number): number {
  return Math.floor(Math.max(diaVida, 0) / 7)
}
