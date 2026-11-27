import {
  ClienteControl,
  conControlesSostenidos,
  ErrorDeLimpieza,
  esperarRespuesta,
  Etapa,
  medirConControles,
  OpcionesDeMedicion,
  Peticion,
  PeticionSinRespuesta,
  sostenerControles,
} from './soporte/controles';

type Fallo = 'falla' | 'cuelga';
type Punto = 'connect' | 'pid' | 'BEGIN' | 'etapa' | 'ROLLBACK' | 'end';

const ESPERA_MAXIMA_MS = 2500;

class ControlFalso implements ClienteControl {
  conectado = false;
  transaccionAbierta = false;
  cerrado = false;
  destruido = false;
  consultas: string[] = [];

  constructor(
    readonly etiqueta: string,
    private readonly fallos: Partial<Record<Punto, Fallo>> = {},
  ) {}

  get abierto() {
    return !this.cerrado && !this.destruido;
  }

  private async punto(punto: Punto) {
    const fallo = this.fallos[punto];
    if (fallo === 'cuelga') await new Promise<never>(() => undefined);
    if (fallo === 'falla') {
      throw new Error(`fallo simulado en ${punto} de ${this.etiqueta}`);
    }
  }

  async connect() {
    await this.punto('connect');
    this.conectado = true;
  }

  async query<R = any>(sql: string) {
    this.consultas.push(sql);
    if (sql.startsWith('SELECT pg_backend_pid')) {
      await this.punto('pid');
      return { rows: [{ pid: 4000 + this.etiqueta.length }] as R[] };
    }
    if (sql === 'BEGIN') {
      await this.punto('BEGIN');
      this.transaccionAbierta = true;
      return { rows: [] as R[] };
    }
    if (sql === 'ROLLBACK') {
      await this.punto('ROLLBACK');
      this.transaccionAbierta = false;
      return { rows: [] as R[] };
    }
    await this.punto('etapa');
    return { rows: [] as R[] };
  }

  async end() {
    await this.punto('end');
    this.cerrado = true;
  }

  destruir() {
    this.destruido = true;
  }
}

class Granja {
  readonly controles: ControlFalso[] = [];
  constructor(
    private readonly fallos: Record<string, Partial<Record<Punto, Fallo>>> = {},
    private readonly falloAlCrear: string | null = null,
  ) {}

  fabrica = (etiqueta: string) => {
    if (etiqueta === this.falloAlCrear) {
      throw new Error(`fallo simulado al crear el control ${etiqueta}`);
    }
    const control = new ControlFalso(etiqueta, this.fallos[etiqueta]);
    this.controles.push(control);
    return control;
  };

  sinControlesAbiertos() {
    for (const c of this.controles) {
      expect({ etiqueta: c.etiqueta, abierto: c.abierto }).toEqual({
        etiqueta: c.etiqueta,
        abierto: false,
      });
      expect({
        etiqueta: c.etiqueta,
        transaccionAbierta: c.transaccionAbierta && !c.destruido,
      }).toEqual({ etiqueta: c.etiqueta, transaccionAbierta: false });
    }
  }
}

const etapas = (...etiquetas: string[]): Etapa[] =>
  etiquetas.map((etiqueta) => ({
    etiqueta,
    sql: 'SELECT 1',
    parametros: [],
    liberarMs: null,
  }));

interface ModoDelObservador {
  caerEnLaLlamada?: number;
  colgarEnLaLlamada?: number;
  colgarLecturaFinal?: boolean;
  fallarLecturaFinal?: boolean;
}

class ObservadorFalso implements ClienteControl {
  llamadas = 0;
  cerrado = false;
  destruido = false;
  private readonly colgadas: ((error: Error) => void)[] = [];

  constructor(private readonly modo: ModoDelObservador = {}) {}

  get consultasPendientes() {
    return this.colgadas.length;
  }

  connect() {
    return Promise.resolve();
  }

  end() {
    this.cerrado = true;
    return Promise.resolve();
  }

  destruir() {
    this.destruido = true;
    for (const rechazar of this.colgadas.splice(0)) {
      rechazar(new Error('conexión terminada'));
    }
  }

  query<R = any>(sql: string) {
    this.llamadas += 1;
    const final = sql.includes('count(*)');
    if (this.modo.caerEnLaLlamada === this.llamadas) {
      return Promise.reject(new Error('fallo simulado del observador'));
    }
    if (final && this.modo.fallarLecturaFinal) {
      return Promise.reject(new Error('fallo simulado en la lectura final'));
    }
    if (
      this.modo.colgarEnLaLlamada === this.llamadas ||
      (final && this.modo.colgarLecturaFinal)
    ) {
      return new Promise<{ rows: R[] }>((_resolver, rechazar) => {
        this.colgadas.push(rechazar);
      });
    }
    return Promise.resolve({ rows: (final ? [{ n: 0 }] : []) as R[] });
  }

  get abierto() {
    return !this.cerrado && !this.destruido;
  }
}

class PeticionFalsa implements Peticion {
  abortada = false;
  constructor(private readonly respuesta: 'responde' | 'nunca' = 'responde') {}

  end(
    retorno: (error: unknown, res: { status: number; body: unknown }) => void,
  ) {
    if (this.respuesta === 'responde') {
      setTimeout(() => retorno(null, { status: 200, body: { ok: true } }), 20);
    }
    return this;
  }

  abort() {
    this.abortada = true;
  }
}

const opciones: OpcionesDeMedicion = {
  asentarMs: 10,
  limitePeticionMs: 400,
  limiteLimpiezaMs: 150,
  limitePreparacionMs: 150,
  limiteObservadorMs: 150,
};

const capturar = async (promesa: Promise<unknown>): Promise<unknown> => {
  try {
    await promesa;
  } catch (error) {
    return error;
  }
  throw new Error('se esperaba un rechazo y la promesa se resolvió');
};

const acotada = async <T>(
  trabajo: () => Promise<T>,
  limiteMs = ESPERA_MAXIMA_MS,
) => {
  let guardia: NodeJS.Timeout | undefined;
  const inicio = Date.now();
  const vencimiento = new Promise<never>((_resolver, rechazar) => {
    guardia = setTimeout(
      () => rechazar(new Error(`el arnés no terminó en ${limiteMs} ms`)),
      limiteMs,
    );
  });
  const corrida = trabajo();
  corrida.catch(() => undefined);
  try {
    return await Promise.race([corrida, vencimiento]);
  } finally {
    clearTimeout(guardia);
    expect(Date.now() - inicio).toBeLessThan(limiteMs);
  }
};

const fallosDeLimpiezaDe = (error: unknown) =>
  (error as { fallosDeLimpieza?: Error[] }).fallosDeLimpieza ?? [];

describe('arnés de controles: acotado, conserva el fallo y no deja controles abiertos', () => {
  let consola: jest.SpyInstance;

  beforeEach(() => {
    consola = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => consola.mockRestore());

  describe('sostener', () => {
    it('fallo preparando el segundo control: conserva el error, revierte el primero y cierra ambos', async () => {
      const granja = new Granja({ B: { etapa: 'falla' } });

      const error = await acotada(() =>
        capturar(
          sostenerControles(etapas('A', 'B', 'C'), granja.fabrica, {
            limpiezaMs: 150,
            preparacionMs: 150,
          }),
        ),
      );

      expect((error as Error).message).toBe('fallo simulado en etapa de B');
      expect(granja.controles.map((c) => c.etiqueta)).toEqual(['A', 'B']);
      expect(granja.controles[0].consultas).toContain('ROLLBACK');
      expect(fallosDeLimpiezaDe(error)).toEqual([]);
      granja.sinControlesAbiertos();
    });

    it('fallo al crear el segundo control (la fábrica lanza): cierra el primero', async () => {
      const granja = new Granja({}, 'B');

      const error = await acotada(() =>
        capturar(
          sostenerControles(etapas('A', 'B'), granja.fabrica, {
            limpiezaMs: 150,
            preparacionMs: 150,
          }),
        ),
      );

      expect((error as Error).message).toContain('al crear el control B');
      expect(granja.controles.map((c) => c.etiqueta)).toEqual(['A']);
      granja.sinControlesAbiertos();
    });

    it('conexión del segundo control que nunca responde: se acota, se destruye el socket y se revierte el primero', async () => {
      const granja = new Granja({ B: { connect: 'cuelga' } });

      const error = await acotada(() =>
        capturar(
          sostenerControles(etapas('A', 'B'), granja.fabrica, {
            limpiezaMs: 150,
            preparacionMs: 150,
          }),
        ),
      );

      expect((error as Error).message).toContain('la conexión de B superó');
      expect(granja.controles[1].destruido).toBe(true);
      granja.sinControlesAbiertos();
    });

    it('fallo de limpieza durante un fallo de preparación: conserva el original y deja los fallos observables', async () => {
      const granja = new Granja({
        A: { ROLLBACK: 'falla' },
        B: { etapa: 'falla' },
      });

      const error = await acotada(() =>
        capturar(
          sostenerControles(etapas('A', 'B'), granja.fabrica, {
            limpiezaMs: 150,
            preparacionMs: 150,
          }),
        ),
      );

      expect((error as Error).message).toBe('fallo simulado en etapa de B');
      expect(fallosDeLimpiezaDe(error).map((f) => f.message)).toEqual([
        expect.stringContaining('ROLLBACK de A'),
      ]);
      expect(consola).toHaveBeenCalled();
      granja.sinControlesAbiertos();
    });
  });

  describe('medir', () => {
    it('camino feliz: devuelve la medición y deja todo cerrado', async () => {
      const granja = new Granja();
      const observador = new ObservadorFalso();

      const m = await acotada(() =>
        medirConControles(
          () => observador,
          granja.fabrica,
          'app',
          etapas('A', 'B'),
          () => new PeticionFalsa(),
          opciones,
        ),
      );

      expect(m).toMatchObject({
        status: 200,
        idleEnTransaccion: 0,
        bloqueadoPor: [],
      });
      granja.sinControlesAbiertos();
    });

    it('fallo al crear la petición: conserva el error, detiene el sondeo y cierra los controles', async () => {
      const granja = new Granja();
      const observador = new ObservadorFalso();
      const original = new Error('fallo simulado al crear la petición');

      const error = await acotada(() =>
        capturar(
          medirConControles(
            () => observador,
            granja.fabrica,
            'app',
            etapas('A', 'B'),
            () => {
              throw original;
            },
            opciones,
          ),
        ),
      );

      expect(error).toBe(original);
      const llamadas = observador.llamadas;
      await new Promise((r) => setTimeout(r, 150));
      expect(observador.llamadas).toBe(llamadas);
      granja.sinControlesAbiertos();
    });

    it('petición que nunca responde: se aborta al llegar al límite y se limpia', async () => {
      const granja = new Granja();
      const observador = new ObservadorFalso();
      const peticion = new PeticionFalsa('nunca');

      const error = await acotada(() =>
        capturar(
          medirConControles(
            () => observador,
            granja.fabrica,
            'app',
            etapas('A', 'B'),
            () => peticion,
            { ...opciones, limitePeticionMs: 200 },
          ),
        ),
      );

      expect(error).toBeInstanceOf(PeticionSinRespuesta);
      expect(peticion.abortada).toBe(true);
      granja.sinControlesAbiertos();
    });

    it('fallo del observador: aborta la petición sin esperar su límite y se limpia', async () => {
      const granja = new Granja();
      const observador = new ObservadorFalso({ caerEnLaLlamada: 2 });
      const peticion = new PeticionFalsa('nunca');
      const inicio = Date.now();

      const error = await acotada(() =>
        capturar(
          medirConControles(
            () => observador,
            granja.fabrica,
            'app',
            etapas('A', 'B'),
            () => peticion,
            { ...opciones, limitePeticionMs: 3000 },
          ),
        ),
      );

      expect((error as Error).message).toContain(
        'el observador de bloqueos falló',
      );
      expect(Date.now() - inicio).toBeLessThan(1500);
      expect(peticion.abortada).toBe(true);
      granja.sinControlesAbiertos();
    });

    it('fallo del observador en la lectura final: no se pierde', async () => {
      const granja = new Granja();
      const observador = new ObservadorFalso({ fallarLecturaFinal: true });

      const error = await acotada(() =>
        capturar(
          medirConControles(
            () => observador,
            granja.fabrica,
            'app',
            etapas('A'),
            () => new PeticionFalsa(),
            opciones,
          ),
        ),
      );

      expect((error as Error).message).toBe(
        'fallo simulado en la lectura final',
      );
      expect(observador.abierto).toBe(false);
      granja.sinControlesAbiertos();
    });

    it('sondeo que nunca responde aunque la petición ya devolvió 200: se acota, se cancela la consulta y se limpia', async () => {
      const granja = new Granja();
      const observador = new ObservadorFalso({ colgarEnLaLlamada: 2 });
      const peticion = new PeticionFalsa();

      const error = await acotada(() =>
        capturar(
          medirConControles(
            () => observador,
            granja.fabrica,
            'app',
            etapas('A', 'B'),
            () => peticion,
            { ...opciones, asentarMs: 100 },
          ),
        ),
      );

      expect((error as Error).message).toContain('el cierre del sondeo');
      expect(observador.destruido).toBe(true);
      expect(observador.consultasPendientes).toBe(0);
      expect(observador.abierto).toBe(false);
      granja.sinControlesAbiertos();
    });

    it('lectura final del observador que nunca responde: se acota, se cancela la consulta y se limpia', async () => {
      const granja = new Granja();
      const observador = new ObservadorFalso({ colgarLecturaFinal: true });

      const error = await acotada(() =>
        capturar(
          medirConControles(
            () => observador,
            granja.fabrica,
            'app',
            etapas('A', 'B'),
            () => new PeticionFalsa(),
            opciones,
          ),
        ),
      );

      expect((error as Error).message).toContain(
        'la lectura final del observador',
      );
      expect(observador.destruido).toBe(true);
      expect(observador.consultasPendientes).toBe(0);
      expect(observador.abierto).toBe(false);
      granja.sinControlesAbiertos();
    });

    it('fallo del observador: el temporizador del límite de la petición queda cancelado', async () => {
      const granja = new Granja();
      const LIMITE_UNICO = 7777;
      const creados = new Set<unknown>();
      const cancelados = new Set<unknown>();
      const crear = globalThis.setTimeout;
      const cancelar = globalThis.clearTimeout;
      const espiaCrear = jest
        .spyOn(globalThis, 'setTimeout')
        .mockImplementation(((
          funcion: () => void,
          ms?: number,
          ...resto: unknown[]
        ) => {
          const asa = (crear as (...args: unknown[]) => unknown)(
            funcion,
            ms,
            ...resto,
          );
          if (ms === LIMITE_UNICO) creados.add(asa);
          return asa;
        }) as unknown as typeof setTimeout);
      const espiaCancelar = jest
        .spyOn(globalThis, 'clearTimeout')
        .mockImplementation((asa: NodeJS.Timeout) => {
          cancelados.add(asa);
          return cancelar(asa);
        });

      try {
        await acotada(() =>
          capturar(
            medirConControles(
              () => new ObservadorFalso({ caerEnLaLlamada: 2 }),
              granja.fabrica,
              'app',
              etapas('A'),
              () => new PeticionFalsa('nunca'),
              { ...opciones, limitePeticionMs: LIMITE_UNICO },
            ),
          ),
        );
      } finally {
        espiaCrear.mockRestore();
        espiaCancelar.mockRestore();
      }

      expect(creados.size).toBe(1);
      for (const asa of creados) expect(cancelados.has(asa)).toBe(true);
    });

    it('fallo de una acción programada: se propaga y las pendientes se cancelan', async () => {
      const granja = new Granja();
      let tardiaEjecutada = false;

      const error = await acotada(() =>
        capturar(
          medirConControles(
            () => new ObservadorFalso(),
            granja.fabrica,
            'app',
            etapas('A'),
            () => new PeticionFalsa(),
            {
              ...opciones,
              acciones: [
                {
                  enMs: 5,
                  ejecutar: () => Promise.reject(new Error('acción rota')),
                },
                {
                  enMs: 250,
                  ejecutar: () => {
                    tardiaEjecutada = true;
                    return Promise.resolve();
                  },
                },
              ],
            },
          ),
        ),
      );

      expect((error as Error).message).toContain('acción rota');
      await new Promise((r) => setTimeout(r, 400));
      expect(tardiaEjecutada).toBe(false);
      granja.sinControlesAbiertos();
    });

    it('fallo durante la limpieza con la medición correcta: se reporta como ErrorDeLimpieza, acotado', async () => {
      const granja = new Granja({
        A: { ROLLBACK: 'cuelga' },
        B: { end: 'falla' },
      });

      const error = await acotada(() =>
        capturar(
          medirConControles(
            () => new ObservadorFalso(),
            granja.fabrica,
            'app',
            etapas('A', 'B'),
            () => new PeticionFalsa(),
            opciones,
          ),
        ),
      );

      expect(error).toBeInstanceOf(ErrorDeLimpieza);
      const mensajes = (error as ErrorDeLimpieza).fallos.map((f) => f.message);
      expect(mensajes).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ROLLBACK de A'),
          expect.stringContaining('cierre de B'),
        ]),
      );
      expect(granja.controles.every((c) => !c.abierto)).toBe(true);
    });

    it('fallo de la petición y de la limpieza a la vez: gana el fallo original y los de limpieza quedan adjuntos', async () => {
      const granja = new Granja({ A: { end: 'cuelga' } });
      const original = new Error('fallo simulado al crear la petición');

      const error = await acotada(() =>
        capturar(
          medirConControles(
            () => new ObservadorFalso(),
            granja.fabrica,
            'app',
            etapas('A'),
            () => {
              throw original;
            },
            opciones,
          ),
        ),
      );

      expect(error).toBe(original);
      expect(fallosDeLimpiezaDe(error).map((f) => f.message)).toEqual([
        expect.stringContaining('cierre de A'),
      ]);
      expect(granja.controles[0].destruido).toBe(true);
    });
  });

  describe('esperarRespuesta', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('un aborto anticipado sin callback posterior cancela el temporizador', () => {
      const peticion = new PeticionFalsa('nunca');
      const { respuesta, abortar } = esperarRespuesta(() => peticion, 5000);
      respuesta.catch(() => undefined);
      expect(jest.getTimerCount()).toBe(1);

      abortar();

      expect(peticion.abortada).toBe(true);
      expect(jest.getTimerCount()).toBe(0);
      jest.advanceTimersByTime(10000);
      expect(peticion.abortada).toBe(true);
    });

    it('cancela el temporizador aunque abort() lance', () => {
      const peticion = new PeticionFalsa('nunca');
      peticion.abort = () => {
        throw new Error('abort roto');
      };
      const { respuesta, abortar } = esperarRespuesta(() => peticion, 5000);
      respuesta.catch(() => undefined);

      abortar();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('al vencer el límite aborta una sola vez y rechaza', async () => {
      const peticion = new PeticionFalsa('nunca');
      const abort = jest.spyOn(peticion, 'abort');
      const { respuesta, abortar } = esperarRespuesta(() => peticion, 500);
      const resultado = capturar(respuesta);

      jest.advanceTimersByTime(500);
      abortar();

      expect(await resultado).toBeInstanceOf(PeticionSinRespuesta);
      expect(abort).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('conControlesSostenidos', () => {
    it('limpia cuando el cuerpo falla, conservando su error', async () => {
      const granja = new Granja();
      const original = new Error('el cuerpo falló');

      const error = await acotada(() =>
        capturar(
          conControlesSostenidos(
            etapas('A', 'B'),
            granja.fabrica,
            () => Promise.reject(original),
            { limpiezaMs: 150 },
          ),
        ),
      );

      expect(error).toBe(original);
      granja.sinControlesAbiertos();
    });

    it('cancela las liberaciones programadas y reporta si la limpieza falla con el cuerpo correcto', async () => {
      const granja = new Granja({ A: { ROLLBACK: 'falla' } });
      let ejecutada = false;

      const error = await acotada(() =>
        capturar(
          conControlesSostenidos(
            etapas('A'),
            granja.fabrica,
            (_retenidos, programador) => {
              programador.programar('tardía', 250, () => {
                ejecutada = true;
                return Promise.resolve();
              });
              return Promise.resolve('listo');
            },
            { limpiezaMs: 150 },
          ),
        ),
      );

      expect(error).toBeInstanceOf(ErrorDeLimpieza);
      await new Promise((r) => setTimeout(r, 400));
      expect(ejecutada).toBe(false);
      expect(granja.controles.every((c) => !c.abierto)).toBe(true);
    });
  });
});
