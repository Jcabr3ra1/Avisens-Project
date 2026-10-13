import { conLimite } from './controles';

export interface ModuloBcrypt {
  compare: (...argumentos: any[]) => Promise<boolean>;
}

export interface LimitesDeCompuerta {
  llegadaMs?: number;
  retencionMs?: number;
  terminoMs?: number;
  accionMs?: number;
}

export const LIMITE_LLEGADA_MS = 8000;
export const LIMITE_RETENCION_MS = 20000;
export const LIMITE_TERMINO_MS = 15000;
export const LIMITE_ACCION_MS = 15000;

export class CompuertaSinLlegada extends Error {
  constructor(mensaje: string, causa?: unknown) {
    super(mensaje);
    this.name = 'CompuertaSinLlegada';
    if (causa !== undefined) this.cause = causa;
  }
}

const mensajeDe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const estadoDe = (resultado: unknown): string => {
  const status = (resultado as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? ` con estado ${status}` : '';
};

export function compuertaDeBcrypt(
  modulo: ModuloBcrypt,
  password: string,
  retencionMs = LIMITE_RETENCION_MS,
) {
  let abrir: () => void = () => undefined;
  let avisar: () => void = () => undefined;
  const abierta = new Promise<void>((resolver) => (abrir = resolver));
  const llego = new Promise<void>((resolver) => (avisar = resolver));
  let usada = false;
  let temporizador: NodeJS.Timeout | undefined;
  const original = modulo.compare.bind(modulo);
  const espia = jest.spyOn(modulo, 'compare').mockImplementation((async (
    ...argumentos: unknown[]
  ) => {
    const resultado = await original(...argumentos);
    if (!usada && argumentos[0] === password) {
      usada = true;
      temporizador = setTimeout(abrir, retencionMs);
      avisar();
      await abierta;
    }
    return resultado;
  }) as never);
  return {
    llego,
    liberar: () => {
      clearTimeout(temporizador);
      abrir();
    },
    restaurar: () => espia.mockRestore(),
  };
}

export async function ensayarConCompuerta<L, A>(opciones: {
  modulo: ModuloBcrypt;
  password: string;
  iniciar: (senal: AbortSignal) => Promise<L>;
  durante: (senal: AbortSignal) => Promise<A>;
  limites?: LimitesDeCompuerta;
}): Promise<{ login: L; accion: A }> {
  const llegadaMs = opciones.limites?.llegadaMs ?? LIMITE_LLEGADA_MS;
  const terminoMs = opciones.limites?.terminoMs ?? LIMITE_TERMINO_MS;
  const accionMs = opciones.limites?.accionMs ?? LIMITE_ACCION_MS;
  const compuerta = compuertaDeBcrypt(
    opciones.modulo,
    opciones.password,
    opciones.limites?.retencionMs,
  );
  const senalDelLogin = new AbortController();
  const senalDeLaAccion = new AbortController();
  let temporizador: NodeJS.Timeout | undefined;
  let fallo: { error: unknown } | null = null;
  let loginTerminado = false;
  let login: L | undefined;
  let accion: A | undefined;
  try {
    const pendiente = Promise.resolve().then(() =>
      opciones.iniciar(senalDelLogin.signal),
    );
    const terminado = pendiente.then(
      (resultado) => {
        loginTerminado = true;
        return { resultado };
      },
      (error: unknown) => {
        loginTerminado = true;
        return { error };
      },
    );
    try {
      const plazo = new Promise<'plazo'>((resolver) => {
        temporizador = setTimeout(() => resolver('plazo'), llegadaMs);
      });
      const primero = await Promise.race([
        compuerta.llego.then(() => 'llego' as const),
        terminado,
        plazo,
      ]);
      if (primero === 'plazo') {
        throw new CompuertaSinLlegada(
          `el login no alcanzó la compuerta de bcrypt en ${llegadaMs} ms`,
        );
      }
      if (primero !== 'llego') {
        throw new CompuertaSinLlegada(
          'error' in primero
            ? `el login falló antes de alcanzar la compuerta de bcrypt: ${mensajeDe(primero.error)}`
            : `el login terminó${estadoDe(primero.resultado)} antes de alcanzar la compuerta de bcrypt`,
          'error' in primero ? primero.error : undefined,
        );
      }
      accion = await conLimite(
        Promise.resolve().then(() => opciones.durante(senalDeLaAccion.signal)),
        accionMs,
        'la acción durante la compuerta',
      );
    } catch (error) {
      fallo = { error };
      senalDeLaAccion.abort();
    } finally {
      clearTimeout(temporizador);
      compuerta.liberar();
    }
    try {
      login = await conLimite(
        pendiente,
        terminoMs,
        'el login con la compuerta abierta',
      );
    } catch (error) {
      fallo ??= { error };
    }
  } catch (error) {
    fallo ??= { error };
  } finally {
    clearTimeout(temporizador);
    compuerta.liberar();
    if (!loginTerminado) senalDelLogin.abort();
    if (fallo) senalDeLaAccion.abort();
    compuerta.restaurar();
  }
  if (fallo) throw fallo.error;
  return { login: login as L, accion: accion as A };
}
