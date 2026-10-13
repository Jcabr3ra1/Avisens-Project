import { Client } from 'pg';
import { conLimite } from './controles';

const LIMITE_ABANDONO_MS = 3000;

export class ObservadorRenovable {
  private cliente: Client | null = null;
  private pid = 0;

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    await this.asegurar();
  }

  async query<R = any>(
    sql: string,
    parametros?: unknown[],
  ): Promise<{ rows: R[] }> {
    const cliente = await this.asegurar();
    return cliente.query<any>(sql, parametros as unknown[]);
  }

  async abandonar(): Promise<void> {
    const cliente = this.cliente;
    const pid = this.pid;
    this.cliente = null;
    this.pid = 0;
    if (!cliente) return;
    const fallos: string[] = [];
    if (pid > 0) {
      const verdugo = new Client({ connectionString: this.url });
      verdugo.on('error', () => undefined);
      try {
        await conLimite(
          (async () => {
            await verdugo.connect();
            await verdugo.query('SELECT pg_terminate_backend($1)', [pid]);
          })(),
          LIMITE_ABANDONO_MS,
          'la terminación del backend del observador',
        );
      } catch (error) {
        fallos.push(error instanceof Error ? error.message : String(error));
      }
      verdugo.connection.stream.destroy();
    }
    cliente.connection.stream.destroy();
    if (fallos.length > 0) {
      throw new Error(
        `el observador se destruyó pero el backend no confirmó su terminación: ${fallos.join(' | ')}`,
      );
    }
  }

  async end(): Promise<void> {
    const cliente = this.cliente;
    this.cliente = null;
    this.pid = 0;
    if (cliente) await cliente.end();
  }

  private async asegurar(): Promise<Client> {
    if (this.cliente) return this.cliente;
    const cliente = new Client({ connectionString: this.url });
    cliente.on('error', () => undefined);
    await cliente.connect();
    const { rows } = await cliente.query<{ pid: number }>(
      'SELECT pg_backend_pid() AS pid',
    );
    this.cliente = cliente;
    this.pid = rows[0].pid;
    return cliente;
  }
}
