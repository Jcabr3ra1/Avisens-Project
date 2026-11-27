// Cuándo dos opciones se pintan de lado en vez de apiladas.
//
// Las respuestas del cuestionario suelen ser frases —«Se va, pero tengo
// planta»— y por eso la lista es de una columna: en fila se partían en dos
// líneas y el área de toque quedaba corta en móvil.
//
// La excepción es un sí o no: en pareja se lee como una decisión y no como una
// lista de la que hay que escoger. Es también como lo pinta WhatsApp, que usa
// botones hasta tres opciones y lista a partir de ahí, así que los dos canales
// se leen igual.
//
// El límite sale de medir «No, corregir datos», la opción más larga del flujo
// que sigue leyéndose bien a media anchura.
const LARGO_MAXIMO_EN_PAR = 14

export function seLeenEnPar(opciones: string[]): boolean {
  return (
    opciones.length === 2
    && opciones.every((opcion) => opcion.trim().length <= LARGO_MAXIMO_EN_PAR)
  )
}
