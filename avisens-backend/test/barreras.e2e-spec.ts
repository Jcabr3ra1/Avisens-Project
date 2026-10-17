import { Client } from 'pg';
import {
  ConsultadorDeGrafo,
  discrepanciasDelGrafo,
  esperarGrafo,
  NodoDeEspera,
  ObservadorSinRespuesta,
} from './soporte/barreras';
import { ObservadorRenovable } from './soporte/observador';

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

  describe('esperarGrafo con un observador que no responde', () => {
    const observadorColgado = (opciones: {
      liberaAlAbandonar: boolean;
      conAbandonar?: boolean;
      primero?: NodoDeEspera[];
    }) => {
      const estado = { pendientes: 0, abandonos: 0, consultas: 0 };
      const rechazos: Array<(error: Error) => void> = [];
      const observador: ConsultadorDeGrafo = {
        query: <R = any>() => {
          estado.consultas += 1;
          if (opciones.primero && estado.consultas === 1) {
            return Promise.resolve({ rows: opciones.primero as R[] });
          }
          estado.pendientes += 1;
          return new Promise<{ rows: R[] }>((_, rechazar) => {
            rechazos.push((error) => {
              estado.pendientes -= 1;
              rechazar(error);
            });
          });
        },
        ...(opciones.conAbandonar === false
          ? {}
          : {
              abandonar: () => {
                estado.abandonos += 1;
                if (opciones.liberaAlAbandonar) {
                  rechazos
                    .splice(0)
                    .forEach((r) => r(new Error('Connection terminated')));
                }
              },
            }),
      };
      return { observador, estado };
    };

    const fallo = async (
      observador: ConsultadorDeGrafo,
      limiteMs: number,
      abandonoMs = 200,
    ) => {
      const inicio = Date.now();
      const error = await esperarGrafo(
        observador,
        [{ app: 'e2e-login', bloqueadoPor: ['e2e-ctl'] }],
        limiteMs,
        5,
        abandonoMs,
      ).then(
        () => null,
        (e: unknown) => e as Error,
      );
      return { error, ms: Date.now() - inicio };
    };

    it('la primera consulta nunca responde: vence con el plazo, abandona y libera la consulta', async () => {
      const { observador, estado } = observadorColgado({
        liberaAlAbandonar: true,
      });

      const { error, ms } = await fallo(observador, 150);

      expect(error).toBeInstanceOf(ObservadorSinRespuesta);
      expect(error?.message).toMatch(/sigue sin respuesta/);
      expect(ms).toBeLessThan(1500);
      expect(estado.abandonos).toBe(1);
      expect(estado.pendientes).toBe(0);
    });

    it('la segunda consulta se cuelga: usa el tiempo restante y conserva la última observación', async () => {
      const { observador, estado } = observadorColgado({
        liberaAlAbandonar: true,
        primero: [nodo('e2e-login', ['e2e-otro'])],
      });

      const { error, ms } = await fallo(observador, 300);

      expect(error).toBeInstanceOf(ObservadorSinRespuesta);
      expect(error?.message).toMatch(/e2e-otro/);
      expect(ms).toBeLessThan(500);
      expect(estado.consultas).toBe(2);
      expect(estado.abandonos).toBe(1);
      expect(estado.pendientes).toBe(0);
    });

    it('si abandonar no libera la consulta sigue acotado y lo declara', async () => {
      const { observador, estado } = observadorColgado({
        liberaAlAbandonar: false,
      });

      const { error, ms } = await fallo(observador, 150, 200);

      expect(error).toBeInstanceOf(ObservadorSinRespuesta);
      expect(error?.message).toMatch(/la liberación de la consulta/);
      expect(ms).toBeLessThan(2000);
      expect(estado.pendientes).toBe(1);
    });

    it('un observador sin abandonar() también termina acotado y dice que la consulta queda pendiente', async () => {
      const { observador, estado } = observadorColgado({
        liberaAlAbandonar: false,
        conAbandonar: false,
      });

      const { error, ms } = await fallo(observador, 150, 200);

      expect(error?.message).toMatch(/no ofrece abandonar/);
      expect(ms).toBeLessThan(2000);
      expect(estado.pendientes).toBe(1);
    });
  });

  const describePg = process.env.DATABASE_URL ? describe : describe.skip;

  describePg('esperarGrafo con un observador real de PostgreSQL', () => {
    const APLICACION = 'e2e-barrera-observador';
    let url = '';
    let verificador: Client;
    let observador: ObservadorRenovable;

    beforeAll(async () => {
      const base = new URL(process.env.DATABASE_URL as string);
      base.searchParams.set('application_name', APLICACION);
      url = base.toString();
      verificador = new Client({
        connectionString: process.env.DATABASE_URL,
      });
      await verificador.connect();
      observador = new ObservadorRenovable(url);
      await observador.connect();
    });

    afterAll(async () => {
      await observador.end();
      await verificador.end();
    });

    const consultasVivas = async () =>
      (
        await verificador.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM pg_stat_activity
            WHERE application_name = $1 AND pid <> pg_backend_pid()`,
          [APLICACION],
        )
      ).rows[0].n;

    it('una consulta que no responde se termina en el servidor, se libera y el observador se renueva', async () => {
      const colgado: ConsultadorDeGrafo = {
        query: () => observador.query('SELECT pg_sleep(60)'),
        abandonar: () => observador.abandonar(),
      };
      expect(await consultasVivas()).toBe(1);
      const inicio = Date.now();

      const error = await esperarGrafo(
        colgado,
        [{ app: 'e2e-login', bloqueadoPor: ['e2e-ctl'] }],
        300,
        20,
      ).then(
        () => null,
        (e: unknown) => e as Error,
      );

      expect(error).toBeInstanceOf(ObservadorSinRespuesta);
      expect(Date.now() - inicio).toBeLessThan(4000);
      expect(await consultasVivas()).toBe(0);
      expect((await observador.query('SELECT 1 AS uno')).rows).toHaveLength(1);
      expect(await consultasVivas()).toBe(1);
    });
  });
});
