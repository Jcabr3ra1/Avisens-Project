import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { causaDelAdaptador, esTimeoutDeBloqueo } from '../errores/bloqueo';
import { OPCIONES_TRANSACCION_ORDENADA } from './revocar-acceso';

/**
 * Presupuesto de ejecución de una transacción interactiva con bloqueos.
 *
 * Problema (T2): lock_timeout limita CADA espera y statement_timeout cada
 * sentencia, pero ninguno limita la suma. Varias esperas encadenadas pueden
 * superar los 10 s de Prisma, y entonces la petición termina en P2028/500 en
 * lugar del 409 «ocupado». Prisma tampoco interrumpe una espera en curso: el
 * vencimiento solo se nota cuando esa sentencia termina.
 *
 * Mecanismo: el presupuesto arranca al entrar al callback (reloj monotónico)
 * y, ANTES de cada paso, fija con set_config(..., is_local = true) los límites
 * de ese paso a partir de lo que queda:
 *
 *   r             = total - transcurrido - viajeMax
 *   r <= 0        -> PresupuestoAgotado, sin enviar el paso (rollback)
 *   lock_timeout  = max(1, min(tope, floor(r / k)))   ms
 *   statement_timeout = ceil(r / k) + floor(margen / k) ms
 *
 * k es el número de sentencias SQL del paso. Una escritura o un bloqueo es
 * SIEMPRE un paso de una sentencia (k = 1). Solo las lecturas simples
 * (SELECT sin FOR) pueden agruparse con k > 1; el restante se reparte entre
 * ellas porque statement_timeout vuelve a empezar en cada sentencia. Una
 * llamada de Prisma con relaciones anidadas NO es una sentencia: se descompone
 * en una por relación. La cobertura se comprueba sobre el SQL real en
 * test/presupuesto-protocolo.e2e-spec.ts. Tras el último paso,
 * verificarFinal() aborta si el presupuesto se agotó antes de devolver.
 *
 * Consecuencias declaradas:
 *
 * 1. El reparto entre k lecturas puede rechazar una operación ANTES de agotar
 *    los 8 s globales: con k = 3 y r = 0,9 s cada lectura recibe 300 ms de
 *    statement_timeout, y una lectura de 400 ms que habría cabido en el
 *    restante termina en 409.
 * 2. Los 8 s son un presupuesto de EJECUCIÓN de sentencias, no una garantía de
 *    duración de la transacción ni de la petición. viajeMax es una estimación
 *    (el mayor viaje de set_config observado hasta ese paso; vale 0 en el
 *    primero) y no acota un viaje futuro más lento. Quedan fuera: la
 *    adquisición de conexión (maxWait de Prisma y el pool de pg sin límite de
 *    espera), el COMMIT/ROLLBACK, la red y la respuesta HTTP. maxWait/P2028
 *    no se traducen aquí.
 *
 * Redondeo: floor en lock_timeout (hasta 1 ms menos por paso), ceil en
 * statement_timeout (hasta 1 ms más) y floor(margen / k) por sentencia; con
 * k lecturas la suma de statement_timeout queda en r + margen + k ms como
 * máximo. Un restante positivo menor que k ms fija lock_timeout en 1 ms
 * (nunca 0, que lo desactivaría). Postgres recibe milisegundos enteros y
 * performance.now() tiene resolución sub-milisegundo.
 *
 * 57014: se traduce solo si la causa que conserva el adaptador es 57014 con
 * el mensaje exacto de statement_timeout y la excepción llegó a la aplicación
 * no antes del vencimiento armado de ese paso (menos una tolerancia). El
 * instante de llegada es cuando la aplicación recibe y procesa la excepción,
 * no cuando Postgres la produjo: solo puede ser posterior, por eso es una
 * guardia adicional y no el criterio. Una cancelación manual
 * («...due to user request»), un mensaje desconocido o localizado, P2028 y
 * los deadlocks (40P01) se relanzan sin traducir.
 */
export const PRESUPUESTO_TOTAL_MS = 8000;
export const MARGEN_SENTENCIA_MS = 250;
export const TOPE_ESPERA_ASIGNACION_MS = 3000;
export const TOPE_ESPERA_ESCRITURA_MS = 5000;
export const TOLERANCIA_LLEGADA_MS = 150;

const CODIGO_CANCELACION = '57014';
const MENSAJE_TIMEOUT_DE_SENTENCIA =
  'canceling statement due to statement timeout';

export class PresupuestoAgotado extends Error {
  constructor(readonly momento: string) {
    super(`Presupuesto de la transacción agotado ${momento}`);
    this.name = 'PresupuestoAgotado';
  }
}

export class SentenciaVencida extends Error {
  constructor(
    readonly paso: string,
    readonly causa: unknown,
  ) {
    super(`Sentencia cancelada por statement_timeout en «${paso}»`);
    this.name = 'SentenciaVencida';
  }
}

export function esEsperaVencida(error: unknown): boolean {
  return (
    esTimeoutDeBloqueo(error) ||
    error instanceof PresupuestoAgotado ||
    error instanceof SentenciaVencida
  );
}

export type Reloj = () => number;

const relojMonotonico: Reloj = () => performance.now();

export class PresupuestoTransaccion {
  private readonly inicio: number;
  private viajeMaxMs = 0;
  private pasoActual = '';
  private vencimientoArmadoMs = 0;

  constructor(
    private readonly cliente: Prisma.TransactionClient,
    private readonly topeEsperaMs: number,
    private readonly reloj: Reloj = relojMonotonico,
    private readonly totalMs: number = PRESUPUESTO_TOTAL_MS,
    private readonly margenMs: number = MARGEN_SENTENCIA_MS,
  ) {
    this.inicio = this.reloj();
  }

  restanteMs(): number {
    return this.totalMs - (this.reloj() - this.inicio);
  }

  async paso<T>(
    nombre: string,
    ejecutar: (tx: Prisma.TransactionClient) => Promise<T>,
    sentencias = 1,
  ): Promise<T> {
    this.pasoActual = nombre;
    await this.reservar(sentencias);
    try {
      return await ejecutar(this.cliente);
    } catch (error) {
      const llegada = this.reloj();
      if (this.esCancelacionPorSentencia(error, llegada)) {
        throw new SentenciaVencida(nombre, error);
      }
      throw error;
    }
  }

  verificarFinal(): void {
    if (this.restanteMs() <= 0) {
      throw new PresupuestoAgotado('al terminar el último paso');
    }
  }

  private async reservar(sentencias: number): Promise<void> {
    const restante = this.restanteMs() - this.viajeMaxMs;
    if (restante <= 0) {
      throw new PresupuestoAgotado(`antes de «${this.pasoActual}»`);
    }
    const porSentencia = restante / sentencias;
    const esperaMs = Math.max(
      1,
      Math.min(this.topeEsperaMs, Math.floor(porSentencia)),
    );
    const sentenciaMs =
      Math.ceil(porSentencia) + Math.floor(this.margenMs / sentencias);

    const salida = this.reloj();
    await this.cliente
      .$queryRaw`SELECT set_config('lock_timeout', ${`${esperaMs}ms`}, true), set_config('statement_timeout', ${`${sentenciaMs}ms`}, true)`;
    const llegada = this.reloj();
    this.viajeMaxMs = Math.max(this.viajeMaxMs, llegada - salida);
    this.vencimientoArmadoMs = llegada + sentenciaMs;

    if (this.restanteMs() <= 0) {
      throw new PresupuestoAgotado(`tras configurar «${this.pasoActual}»`);
    }
  }

  private esCancelacionPorSentencia(error: unknown, llegada: number): boolean {
    const causa = causaDelAdaptador(error);
    return (
      causa?.originalCode === CODIGO_CANCELACION &&
      causa.originalMessage === MENSAJE_TIMEOUT_DE_SENTENCIA &&
      llegada >= this.vencimientoArmadoMs - TOLERANCIA_LLEGADA_MS
    );
  }
}

export function transaccionConPresupuesto<T>(
  prisma: Pick<PrismaService, '$transaction'>,
  topeEsperaMs: number,
  operacion: (presupuesto: PresupuestoTransaccion) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const presupuesto = new PresupuestoTransaccion(tx, topeEsperaMs);
    const resultado = await operacion(presupuesto);
    presupuesto.verificarFinal();
    return resultado;
  }, OPCIONES_TRANSACCION_ORDENADA);
}
