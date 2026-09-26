import {
  A14_DOLOR,
  A16_MORTALIDAD,
  A20_DECIDE,
  DOLOR,
  NO_DECIDE,
  OPCIONES_CALIFICADAS,
  PUNTAJE_MAXIMO,
  clasificarSoporte,
  radicadoDe,
  tieneDolor,
} from './calificacion';

describe('modelo de calificacion', () => {
  it('los puntajes maximos de cada dimension suman el total', () => {
    const maximoPorPregunta = Object.values(OPCIONES_CALIFICADAS).map((ops) =>
      Math.max(...ops.map((o) => o.puntaje)),
    );
    const suma = maximoPorPregunta.reduce((a, b) => a + b, 0);
    expect(suma).toBe(PUNTAJE_MAXIMO);
  });

  it('ninguna opcion tiene puntaje negativo', () => {
    for (const [codigo, opciones] of Object.entries(OPCIONES_CALIFICADAS)) {
      for (const o of opciones) {
        expect(o.puntaje).toBeGreaterThanOrEqual(0);
      }
      expect(opciones.length).toBeGreaterThan(1);
      expect(codigo).toMatch(/^A\d+$/);
    }
  });

  it('las reglas de negocio se derivan de las opciones, no se repiten a mano', () => {
    // Si alguien reescribe el texto de una opcion, estas constantes cambian
    // solas. Antes vivian duplicadas y se desincronizaban en silencio.
    expect(DOLOR).toEqual(
      A16_MORTALIDAD.filter((o) => o.puntaje > 0).map((o) => o.texto),
    );
    expect(NO_DECIDE).toBe(A20_DECIDE[1].texto);
    expect(A20_DECIDE.find((o) => o.texto === NO_DECIDE)?.puntaje).toBe(0);
  });
});

describe('tieneDolor', () => {
  it('la mortalidad ambiental repetida es dolor', () => {
    expect(tieneDolor(A16_MORTALIDAD[0].texto, null)).toBe(true);
  });

  it('un problema concreto es dolor aunque no haya perdido aves', () => {
    expect(tieneDolor(A16_MORTALIDAD[2].texto, A14_DOLOR[0].texto)).toBe(true);
  });

  it('"Nada en particular" NO es dolor', () => {
    // Cuando A14 era texto libre bastaba con que viniera lleno. Al pasar a
    // opciones, "Nada en particular" llega lleno y significa lo contrario:
    // marcaba señal caliente a quien decia que no tenia problemas.
    const nada = A14_DOLOR[A14_DOLOR.length - 1];
    expect(nada.puntaje).toBe(0);
    expect(tieneDolor(A16_MORTALIDAD[2].texto, nada.texto)).toBe(false);
  });

  it('sin respuestas no hay dolor', () => {
    expect(tieneDolor(null, null)).toBe(false);
  });
});

describe('soporte a clientes', () => {
  it('lo que deja al cliente sin monitoreo va en 24 horas', () => {
    expect(clasificarSoporte('Los sensores no reportan').horas).toBe(24);
    expect(clasificarSoporte('Las alertas no llegan o llegan tarde').horas).toBe(
      24,
    );
  });

  it('lo comercial puede esperar 48', () => {
    expect(clasificarSoporte('Un cobro que no cuadra').horas).toBe(48);
    expect(clasificarSoporte('Una visita o instalación pendiente').horas).toBe(
      48,
    );
  });

  it('una sugerencia no promete plazo', () => {
    const r = clasificarSoporte('Quiero sugerir una mejora');
    expect(r.horas).toBeNull();
    expect(r.categoria).toBe('Sugerencia');
  });

  it('una opcion desconocida no rompe: cae en peticion a 48 horas', () => {
    expect(clasificarSoporte('cualquier cosa')).toEqual({
      categoria: 'Petición',
      horas: 48,
    });
    expect(clasificarSoporte(null).categoria).toBe('Petición');
  });

  it('el radicado se muestra con ceros a la izquierda', () => {
    // Sin un numero visible el cliente no tiene con que preguntar por su caso.
    expect(radicadoDe(42)).toBe('PQRS-000042');
    expect(radicadoDe(1)).toBe('PQRS-000001');
  });
});
