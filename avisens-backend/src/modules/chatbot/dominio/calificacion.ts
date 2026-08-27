// Fuente unica de verdad de las opciones que califican.
//
// Antes el texto de cada opcion vivia en tres sitios a la vez: el seed que lo
// muestra, la matriz que le asigna puntaje y las constantes del servicio que
// deciden reglas de negocio (SIN_SENAL, NO_DECIDE, DOLOR). Cambiar una coma en
// una de ellas rompia el puntaje o una regla sin que fallara nada: el
// cuestionario seguia funcionando y calificaba mal.
//
// Ahora el texto se declara una vez y de aqui salen los tres. Si se reescribe
// una opcion, se reescribe en todas partes a la vez.

export interface OpcionCalificada {
  texto: string;
  puntaje: number;
}

// ---------------------------------------------------------------------------
// Puntaje comercial (12 puntos)
// ---------------------------------------------------------------------------
// Se pesa por dimension, no por pregunta: la necesidad manda sobre todo lo
// demas, y la autoridad importa mas que la forma de pago. Antes las siete
// preguntas repartian 16 puntos por igual, mezclando "puede comprar" con
// "podemos instalarselo".

export const DIMENSIONES = {
  NECESIDAD: 4,
  PRESUPUESTO: 3,
  URGENCIA: 3,
  AUTORIDAD: 2,
} as const;

export const PUNTAJE_MAXIMO =
  DIMENSIONES.NECESIDAD +
  DIMENSIONES.PRESUPUESTO +
  DIMENSIONES.URGENCIA +
  DIMENSIONES.AUTORIDAD;

// NECESIDAD — el dolor real pesa mas que cualquier otra cosa
export const A16_MORTALIDAD: OpcionCalificada[] = [
  { texto: 'Sí, varias veces', puntaje: 3 },
  { texto: 'Sí, una vez', puntaje: 2 },
  { texto: 'No', puntaje: 0 },
  { texto: 'No sabría decir', puntaje: 0 },
];

export const A14_DOLOR: OpcionCalificada[] = [
  { texto: 'Mortalidad por calor o frío', puntaje: 1 },
  { texto: 'Consumo de alimento descontrolado', puntaje: 1 },
  { texto: 'Humedad y amoniaco', puntaje: 1 },
  { texto: 'Enfermedades respiratorias', puntaje: 1 },
  { texto: 'Nada en particular', puntaje: 0 },
];

// PRESUPUESTO — saber como quiere pagar vale mas que no tenerlo claro
export const A18_PAGO: OpcionCalificada[] = [
  { texto: 'Comprarlo de una vez', puntaje: 3 },
  { texto: 'Pagar mensual', puntaje: 3 },
  { texto: 'Lo que salga mejor', puntaje: 1 },
  { texto: 'Todavía no sé', puntaje: 0 },
];

// URGENCIA — quien ya pidio cotizaciones esta comprando ahora
export const A19_URGENCIA: OpcionCalificada[] = [
  { texto: 'Ya tengo otras cotizaciones', puntaje: 3 },
  { texto: 'Estoy comparando', puntaje: 1 },
  { texto: 'Solo los estoy viendo a ustedes', puntaje: 0 },
  { texto: 'No sé qué más hay', puntaje: 0 },
];

// AUTORIDAD — antes no sumaba nada, solo enrutaba a callback
export const A20_DECIDE: OpcionCalificada[] = [
  { texto: 'Sí, yo decido', puntaje: 2 },
  { texto: 'No, decide otra persona', puntaje: 0 },
];

export const OPCIONES_CALIFICADAS: Record<string, OpcionCalificada[]> = {
  A16: A16_MORTALIDAD,
  A14: A14_DOLOR,
  A18: A18_PAGO,
  A19: A19_URGENCIA,
  A20: A20_DECIDE,
};

// ---------------------------------------------------------------------------
// Viabilidad tecnica (semaforo, sin puntaje)
// ---------------------------------------------------------------------------
// Estas tres no dicen si alguien quiere comprar, sino si podemos instalarle.
// Antes restaban puntos comerciales: un ganadero con 20.000 aves y un dolor
// enorme se enfriaba solo porque su galpon estaba viejo. Eso no es un
// prospecto frio, es uno caliente con una obra previa.

export const A9_GALPON = {
  BUENO: 'En buen estado',
  DETERIORADO: 'Construidos pero deteriorados',
  SIN_CONSTRUIR: 'Todavía sin construir',
} as const;

export const A11_ENERGIA = {
  ESTABLE: 'Estable todo el día',
  CON_PLANTA: 'Se va, pero tengo planta',
  SOLO_PLANTA: 'Solo planta eléctrica',
  INESTABLE: 'Muy inestable',
} as const;

export const A13_INTERNET = {
  ESTABLE: 'Sí, estable',
  INTERMITENTE: 'Sí, pero se cae a ratos',
  SIN_SENAL: 'No hay señal',
} as const;

export type Viabilidad = 'instalable' | 'requiere_adecuacion' | 'no_viable';

export function viabilidadTecnica(
  galpon?: string | null,
  energia?: string | null,
  internet?: string | null,
): Viabilidad {
  // Sin galpon o sin forma de dar energia no hay nada que instalar todavia.
  if (
    galpon === A9_GALPON.SIN_CONSTRUIR ||
    energia === A11_ENERGIA.INESTABLE
  ) {
    return 'no_viable';
  }
  if (
    galpon === A9_GALPON.BUENO &&
    energia === A11_ENERGIA.ESTABLE &&
    internet === A13_INTERNET.ESTABLE
  ) {
    return 'instalable';
  }
  return 'requiere_adecuacion';
}

// ---------------------------------------------------------------------------
// Reglas de negocio que dependen del texto de una opcion
// ---------------------------------------------------------------------------
// Se derivan de las listas de arriba en vez de repetir el texto a mano.

export const SIN_SENAL = A13_INTERNET.SIN_SENAL;
export const NO_DECIDE = A20_DECIDE[1].texto;
export const DOLOR = A16_MORTALIDAD.filter((o) => o.puntaje > 0).map(
  (o) => o.texto,
);

/**
 * Hay dolor si perdio aves por ambiente o si declara un problema concreto.
 *
 * Ojo con A14: cuando era texto libre bastaba con que hubiera escrito algo,
 * pero ahora es una lista con la opcion "Nada en particular", que significa
 * justo lo contrario. Se mira el puntaje, no si la respuesta viene llena.
 */
export function tieneDolor(a16?: string | null, a14?: string | null): boolean {
  const punteaA16 =
    (A16_MORTALIDAD.find((o) => o.texto === a16)?.puntaje ?? 0) > 0;
  const punteaA14 = (A14_DOLOR.find((o) => o.texto === a14)?.puntaje ?? 0) > 0;
  return punteaA16 || punteaA14;
}

/** Los textos que se le muestran a la persona, en orden. */
export function textosDe(opciones: OpcionCalificada[]): string[] {
  return opciones.map((o) => o.texto);
}
