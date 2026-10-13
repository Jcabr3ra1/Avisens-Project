import {
  ConsultadorDeGrafo,
  discrepanciasDelGrafo,
  esperarGrafo,
  NodoDeEspera,
} from './soporte/barreras';

const nodo = (
  app: string,
  bloqueadores: string[],
  consulta = 'SELECT 1',
  pid = 1,
): NodoDeEspera => ({
  app,
  pid,
  consulta,
  bloqueadores: bloqueadores.map((b, i) => ({
    app: b,
    pid: 100 + i,
    esperando: false,
  })),
});

describe('barreras: el grafo de espera debe coincidir con la cadena real de bloqueo', () => {
  it('acepta la cadena exacta, incluido el proceso anterior en la cola', () => {
    const grafo = [
      nodo('e2e-login-1', ['e2e-ctl']),
      nodo('e2e-login-2', ['e2e-ctl', 'e2e-login-1']),
    ];

    expect(
      discrepanciasDelGrafo(grafo, [
        { app: 'e2e-login-1', bloqueadoPor: ['e2e-ctl'] },
        { app: 'e2e-login-2', bloqueadoPor: ['e2e-login-1', 'e2e-ctl'] },
      ]),
    ).toEqual([]);
  });

  it('rechaza si falta el proceso anterior en la cola', () => {
    const grafo = [nodo('e2e-login-2', ['e2e-ctl'])];

    const texto = discrepanciasDelGrafo(grafo, [
      { app: 'e2e-login-2', bloqueadoPor: ['e2e-ctl', 'e2e-login-1'] },
    ]).join('\n');

    expect(texto).toMatch(/e2e-login-2 está bloqueado por/);
  });

  it('rechaza un bloqueador de más aunque el esperado esté presente', () => {
    const grafo = [nodo('e2e-admin', ['e2e-login', 'e2e-otro'])];

    expect(
      discrepanciasDelGrafo(grafo, [
        { app: 'e2e-admin', bloqueadoPor: ['e2e-login'] },
      ]),
    ).not.toEqual([]);
  });

  it('rechaza un bloqueador distinto del esperado', () => {
    const grafo = [nodo('e2e-admin', ['e2e-otro'])];

    expect(
      discrepanciasDelGrafo(grafo, [
        { app: 'e2e-admin', bloqueadoPor: ['e2e-login'] },
      ]),
    ).not.toEqual([]);
  });

  it('rechaza una espera inesperada de otro proceso', () => {
    const grafo = [
      nodo('e2e-admin', ['e2e-ctl']),
      nodo('e2e-intruso', ['e2e-ctl'], 'SELECT 2', 2),
    ];

    const texto = discrepanciasDelGrafo(grafo, [
      { app: 'e2e-admin', bloqueadoPor: ['e2e-ctl'] },
    ]).join('\n');

    expect(texto).toMatch(/espera inesperada de e2e-intruso/);
  });

  it('rechaza si el proceso esperado no está esperando o está duplicado', () => {
    expect(
      discrepanciasDelGrafo(
        [],
        [{ app: 'e2e-admin', bloqueadoPor: ['e2e-ctl'] }],
      ).join('\n'),
    ).toMatch(/hay 0/);
    expect(
      discrepanciasDelGrafo(
        [
          nodo('e2e-admin', ['e2e-ctl'], 'a', 1),
          nodo('e2e-admin', ['e2e-ctl'], 'b', 2),
        ],
        [{ app: 'e2e-admin', bloqueadoPor: ['e2e-ctl'] }],
      ).join('\n'),
    ).toMatch(/hay 2/);
  });

  it('rechaza si la consulta en espera no es la prevista', () => {
    const grafo = [nodo('e2e-login', ['e2e-ctl'], 'SELECT 1 FROM roles')];

    expect(
      discrepanciasDelGrafo(grafo, [
        {
          app: 'e2e-login',
          bloqueadoPor: ['e2e-ctl'],
          consulta: /FROM "usuarios".*FOR SHARE/,
        },
      ]).join('\n'),
    ).toMatch(/no coincide/);
  });

  describe('esperarGrafo', () => {
    const observadorQueDevuelve = (...grafos: NodoDeEspera[][]) => {
      let llamada = 0;
      const consultador: ConsultadorDeGrafo = {
        query: <R = any>() =>
          Promise.resolve({
            rows: grafos[Math.min(llamada++, grafos.length - 1)] as R[],
          }),
      };
      return consultador;
    };

    it('espera a que el grafo coincida', async () => {
      const observador = observadorQueDevuelve(
        [],
        [nodo('e2e-login', ['e2e-ctl'])],
      );

      const grafo = await esperarGrafo(
        observador,
        [{ app: 'e2e-login', bloqueadoPor: ['e2e-ctl'] }],
        1000,
        5,
      );

      expect(grafo).toHaveLength(1);
    });

    it('si nunca coincide falla de forma acotada y describe el grafo observado', async () => {
      const observador = observadorQueDevuelve([
        nodo('e2e-login', ['e2e-otro']),
      ]);
      const inicio = Date.now();

      const error = await esperarGrafo(
        observador,
        [{ app: 'e2e-login', bloqueadoPor: ['e2e-ctl'] }],
        150,
        5,
      ).then(
        () => null,
        (e: unknown) => e as Error,
      );

      expect(error?.message).toMatch(/no coincidió en 150 ms/);
      expect(error?.message).toMatch(/e2e-otro/);
      expect(Date.now() - inicio).toBeLessThan(1500);
    });
  });
});
