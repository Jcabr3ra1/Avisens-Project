import { PREGUNTAS_CHATBOT } from '../../prisma/seeds/seed-chatbot';

/**
 * El cuestionario de cotización se recorrió de 15 preguntas a 9 pasos.
 *
 * De las quince, sólo cinco puntuaban: A14, A16, A18, A19 y A20. Las otras
 * medían factibilidad técnica —cuántos galpones, qué energía, si hay internet—
 * y nadie dimensiona una instalación por lo que alguien teclea en un chat: eso
 * lo recoge el asesor en la visita. Cada pregunta de más cuesta prospectos que
 * abandonan a mitad.
 *
 * Estas pruebas fijan el recorrido para que no vuelva a crecer sin querer.
 */
const porCodigo = new Map(PREGUNTAS_CHATBOT.map((p) => [p.codigo, p]));

function recorrer(desde: string): string[] {
  const camino: string[] = [];
  let actual: string | undefined = desde;
  while (actual && actual !== 'FIN') {
    if (camino.includes(actual)) throw new Error(`ciclo en ${actual}`);
    camino.push(actual);
    actual = porCodigo.get(actual)?.siguiente ?? undefined;
  }
  return camino;
}

describe('flujo del cuestionario de cotización', () => {
  it('son nueve pasos, en el orden acordado', () => {
    expect(recorrer('A1')).toEqual([
      'A1',
      'A2',
      'A16',
      'A14',
      'A18',
      'A19',
      'A20',
      'C1',
      'C2',
    ]);
  });

  it('termina en FIN y no da vueltas', () => {
    const camino = recorrer('A1');
    expect(porCodigo.get(camino[camino.length - 1])?.siguiente).toBe('FIN');
  });

  // Salen del cuestionario, no de la base: el seed las desactiva para que los
  // prospectos que ya las respondieron conserven su historial.
  it.each(['A5', 'A6', 'A6B', 'A8', 'A9', 'A11', 'A13', 'A21'])(
    '%s ya no forma parte del cuestionario',
    (codigo) => {
      expect(porCodigo.has(codigo)).toBe(false);
    },
  );

  it('ninguna pregunta apunta a una que ya no existe', () => {
    for (const pregunta of PREGUNTAS_CHATBOT) {
      const siguiente = pregunta.siguiente as string | null;
      if (!siguiente || siguiente === 'FIN') continue;
      expect(porCodigo.has(siguiente)).toBe(true);
    }
  });

  // El puntaje no cambia con el recorte: son las mismas cinco preguntas.
  it('las cinco que puntúan siguen en el flujo', () => {
    const puntuan = recorrer('A1').filter((c) => porCodigo.get(c)?.puntua);
    expect(puntuan).toEqual(['A16', 'A14', 'A18', 'A19', 'A20']);
  });

  it('el menú de entrada sigue llevando al cuestionario', () => {
    expect(porCodigo.get('M1')?.siguiente).toBe('A1');
  });
});
