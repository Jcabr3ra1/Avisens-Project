import { Client } from 'pg';

export interface ClienteControl {
  connect(): Promise<unknown>;
  query<R = any>(sql: string, parametros?: unknown[]): Promise<{ rows: R[] }>;
  end(): Promise<unknown>;
  destruir?(): void;
}

export interface Etapa {
  etiqueta: string;
  sql: string;
  parametros: unknown[];
  liberarMs: number | null;
}

export interface Accion {
  enMs: number;
  ejecutar: (retenidos: Map<string, ClienteControl>) => Promise<void>;
}

export interface Respuesta {
  status: number;
  body: Record<string, unknown>;
}

export interface Medicion {
  status: number;
  body: Record<string, unknown>;
  ms: number;
  bloqueadoPor: string[];
  idleEnTransaccion: number;
}

export interface Peticion {
  end(
    retorno: (error: unknown, res: { status: number; body: unknown }) => void,
  ): unknown;
  abort?(): unknown;
}

export interface Observador {
  query<R = any>(sql: string, parametros?: unknown[]): Promise<{ rows: R[] }>;
}

export interface ControlRetenido {
  c: ClienteControl;
  pid: number;
  etiqueta: string;
  conectado: boolean;
}

export const LIMITE_PETICION_MS = 13000;
export const LIMITE_LIMPIEZA_MS = 3000;
export const LIMITE_PREPARACION_MS = 5000;

export interface LimitesDeControl {
  limpiezaMs?: number;
  preparacionMs?: number;
}
const SONDEO_MS = 40;

export class ErrorDeLimpieza extends Error {
  constructor(
    readonly fallos: Error[],
    readonly original?: unknown,
  ) {
    super(
      `la limpieza de los controles falló: ${fallos
        .map((f) => f.message)
        .join(' | ')}`,
    );
    this.name = 'ErrorDeLimpieza';
  }
}

export class PeticionSinRespuesta extends Error {
  constructor(readonly limiteMs: number) {
    super(`la petición no respondió en ${limiteMs} ms y se abortó`);
    this.name = 'PeticionSinRespuesta';
  }
}

const comoError = (valor: unknown, contexto: string): Error => {
  const detalle = valor instanceof Error ? valor.message : String(valor);
  const error = new Error(`${contexto}: ${detalle}`);
  if (valor instanceof Error) error.cause = valor;
  return error;
};

const dormir = (ms: number) =>
  new Promise<void>((resolver) => setTimeout(resolver, ms));

export const conLimite = <T>(
  promesa: Promise<T>,
  ms: number,
  que: string,
): Promise<T> =>
  new Promise<T>((resolver, rechazar) => {
    const t = setTimeout(
      () => rechazar(new Error(`${que} superó el límite de ${ms} ms`)),
      ms,
    );
    promesa.then(
      (valor) => {
        clearTimeout(t);
        resolver(valor);
      },
      (error: unknown) => {
        clearTimeout(t);
        rechazar(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });

export const controlPg = (connectionString: string): ClienteControl => {
  const cliente = new Client({ connectionString });
  cliente.on('error', () => undefined);
  return Object.assign(cliente, {
    destruir: () => {
      cliente.connection.stream.destroy();
    },
  });
};

export async function cerrarControles(
  controles: ControlRetenido[],
  limiteMs = LIMITE_LIMPIEZA_MS,
): Promise<Error[]> {
  const fallos: Error[] = [];
  await Promise.all(
    controles.map(async (control) => {
      let sucio = false;
      const intentar = async (que: string, accion: () => Promise<unknown>) => {
        try {
          await conLimite(
            Promise.resolve().then(accion),
            limiteMs,
            `${que} de ${control.etiqueta}`,
          );
        } catch (error) {
          sucio = true;
          fallos.push(comoError(error, `${que} de ${control.etiqueta}`));
        }
      };
      if (control.conectado) {
        await intentar('ROLLBACK', () => control.c.query('ROLLBACK'));
      }
      await intentar('cierre', () => control.c.end());
      if ((sucio || !control.conectado) && control.c.destruir) {
        try {
          control.c.destruir();
        } catch (error) {
          fallos.push(
            comoError(error, `destrucción del socket de ${control.etiqueta}`),
          );
        }
      }
    }),
  );
  return fallos;
}

export function conservarElFallo(original: unknown, fallos: Error[]): unknown {
  if (fallos.length === 0) return original;
  console.error(
    `fallos de limpieza que acompañan al fallo original:\n${fallos
      .map((f) => `- ${f.message}`)
      .join('\n')}`,
  );
  if (typeof original === 'object' && original !== null) {
    Object.defineProperty(original, 'fallosDeLimpieza', {
      value: fallos,
      enumerable: false,
      configurable: true,
    });
    return original;
  }
  return new ErrorDeLimpieza(fallos, original);
}

export async function sostenerControles(
  etapas: Etapa[],
  fabrica: (etiqueta: string) => ClienteControl,
  limites: LimitesDeControl = {},
): Promise<ControlRetenido[]> {
  const limpiezaMs = limites.limpiezaMs ?? LIMITE_LIMPIEZA_MS;
  const preparacionMs = limites.preparacionMs ?? LIMITE_PREPARACION_MS;
  const creados: ControlRetenido[] = [];
  try {
    for (const etapa of etapas) {
      const control: ControlRetenido = {
        c: fabrica(etapa.etiqueta),
        pid: 0,
        etiqueta: etapa.etiqueta,
        conectado: false,
      };
      creados.push(control);
      const acotar = <T>(que: string, accion: () => Promise<T>) =>
        conLimite(
          Promise.resolve().then(accion),
          preparacionMs,
          `${que} de ${control.etiqueta}`,
        );
      await acotar('la conexión', () => control.c.connect());
      control.conectado = true;
      control.pid = (
        await acotar('la lectura del pid', () =>
          control.c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid'),
        )
      ).rows[0].pid;
      await acotar('BEGIN', () => control.c.query('BEGIN'));
      await acotar('el bloqueo inicial', () =>
        control.c.query(etapa.sql, etapa.parametros),
      );
    }
    return creados;
  } catch (error) {
    throw conservarElFallo(error, await cerrarControles(creados, limpiezaMs));
  }
}

export class Programador {
  readonly errores: Error[] = [];
  private readonly temporizadores = new Set<NodeJS.Timeout>();
  private readonly enCurso = new Set<Promise<void>>();

  programar(etiqueta: string, ms: number, ejecutar: () => Promise<unknown>) {
    const t = setTimeout(() => {
      this.temporizadores.delete(t);
      const corrida: Promise<void> = Promise.resolve()
        .then(ejecutar)
        .then(
          () => undefined,
          (error: unknown) => {
            this.errores.push(
              comoError(error, `la acción programada "${etiqueta}" falló`),
            );
          },
        )
        .finally(() => this.enCurso.delete(corrida));
      this.enCurso.add(corrida);
    }, ms);
    this.temporizadores.add(t);
  }

  async cancelar(limiteMs = LIMITE_LIMPIEZA_MS): Promise<Error[]> {
    for (const t of this.temporizadores) clearTimeout(t);
    this.temporizadores.clear();
    try {
      await conLimite(
        Promise.all([...this.enCurso]),
        limiteMs,
        'la espera de las acciones programadas en curso',
      );
    } catch (error) {
      this.errores.push(comoError(error, 'cancelación de acciones'));
    }
    return this.errores;
  }
}

function esperarRespuesta(
  crear: () => Peticion,
  limiteMs: number,
): { respuesta: Promise<Respuesta>; abortar: () => void } {
  const peticion = crear();
  let abortada = false;
  const abortar = () => {
    if (abortada) return;
    abortada = true;
    try {
      peticion.abort?.();
    } catch {
      return;
    }
  };
  const respuesta = new Promise<Respuesta>((resolver, rechazar) => {
    const t = setTimeout(() => {
      abortar();
      rechazar(new PeticionSinRespuesta(limiteMs));
    }, limiteMs);
    peticion.end((error, res) => {
      clearTimeout(t);
      resolver(
        error
          ? {
              status: -1,
              body: {
                error:
                  error instanceof Error
                    ? error.message
                    : 'error de la petición',
              },
            }
          : { status: res.status, body: res.body as Record<string, unknown> },
      );
    });
  });
  return { respuesta, abortar };
}

export interface OpcionesDeMedicion {
  asentarMs?: number;
  acciones?: Accion[];
  limitePeticionMs?: number;
  limiteLimpiezaMs?: number;
  limitePreparacionMs?: number;
}

export async function medirConControles(
  observador: Observador,
  fabrica: (etiqueta: string) => ClienteControl,
  aplicacion: string,
  etapas: Etapa[],
  pedido: () => Peticion,
  opciones: OpcionesDeMedicion = {},
): Promise<Medicion> {
  const limiteLimpiezaMs = opciones.limiteLimpiezaMs ?? LIMITE_LIMPIEZA_MS;
  const retenidos = await sostenerControles(etapas, fabrica, {
    limpiezaMs: limiteLimpiezaMs,
    preparacionMs: opciones.limitePreparacionMs,
  });
  const programador = new Programador();
  const vistos = new Set<string>();
  let parar = false;
  let avisarFalloDelObservador: (error: Error) => void = () => undefined;
  const falloDelObservador = new Promise<Error>((resolver) => {
    avisarFalloDelObservador = resolver;
  });
  let sondeo: Promise<void> = Promise.resolve();
  let abortar: () => void = () => undefined;
  let fallo: { error: unknown } | null = null;
  let medicion: Medicion | null = null;

  try {
    const etiquetaDePid = new Map(retenidos.map((r) => [r.pid, r.etiqueta]));
    sondeo = (async () => {
      try {
        while (!parar) {
          const r = await observador.query<{ bloqueadores: number[] }>(
            `SELECT pg_blocking_pids(pid) AS bloqueadores
               FROM pg_stat_activity
              WHERE application_name = $1 AND wait_event_type = 'Lock'`,
            [aplicacion],
          );
          for (const fila of r.rows)
            for (const pid of fila.bloqueadores)
              vistos.add(etiquetaDePid.get(pid) ?? String(pid));
          await dormir(SONDEO_MS);
        }
      } catch (error) {
        avisarFalloDelObservador(
          comoError(error, 'el observador de bloqueos falló'),
        );
      }
    })();

    const t0 = Date.now();
    retenidos.forEach((r, i) => {
      const liberarMs = etapas[i].liberarMs;
      if (liberarMs !== null) {
        programador.programar(`liberar ${r.etiqueta}`, liberarMs, () =>
          r.c.query('ROLLBACK'),
        );
      }
    });
    const porEtiqueta = new Map(retenidos.map((r) => [r.etiqueta, r.c]));
    for (const accion of opciones.acciones ?? []) {
      programador.programar(`acción a los ${accion.enMs} ms`, accion.enMs, () =>
        accion.ejecutar(porEtiqueta),
      );
    }

    const enviada = esperarRespuesta(
      pedido,
      opciones.limitePeticionMs ?? LIMITE_PETICION_MS,
    );
    abortar = enviada.abortar;
    const primero = await Promise.race([
      enviada.respuesta.then((respuesta) => ({ respuesta }) as const),
      falloDelObservador.then((error) => ({ error }) as const),
    ]);
    if ('error' in primero) throw primero.error;
    const ms = Date.now() - t0;
    await dormir(opciones.asentarMs ?? 500);
    parar = true;
    await sondeo;
    const caido = await Promise.race([
      falloDelObservador,
      Promise.resolve(null),
    ]);
    if (caido) throw caido;
    const idle = (
      await observador.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE application_name = $1 AND state LIKE 'idle in transaction%'`,
        [aplicacion],
      )
    ).rows[0].n;
    medicion = {
      status: primero.respuesta.status,
      body: primero.respuesta.body,
      ms,
      bloqueadoPor: [...vistos].sort(),
      idleEnTransaccion: idle,
    };
  } catch (error) {
    fallo = { error };
    abortar();
  }
  parar = true;
  const erroresProgramados = await programador.cancelar(limiteLimpiezaMs);
  const fallosDeLimpieza: Error[] = [];
  try {
    await conLimite(sondeo, limiteLimpiezaMs, 'el cierre del observador');
  } catch (error) {
    fallosDeLimpieza.push(comoError(error, 'cierre del observador'));
  }
  fallosDeLimpieza.push(
    ...(await cerrarControles(retenidos, limiteLimpiezaMs)),
  );
  if (fallo === null && erroresProgramados.length > 0) {
    fallo = { error: erroresProgramados[0] };
  } else {
    fallosDeLimpieza.push(...erroresProgramados);
  }
  if (fallo !== null) {
    throw conservarElFallo(fallo.error, fallosDeLimpieza);
  }
  if (fallosDeLimpieza.length > 0) {
    throw new ErrorDeLimpieza(fallosDeLimpieza);
  }
  return medicion as Medicion;
}

export async function conControlesSostenidos<T>(
  etapas: Etapa[],
  fabrica: (etiqueta: string) => ClienteControl,
  cuerpo: (
    retenidos: ControlRetenido[],
    programador: Programador,
  ) => Promise<T>,
  limites: LimitesDeControl = {},
): Promise<T> {
  const limiteLimpiezaMs = limites.limpiezaMs ?? LIMITE_LIMPIEZA_MS;
  const retenidos = await sostenerControles(etapas, fabrica, limites);
  const programador = new Programador();
  const liberar = async () => [
    ...(await programador.cancelar(limiteLimpiezaMs)),
    ...(await cerrarControles(retenidos, limiteLimpiezaMs)),
  ];
  let resultado: T;
  try {
    resultado = await cuerpo(retenidos, programador);
  } catch (error) {
    throw conservarElFallo(error, await liberar());
  }
  const fallos = await liberar();
  if (fallos.length > 0) throw new ErrorDeLimpieza(fallos);
  return resultado;
}
