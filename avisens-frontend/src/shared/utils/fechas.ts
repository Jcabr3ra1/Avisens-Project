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
// trabaja en la granja. El día de ingreso es el DÍA 1, no el 0: es la
// convención de la avicultura y la que usan las curvas objetivo, sembradas en
// los días 7, 14, 21, 28, 35 y 42. Con el día empezando en 0 la búsqueda de
// la curva (`dia <= dia_vida`) no encontraba nada durante toda la primera
// semana.

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
  if (inicio === null) return 1
  const dias = Math.round((aMedianocheLocal(ahora) - aMedianocheLocal(inicio)) / 86_400_000)
  return Math.max(dias + 1, 1)
}

// La semana de vida con la que se busca el umbral del galpón. Se resta uno
// antes de dividir porque el día de vida empieza en 1: sin eso el día 7
// caería ya en la semana siguiente y la primera duraría seis días.
export function semanaDeVida(diaVida: number): number {
  return Math.floor(Math.max(diaVida - 1, 0) / 7)
}

// El día de hoy en formato 'YYYY-MM-DD', tomado del calendario local.
//
// `new Date().toISOString().slice(0, 10)` da el día en UTC: en Colombia, a
// partir de las 7 p.m. devuelve el de mañana. Eso ponía la fecha del día
// siguiente por defecto en los formularios de bitácora, consumos y jornada
// del operario — justo en la franja en que se trabaja en la granja — y hacía
// que un registro quedara archivado en el día equivocado.
export function fechaDeHoy(ahora: Date = new Date()): string {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}
