/**
 * El calendario de la granja, no el del servidor.
 *
 * El servidor corre en UTC. Colombia va cinco horas atrás, así que entre las
 * 19:00 y la medianoche el servidor ya cambió de día y la granja no. Restar
 * milisegundos y dividir entre 24 h arrastra ese desfase: el job de las 02:00
 * UTC —las 21:00 en la granja— estampaba la fila con la fecha de mañana.
 *
 * Contar días de calendario en la zona de la granja lo evita, y de paso no
 * depende de que el servidor siga estando en UTC.
 */
export const ZONA_GRANJA = 'America/Bogota';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const formateador = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_GRANJA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** El día del calendario de la granja, como 'AAAA-MM-DD'. */
export function fechaEnZonaGranja(instante: Date = new Date()): string {
  return formateador.format(instante);
}

/**
 * Medianoche del día de la granja, para estampar columnas @db.Date.
 *
 * Se devuelve como medianoche UTC del mismo número de día: una columna DATE
 * no guarda hora, así que lo que importa es que el día sea el de la granja.
 */
export function inicioDelDiaEnZonaGranja(instante: Date = new Date()): Date {
  return new Date(`${fechaEnZonaGranja(instante)}T00:00:00.000Z`);
}

/**
 * Día de vida del lote, contando el día de ingreso como el 1.
 *
 * Se comparan días de calendario, no duraciones: dos fechas seguidas son
 * siempre un día de diferencia, sin importar a qué hora se pregunte.
 */
export function diaDeVida(
  fechaIngreso: Date,
  ahora: Date = new Date(),
): number {
  // fecha_ingreso es @db.Date: una fecha del calendario, sin hora. Prisma la
  // entrega como medianoche UTC, y eso NO es un instante que haya que mover a
  // otra zona — pasarla por la zona de la granja la correría un día hacia
  // atrás, porque medianoche UTC son las 19:00 del día anterior en Colombia.
  // Se toma su día tal cual. Lo que sí es un instante es `ahora`.
  const ingreso = Date.UTC(
    fechaIngreso.getUTCFullYear(),
    fechaIngreso.getUTCMonth(),
    fechaIngreso.getUTCDate(),
  );
  const hoy = inicioDelDiaEnZonaGranja(ahora).getTime();
  const dias = Math.round((hoy - ingreso) / MS_POR_DIA);
  return dias + 1;
}

/**
 * Semana de vida, empezando en 0, que es como están sembrados los umbrales.
 *
 * El -1 es lo que hace que cada semana dure siete días: con el día empezando
 * en 1, dividir directo metería el día 7 en la semana siguiente y la primera
 * duraría seis.
 */
export function semanaDeVida(dia: number): number {
  return Math.max(0, Math.floor((dia - 1) / 7));
}

/**
 * Inversa de diaDeVida: la fecha de calendario en que cae un día de vida dado.
 *
 * fecha_ingreso es @db.Date (medianoche UTC, sin hora que mover de zona), y el
 * resultado también es una fecha de calendario pura: se opera sobre los
 * componentes UTC de fechaIngreso, igual que diaDeVida, para no correrla un
 * día por culpa del huso horario de la granja.
 *
 * Admite diaVida = 0: el día anterior al ingreso. Fase 2A lo usa como corte
 * de un lote que todavía no ha ingresado (dia_corte = 0, planificación antes
 * de recibir las aves) — no es un caso especial, sale de la misma resta.
 */

export function fechaDeVida(fechaIngreso: Date, diaVida: number): Date {
  const ingreso = Date.UTC(
    fechaIngreso.getUTCFullYear(),
    fechaIngreso.getUTCMonth(),
    fechaIngreso.getUTCDate(),
  );
  return new Date(ingreso + (diaVida - 1) * MS_POR_DIA);
}

/**
 * Día de vida en que cae una fecha de calendario dada (p. ej. la fecha de un
 * RegistroMortalidad). Inversa de fechaDeVida, con la misma disciplina: las
 * DOS fechas son @db.Date (componentes UTC puros), nunca un instante que
 * haya que mover a la zona de la granja. Para eso está diaDeVida(ingreso,
 * ahora) — su segundo argumento sí es un instante real.
 *
 * Puede devolver 0 o negativo: una fecha anterior al ingreso no es un error
 * de esta función, es un dato que el llamador debe rechazar (ver Fase 2A,
 * caso mortalidad_antes_del_ingreso).
 */
export function diaDeVidaDeFecha(fechaIngreso: Date, fecha: Date): number {
  const ingreso = Date.UTC(
    fechaIngreso.getUTCFullYear(),
    fechaIngreso.getUTCMonth(),
    fechaIngreso.getUTCDate(),
  );
  const otra = Date.UTC(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth(),
    fecha.getUTCDate(),
  );
  return Math.round((otra - ingreso) / MS_POR_DIA) + 1;
}
