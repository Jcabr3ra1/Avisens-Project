// Fuente unica de verdad de las opciones que califican.
//
// Antes el texto de cada opcion vivia en tres sitios a la vez: el seed que lo
// muestra, la matriz que le asigna puntaje y las constantes del servicio que
// deciden reglas de negocio (NO_DECIDE, DOLOR). Cambiar una coma en
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
  MOMENTO_DE_COMPRA: 3,
  AUTORIDAD: 2,
} as const;

export const PUNTAJE_MAXIMO =
  DIMENSIONES.NECESIDAD +
  DIMENSIONES.PRESUPUESTO +
  DIMENSIONES.MOMENTO_DE_COMPRA +
  DIMENSIONES.AUTORIDAD;

// Los textos tienen tope de largo por como los pinta WhatsApp: un boton se
// trunca pasados 20 caracteres y una fila de lista pasados 24. Si una sola
// opcion se pasa, la pregunta entera cae a texto numerado y la persona tiene
// que escribir "3" en vez de tocar. Al cambiarlos hay que mirar tambien la
// migracion que los lleva a la base: el seed no corre en produccion.

// NECESIDAD — el dolor real pesa mas que cualquier otra cosa
export const A16_MORTALIDAD: OpcionCalificada[] = [
  { texto: 'Sí, varias veces', puntaje: 3 },
  { texto: 'Sí, una vez', puntaje: 2 },
  { texto: 'No', puntaje: 0 },
  { texto: 'No sabría decir', puntaje: 0 },
];

export const A14_DOLOR: OpcionCalificada[] = [
  { texto: 'Muertes por calor o frío', puntaje: 1 },
  { texto: 'Consumo de alimento', puntaje: 1 },
  { texto: 'Humedad y amoniaco', puntaje: 1 },
  { texto: 'Problemas respiratorios', puntaje: 1 },
  { texto: 'Nada en particular', puntaje: 0 },
];

// PRESUPUESTO — saber como quiere pagar vale mas que no tenerlo claro
export const A18_PAGO: OpcionCalificada[] = [
  { texto: 'Comprarlo de una vez', puntaje: 3 },
  { texto: 'Pagar mensual', puntaje: 3 },
  { texto: 'Lo que salga mejor', puntaje: 1 },
  { texto: 'Todavía no sé', puntaje: 0 },
];

// MOMENTO_DE_COMPRA — quien ya pidio cotizaciones esta comprando ahora.
// No es la T de BANT: no pregunta para cuando lo necesita, sino si ya hay
// otros vendedores en la mesa. Se llamaba URGENCIA, que prometia un plazo
// que estas opciones no miden.
export const A19_MOMENTO: OpcionCalificada[] = [
  { texto: 'Ya tengo cotizaciones', puntaje: 3 },
  { texto: 'Estoy comparando', puntaje: 1 },
  { texto: 'Solo a ustedes', puntaje: 0 },
  { texto: 'No sé qué más hay', puntaje: 0 },
];

// AUTORIDAD — antes no sumaba nada, solo enrutaba a callback
export const A20_DECIDE: OpcionCalificada[] = [
  { texto: 'Sí, yo decido', puntaje: 2 },
  { texto: 'Decide otra persona', puntaje: 0 },
];

export const OPCIONES_CALIFICADAS: Record<string, OpcionCalificada[]> = {
  A16: A16_MORTALIDAD,
  A14: A14_DOLOR,
  A18: A18_PAGO,
  A19: A19_MOMENTO,
  A20: A20_DECIDE,
};

// ---------------------------------------------------------------------------
// Viabilidad tecnica (semaforo, sin puntaje)
// ---------------------------------------------------------------------------
// Estas tres no dicen si alguien quiere comprar, sino si podemos instalarle.
// Antes restaban puntos comerciales: un ganadero con 20.000 aves y un dolor
// enorme se enfriaba solo porque su galpon estaba viejo. Eso no es un
// prospecto frio, es uno caliente con una obra previa.

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

// ---------------------------------------------------------------------------
// Soporte a clientes (bloque S)
// ---------------------------------------------------------------------------
// El plazo lo fija el tipo de solicitud: lo que deja a alguien sin monitoreo
// va por la via rapida; lo comercial puede esperar un dia mas.

export const CATEGORIAS_SOPORTE: Record<
  string,
  { categoria: string; horas: number | null }
> = {
  'Los sensores no reportan': { categoria: 'Reclamo', horas: 24 },
  'Las alertas no llegan o llegan tarde': { categoria: 'Reclamo', horas: 24 },
  'Un cobro que no cuadra': { categoria: 'Reclamo', horas: 48 },
  'Una visita o instalación pendiente': { categoria: 'Queja', horas: 48 },
  'Quiero sugerir una mejora': { categoria: 'Sugerencia', horas: null },
  'Otra cosa': { categoria: 'Petición', horas: 48 },
};

export function clasificarSoporte(opcion?: string | null) {
  return (
    CATEGORIAS_SOPORTE[opcion ?? ''] ?? { categoria: 'Petición', horas: 48 }
  );
}

/** Numero que se le muestra al cliente para que pueda hacer seguimiento. */
export function radicadoDe(id: number): string {
  return `PQRS-${String(id).padStart(6, '0')}`;
}
