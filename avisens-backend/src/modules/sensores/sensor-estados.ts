// Estados válidos de un sensor. Sin enum en la base de datos, el DTO es la
// única defensa contra valores inventados ("banana" se guardaría sin esto).
export const ESTADOS_SENSOR = [
  'activo',
  'inactivo',
  'mantenimiento',
  'falla',
] as const;

export type EstadoSensor = (typeof ESTADOS_SENSOR)[number];
