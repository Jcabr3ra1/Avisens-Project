export const VARIABLES_AMBIENTALES = [
  'temperatura',
  'humedad',
  'luminosidad',
] as const;

// La escala vive en common: la comparten alertas, políticas y umbrales.
export { CRITICIDADES } from '../../common/criticidad/criticidad';
