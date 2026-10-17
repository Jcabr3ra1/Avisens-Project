export const CATEGORIAS_PQRS = [
  'Petición',
  'Queja',
  'Reclamo',
  'Sugerencia',
  'Felicitación',
] as const;

export type CategoriaPqrs = (typeof CATEGORIAS_PQRS)[number];

export const ESTADOS_PQRS = [
  'abierta',
  'en_proceso',
  'resuelta',
  'cerrada',
] as const;

export type EstadoPqrs = (typeof ESTADOS_PQRS)[number];

export const HORAS_POR_CATEGORIA: Record<CategoriaPqrs, number | null> = {
  Reclamo: 24,
  Queja: 48,
  Petición: 48,
  Sugerencia: null,
  Felicitación: null,
};

const TRANSICIONES: Record<EstadoPqrs, EstadoPqrs[]> = {
  abierta: ['en_proceso', 'resuelta'],
  en_proceso: ['resuelta'],
  resuelta: ['en_proceso', 'cerrada'],
  cerrada: [],
};

const MS_POR_HORA = 3_600_000;

export function fechaLimite(desde: Date, horas: number | null): Date | null {
  return horas === null ? null : new Date(desde.getTime() + horas * MS_POR_HORA);
}

export function horasDeCategoria(categoria: string): number | null {
  return categoria in HORAS_POR_CATEGORIA
    ? HORAS_POR_CATEGORIA[categoria as CategoriaPqrs]
    : 48;
}

export function puedeTransitar(desde: string, hacia: string): boolean {
  if (desde === hacia) return desde !== 'cerrada';
  return (TRANSICIONES[desde as EstadoPqrs] ?? []).includes(hacia as EstadoPqrs);
}
