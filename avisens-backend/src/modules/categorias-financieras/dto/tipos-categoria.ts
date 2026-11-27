/**
 * Los dos lados del balance.
 *
 * La columna es opcional en el modelo: una categoría sin tipo sirve para las
 * dos cosas, y por eso el filtro por tipo la deja fuera en vez de adivinar.
 */
export const TIPOS_CATEGORIA = ['ingreso', 'egreso'] as const;

export type TipoCategoria = (typeof TIPOS_CATEGORIA)[number];
