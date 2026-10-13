import { Client } from 'pg';
import { conLimite } from './controles';

export const LIMITE_ABANDONO_MS = 3000;
export const LIMITE_INICIO_MS = 5000;

export interface ConexionPg {
  connect(): Promise<unknown>;
  query<R = any>(sql: string, parametros?: unknown[]): Promise<{ rows: R[] }>;
  end(): Promise<unknown>;
  destruir(): void;
}

export interface OpcionesDeObservador {
  fabrica?: (url: string) => ConexionPg;
  terminar?: (pid: number) => Promise<void>;
  inicioMs?: number;
  abandonoMs?: number;
}

export const conexionPg = (url: string): ConexionPg => {
  const cliente = new Client({ connectionString: url });
  cliente.on('error', () => undefined);
  return {
    connect: () => cliente.connect(),
    query: (sql: string, parametros?: unknown[]) =>
      cliente.query<any>(sql, parametros as unknown[]),
    end: () => cliente.end(),
    destruir: () => cliente.connection.stream.destroy(),
  };
};

interface Intento {
  conexion: ConexionPg;
  pid: number;
  promesa: Promise<ConexionPg>;
}

const mensaje = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const sinRechazoSuelto = <T>(promesa: Promise<T>): Promise<T> => {
  promesa.catch(() => undefined);
  return promesa;
};

export class ObservadorRenovable {
  private actual: Intento | null = null;
  private cerrado = false;
  private readonly fabrica: (url: string) => ConexionPg;
  private readonly terminar: (pid: number) => Promise<void>;
  private readonly inicioMs: number;
  private readonly abandonoMs: number;

  constructor(
    private readonly url: string,
    opciones: OpcionesDeObservador = {},
  ) {
    this.fabrica = opciones.fabrica ?? conexionPg;
    this.terminar = opciones.terminar ?? ((pid) => this.terminarBackend(pid));
    this.inicioMs = opciones.inicioMs ?? LIMITE_INICIO_MS;
    this.abandonoMs = opciones.abandonoMs ?? LIMITE_ABANDONO_MS;
  }

  async connect(): Promise<void> {
    await this.asegurar();
  }

  async query<R = any>(
    sql: string,
    parametros?: unknown[],
  ): Promise<{ rows: R[] }> {
    const conexion = await this.asegurar();
    return conexion.query<R>(sql, parametros);
  }

  async abandonar(): Promise<void> {
    const intento = this.actual;
    this.actual = null;
    if (!intento) return;
    const fallos: string[] = [];
    if (intento.pid > 0) {
      try {
        await conLimite(
          Promise.resolve().then(() => this.terminar(intento.pid)),
          this.abandonoMs,
          'la terminación del backend del observador',
        );
      } catch (error) {
        fallos.push(mensaje(error));
      }
    }
    intento.conexion.destruir();
    if (fallos.length > 0) {
      throw new Error(
        `el observador se destruyó pero el backend no confirmó su terminación: ${fallos.join(' | ')}`,
      );
    }
  }

  async end(): Promise<void> {
    this.cerrado = true;
    const intento = this.actual;
    this.actual = null;
    if (!intento) return;
    try {
      await conLimite(
        sinRechazoSuelto(intento.promesa.then(() => intento.conexion.end())),
        this.abandonoMs,
        'el cierre del observador',
      );
    } catch (error) {
      intento.conexion.destruir();
      throw error;
    }
  }

  private asegurar(): Promise<ConexionPg> {
    if (this.cerrado) {
      return Promise.reject(new Error('el observador ya está cerrado'));
    }
    if (this.actual) return this.actual.promesa;
    const intento: Intento = {
      conexion: this.fabrica(this.url),
      pid: 0,
      promesa: Promise.resolve(null as never),
    };
    this.actual = intento;
    intento.promesa = sinRechazoSuelto(this.iniciar(intento));
    return intento.promesa;
  }

  private async iniciar(intento: Intento): Promise<ConexionPg> {
    const { conexion } = intento;
    try {
      await conLimite(
        sinRechazoSuelto(Promise.resolve().then(() => conexion.connect())),
        this.inicioMs,
        'la conexión del observador',
      );
      const { rows } = await conLimite(
        sinRechazoSuelto(
          Promise.resolve().then(() =>
            conexion.query<{ pid: number }>('SELECT pg_backend_pid() AS pid'),
          ),
        ),
        this.inicioMs,
        'la lectura del pid del observador',
      );
      if (this.actual !== intento) {
        throw new Error('el observador se abandonó durante su inicialización');
      }
      intento.pid = rows[0].pid;
      return conexion;
    } catch (error) {
      if (this.actual === intento) this.actual = null;
      conexion.destruir();
      throw error;
    }
  }

  private async terminarBackend(pid: number): Promise<void> {
    const verdugo = conexionPg(this.url);
    try {
      await verdugo.connect();
      await verdugo.query('SELECT pg_terminate_backend($1)', [pid]);
    } finally {
      verdugo.destruir();
    }
  }
}
