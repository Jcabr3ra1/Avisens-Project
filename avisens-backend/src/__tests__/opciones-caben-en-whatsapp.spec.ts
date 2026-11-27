import { OPCIONES_CALIFICADAS } from '../modules/chatbot/dominio/calificacion';

/**
 * WhatsApp trunca un botón pasados 20 caracteres y una fila de lista pasados
 * 24. Y si una sola opción se pasa, la pregunta entera cae a texto numerado:
 * la persona tiene que escribir «3» en vez de tocar.
 *
 * Así estaban A14 y A19 — dos de las cinco preguntas que puntúan— hasta que se
 * acortaron los textos. Esta prueba existe para que no vuelva a colarse uno
 * largo sin que nadie se entere: el síntoma no es un error, es una conversación
 * más incómoda que nadie mira.
 */
const MAX_BOTON = 20;
const MAX_FILA_LISTA = 24;
const MAX_BOTONES = 3;
const MAX_FILAS_LISTA = 10;

const preguntas = Object.entries(OPCIONES_CALIFICADAS);

describe('las opciones caben en lo que pinta WhatsApp', () => {
  it.each(preguntas)('%s se puede tocar, no escribir', (_codigo, opciones) => {
    const textos = opciones.map((o) => o.texto);
    const caben =
      (textos.length <= MAX_BOTONES &&
        textos.every((t) => t.length <= MAX_BOTON)) ||
      (textos.length <= MAX_FILAS_LISTA &&
        textos.every((t) => t.length <= MAX_FILA_LISTA));

    expect(caben).toBe(true);
  });

  it.each(preguntas)('%s no repite una opción', (_codigo, opciones) => {
    const textos = opciones.map((o) => o.texto);
    expect(new Set(textos).size).toBe(textos.length);
  });

  it('las de dos opciones salen como botones, que es lo más cómodo', () => {
    for (const [, opciones] of preguntas) {
      if (opciones.length > MAX_BOTONES) continue;
      expect(opciones.every((o) => o.texto.length <= MAX_BOTON)).toBe(true);
    }
  });
});
