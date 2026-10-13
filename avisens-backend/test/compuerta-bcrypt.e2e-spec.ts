import { createServer, get, Server } from 'http';
import type { Socket } from 'net';
import {
  CompuertaSinLlegada,
  ensayarConCompuerta,
  ModuloBcrypt,
} from './soporte/compuerta-bcrypt';

const PASSWORD = 'clave-de-prueba';

const dormir = (ms: number) =>
  new Promise<void>((resolver) => setTimeout(resolver, ms));

const colgar = () => new Promise<never>(() => undefined);

describe('compuerta de bcrypt: ensayos acotados', () => {
  let modulo: ModuloBcrypt;

  beforeEach(() => {
    modulo = { compare: () => Promise.resolve(true) };
  });

  afterEach(() => jest.restoreAllMocks());

  const loginQueLlama = (estado = 200) => {
    const marca = { terminado: false };
    const iniciar = async () => {
      await modulo.compare(PASSWORD, 'referencia');
      marca.terminado = true;
      return { status: estado };
    };
    return { iniciar, marca };
  };

  const resultado = async (promesa: Promise<unknown>) => {
    const inicio = Date.now();
    const error = await promesa.then(
      () => null,
      (e: unknown) => e as Error,
    );
    return { error, ms: Date.now() - inicio };
  };

  it('retiene el login mientras dura la acción y lo libera después', async () => {
    const { iniciar, marca } = loginQueLlama(200);
    let terminadoDurante = true;

    const { login, accion } = await ensayarConCompuerta({
      modulo,
      password: PASSWORD,
      iniciar,
      durante: async () => {
        await dormir(50);
        terminadoDurante = marca.terminado;
        return 'hecho';
      },
    });

    expect(terminadoDurante).toBe(false);
    expect(login).toEqual({ status: 200 });
    expect(accion).toBe('hecho');
    expect(jest.isMockFunction(modulo.compare)).toBe(false);
  });

  it('si el login termina sin alcanzar la compuerta falla de inmediato con un diagnóstico claro', async () => {
    let ejecutada = false;

    const { error, ms } = await resultado(
      ensayarConCompuerta({
        modulo,
        password: PASSWORD,
        iniciar: () => Promise.resolve({ status: 401 }),
        durante: () => {
          ejecutada = true;
          return Promise.resolve(null);
        },
        limites: { llegadaMs: 5000 },
      }),
    );

    expect(error).toBeInstanceOf(CompuertaSinLlegada);
    expect(error?.message).toMatch(
      /el login terminó con estado 401 antes de alcanzar la compuerta de bcrypt/,
    );
    expect(ms).toBeLessThan(1000);
    expect(ejecutada).toBe(false);
    expect(jest.isMockFunction(modulo.compare)).toBe(false);
  });

  it('si el login falla antes de la compuerta también falla de inmediato', async () => {
    const { error, ms } = await resultado(
      ensayarConCompuerta({
        modulo,
        password: PASSWORD,
        iniciar: () => Promise.reject(new Error('conexión rechazada')),
        durante: () => Promise.resolve(null),
        limites: { llegadaMs: 5000 },
      }),
    );

    expect(error).toBeInstanceOf(CompuertaSinLlegada);
    expect(error?.message).toMatch(/falló antes de alcanzar la compuerta/);
    expect(ms).toBeLessThan(1000);
  });

  it('si el login no llega ni termina, la espera de llegada vence acotada', async () => {
    const { error, ms } = await resultado(
      ensayarConCompuerta({
        modulo,
        password: PASSWORD,
        iniciar: colgar,
        durante: () => Promise.resolve(null),
        limites: { llegadaMs: 150, terminoMs: 150 },
      }),
    );

    expect(error).toBeInstanceOf(CompuertaSinLlegada);
    expect(error?.message).toMatch(
      /no alcanzó la compuerta de bcrypt en 150 ms/,
    );
    expect(ms).toBeLessThan(1500);
    expect(jest.isMockFunction(modulo.compare)).toBe(false);
  });

  it('un fallo de la operación administrativa abre la compuerta, deja terminar el login y conserva el error original', async () => {
    const { iniciar, marca } = loginQueLlama(200);

    const { error, ms } = await resultado(
      ensayarConCompuerta({
        modulo,
        password: PASSWORD,
        iniciar,
        durante: () => Promise.reject(new Error('fallo administrativo')),
      }),
    );

    expect(error?.message).toBe('fallo administrativo');
    expect(marca.terminado).toBe(true);
    expect(ms).toBeLessThan(1500);
    expect(jest.isMockFunction(modulo.compare)).toBe(false);
  });

  it('si el login sigue detenido con la compuerta abierta, la espera final vence acotada', async () => {
    const iniciar = async () => {
      await modulo.compare(PASSWORD, 'referencia');
      return colgar();
    };

    const { error, ms } = await resultado(
      ensayarConCompuerta({
        modulo,
        password: PASSWORD,
        iniciar,
        durante: () => Promise.resolve(null),
        limites: { terminoMs: 200 },
      }),
    );

    expect(error?.message).toMatch(
      /el login con la compuerta abierta superó el límite de 200 ms/,
    );
    expect(ms).toBeLessThan(1500);
  });

  it('la compuerta no queda retenida más allá de su límite aunque la acción tarde', async () => {
    const { iniciar, marca } = loginQueLlama(200);
    let terminadoAntes = false;

    await ensayarConCompuerta({
      modulo,
      password: PASSWORD,
      iniciar,
      durante: async () => {
        await dormir(400);
        terminadoAntes = marca.terminado;
      },
      limites: { retencionMs: 100 },
    });

    expect(terminadoAntes).toBe(true);
  });

  it('si iniciar lanza de forma síncrona, el ensayo falla acotado, conserva la causa y restaura bcrypt', async () => {
    const causa = new Error('fallo al construir la petición');

    const { error, ms } = await resultado(
      ensayarConCompuerta({
        modulo,
        password: PASSWORD,
        iniciar: () => {
          throw causa;
        },
        durante: () => Promise.resolve(null),
        limites: { llegadaMs: 5000 },
      }),
    );

    expect(error).toBeInstanceOf(CompuertaSinLlegada);
    expect(error?.message).toMatch(/fallo al construir la petición/);
    expect(error?.cause).toBe(causa);
    expect(ms).toBeLessThan(1000);
    expect(jest.isMockFunction(modulo.compare)).toBe(false);
  });

  it('si la acción nunca responde, el ensayo vence acotado, abre la compuerta, aborta la acción y restaura bcrypt', async () => {
    const { iniciar, marca } = loginQueLlama(200);
    let abortada = false;

    const { error, ms } = await resultado(
      ensayarConCompuerta({
        modulo,
        password: PASSWORD,
        iniciar,
        durante: (senal) => {
          senal.addEventListener('abort', () => (abortada = true));
          return colgar();
        },
        limites: { accionMs: 150 },
      }),
    );

    expect(error?.message).toMatch(
      /la acción durante la compuerta superó el límite de 150 ms/,
    );
    expect(ms).toBeLessThan(1500);
    expect(abortada).toBe(true);
    expect(marca.terminado).toBe(true);
    expect(jest.isMockFunction(modulo.compare)).toBe(false);
  });

  it('si el login no llega ni termina, se aborta su petición', async () => {
    let abortado = false;

    const { error } = await resultado(
      ensayarConCompuerta({
        modulo,
        password: PASSWORD,
        iniciar: (senal) => {
          senal.addEventListener('abort', () => (abortado = true));
          return colgar();
        },
        durante: () => Promise.resolve(null),
        limites: { llegadaMs: 100, terminoMs: 100 },
      }),
    );

    expect(error).toBeInstanceOf(CompuertaSinLlegada);
    expect(abortado).toBe(true);
  });

  describe('con una petición HTTP real que nunca responde', () => {
    let servidor: Server;
    let url = '';
    let conexiones: Socket[] = [];
    let cerradas = 0;

    beforeEach(async () => {
      conexiones = [];
      cerradas = 0;
      servidor = createServer(() => undefined);
      servidor.on('connection', (socket) => {
        conexiones.push(socket);
        socket.on('close', () => (cerradas += 1));
      });
      await new Promise<void>((resolver) =>
        servidor.listen(0, '127.0.0.1', resolver),
      );
      const direccion = servidor.address() as { port: number };
      url = `http://127.0.0.1:${direccion.port}/`;
    });

    afterEach(async () => {
      conexiones.forEach((socket) => socket.destroy());
      await new Promise<void>((resolver) => servidor.close(() => resolver()));
    });

    const peticionColgada = (senal: AbortSignal) =>
      new Promise<void>((resolver, rechazar) => {
        const peticion = get(url, { signal: senal }, () => resolver());
        peticion.on('error', rechazar);
      });

    it('el ensayo aborta y cierra la conexión propia en lugar de abandonar la espera', async () => {
      const { iniciar } = loginQueLlama(200);

      const { error, ms } = await resultado(
        ensayarConCompuerta({
          modulo,
          password: PASSWORD,
          iniciar,
          durante: peticionColgada,
          limites: { accionMs: 200 },
        }),
      );

      expect(error?.message).toMatch(/la acción durante la compuerta superó/);
      expect(ms).toBeLessThan(2000);
      const limite = Date.now() + 2000;
      while (cerradas < conexiones.length && Date.now() < limite) {
        await dormir(20);
      }
      expect(conexiones).toHaveLength(1);
      expect(cerradas).toBe(1);
      expect(jest.isMockFunction(modulo.compare)).toBe(false);
    });
  });
});
