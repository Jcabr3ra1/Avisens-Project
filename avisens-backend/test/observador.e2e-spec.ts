import { ConexionPg, ObservadorRenovable } from './soporte/observador';

type Modo = 'ok' | 'cuelga' | 'falla' | 'manual';

interface Diferida {
  promesa: Promise<void>;
  resolver: () => void;
  rechazar: (error: Error) => void;
}

const diferida = (): Diferida => {
  let resolver: () => void = () => undefined;
  let rechazar: (error: Error) => void = () => undefined;
  const promesa = new Promise<void>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  promesa.catch(() => undefined);
  return { promesa, resolver, rechazar };
};

class ConexionFalsa implements ConexionPg {
  destruida = 0;
  cerrada = 0;
  readonly consultas: string[] = [];
  readonly conexion = diferida();
  readonly pid = diferida();

  constructor(
    private readonly modo: { connect: Modo; pid: Modo; end?: Modo } = {
      connect: 'ok',
      pid: 'ok',
    },
    private readonly valorDelPid = 4321,
    private readonly rechazaAlDestruir = true,
  ) {}

  private esperar(modo: Modo, diferido: Diferida): Promise<void> {
    if (modo === 'ok') return Promise.resolve();
    if (modo === 'falla')
      return Promise.reject(new Error('conexión rechazada'));
    return diferido.promesa;
  }

  connect() {
    return this.esperar(this.modo.connect, this.conexion);
  }

  query<R = any>(sql: string): Promise<{ rows: R[] }> {
    if (sql.includes('pg_backend_pid')) {
      return this.esperar(this.modo.pid, this.pid).then(() => ({
        rows: [{ pid: this.valorDelPid }] as R[],
      }));
    }
    this.consultas.push(sql);
    return Promise.resolve({ rows: [{ ok: 1 }] as R[] });
  }

  end() {
    this.cerrada += 1;
    return this.modo.end === 'cuelga'
      ? new Promise<void>(() => undefined)
      : Promise.resolve();
  }

  destruir() {
    this.destruida += 1;
    if (this.rechazaAlDestruir) {
      const error = new Error('Connection terminated');
      this.conexion.rechazar(error);
      this.pid.rechazar(error);
    }
  }
}

const fabricaDe = (...conexiones: ConexionFalsa[]) => {
  let siguiente = 0;
  return jest.fn(
    () => conexiones[Math.min(siguiente++, conexiones.length - 1)],
  );
};

const resultado = async (promesa: Promise<unknown>) => {
  const inicio = Date.now();
  const error = await promesa.then(
    () => null,
    (e: unknown) => e as Error,
  );
  return { error, ms: Date.now() - inicio };
};

const tic = () => new Promise<void>((resolver) => setTimeout(resolver, 20));

describe('ObservadorRenovable: la conexión se protege desde su creación', () => {
  const crear = (
    fabrica: ReturnType<typeof fabricaDe>,
    extra: { inicioMs?: number; abandonoMs?: number } = {},
  ) =>
    new ObservadorRenovable('postgres://prueba', {
      fabrica,
      terminar: () => Promise.resolve(),
      inicioMs: 150,
      abandonoMs: 150,
      ...extra,
    });

  it('la conexión inicial sin respuesta vence acotada, destruye la conexión y permite renovar', async () => {
    const colgada = new ConexionFalsa({ connect: 'cuelga', pid: 'ok' });
    const buena = new ConexionFalsa();
    const observador = crear(fabricaDe(colgada, buena));

    const { error, ms } = await resultado(observador.query('SELECT 1'));

    expect(error?.message).toMatch(
      /la conexión del observador superó el límite de 150 ms/,
    );
    expect(ms).toBeLessThan(1500);
    expect(colgada.destruida).toBeGreaterThanOrEqual(1);
    await observador.query('SELECT 2');
    expect(buena.consultas).toEqual(['SELECT 2']);
    expect(buena.destruida).toBe(0);
  });

  it('la lectura del pid sin respuesta vence acotada, destruye la conexión y permite renovar', async () => {
    const colgada = new ConexionFalsa({ connect: 'ok', pid: 'cuelga' });
    const buena = new ConexionFalsa();
    const observador = crear(fabricaDe(colgada, buena));

    const { error, ms } = await resultado(observador.query('SELECT 1'));

    expect(error?.message).toMatch(
      /la lectura del pid del observador superó el límite de 150 ms/,
    );
    expect(ms).toBeLessThan(1500);
    expect(colgada.destruida).toBeGreaterThanOrEqual(1);
    await observador.query('SELECT 2');
    expect(buena.consultas).toEqual(['SELECT 2']);
  });

  it('un fallo inicial se informa, no deja el observador atascado y la siguiente consulta renueva', async () => {
    const rota = new ConexionFalsa({ connect: 'falla', pid: 'ok' });
    const buena = new ConexionFalsa();
    const fabrica = fabricaDe(rota, buena);
    const observador = crear(fabrica);

    const { error } = await resultado(observador.query('SELECT 1'));

    expect(error?.message).toBe('conexión rechazada');
    expect(rota.destruida).toBeGreaterThanOrEqual(1);
    await observador.query('SELECT 2');
    expect(fabrica).toHaveBeenCalledTimes(2);
    expect(buena.consultas).toEqual(['SELECT 2']);
  });

  it('una respuesta tardía después del abandono no reinstala la conexión abandonada', async () => {
    const tardia = new ConexionFalsa(
      { connect: 'manual', pid: 'manual' },
      9999,
      false,
    );
    const buena = new ConexionFalsa();
    const fabrica = fabricaDe(tardia, buena);
    const observador = crear(fabrica, { inicioMs: 3000 });

    const inicial = resultado(observador.query('SELECT 1'));
    await tic();
    await observador.abandonar();
    expect(tardia.destruida).toBe(1);
    tardia.conexion.resolver();
    await tic();
    tardia.pid.resolver();
    const { error } = await inicial;

    expect(error?.message).toMatch(/se abandonó durante su inicialización/);
    expect(tardia.destruida).toBeGreaterThanOrEqual(2);
    expect(tardia.consultas).toEqual([]);
    await observador.query('SELECT 2');
    expect(fabrica).toHaveBeenCalledTimes(2);
    expect(buena.consultas).toEqual(['SELECT 2']);
    expect(tardia.consultas).toEqual([]);
  });

  it('las inicializaciones simultáneas comparten una sola conexión', async () => {
    const unica = new ConexionFalsa();
    const fabrica = fabricaDe(unica, new ConexionFalsa());
    const observador = crear(fabrica);

    await Promise.all([
      observador.query('SELECT 1'),
      observador.query('SELECT 2'),
      observador.query('SELECT 3'),
    ]);

    expect(fabrica).toHaveBeenCalledTimes(1);
    expect(unica.consultas).toHaveLength(3);
  });

  it('abandonar con el pid conocido pide terminar el backend y destruye la conexión aunque falle', async () => {
    const conexion = new ConexionFalsa();
    const terminar = jest.fn().mockRejectedValue(new Error('sin permiso'));
    const observador = new ObservadorRenovable('postgres://prueba', {
      fabrica: fabricaDe(conexion),
      terminar,
      abandonoMs: 150,
    });
    await observador.connect();

    const { error } = await resultado(observador.abandonar());

    expect(terminar).toHaveBeenCalledWith(4321);
    expect(error?.message).toMatch(/no confirmó su terminación: sin permiso/);
    expect(conexion.destruida).toBe(1);
  });

  it('un cierre que no responde vence acotado y destruye la conexión', async () => {
    const conexion = new ConexionFalsa({
      connect: 'ok',
      pid: 'ok',
      end: 'cuelga',
    });
    const observador = crear(fabricaDe(conexion));
    await observador.connect();

    const { error, ms } = await resultado(observador.end());

    expect(error?.message).toMatch(/el cierre del observador superó/);
    expect(ms).toBeLessThan(1500);
    expect(conexion.destruida).toBe(1);
    const posterior = await resultado(observador.query('SELECT 1'));
    expect(posterior.error?.message).toMatch(/ya está cerrado/);
  });

  it('cerrar mientras se inicializa también queda acotado y sin conexiones pendientes', async () => {
    const colgada = new ConexionFalsa({ connect: 'cuelga', pid: 'ok' });
    const observador = crear(fabricaDe(colgada), { inicioMs: 3000 });
    const inicial = resultado(observador.query('SELECT 1'));
    await tic();

    const { ms } = await resultado(observador.end());
    await inicial;

    expect(ms).toBeLessThan(1500);
    expect(colgada.destruida).toBeGreaterThanOrEqual(1);
  });
});
