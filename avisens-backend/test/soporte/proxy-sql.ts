import * as net from 'node:net';

export interface EventoSql {
  t: number;
  conn: number;
  sql: string;
}

export interface ErrorServidor {
  t: number;
  conn: number;
  code: string;
  msg: string;
}

export interface TransaccionCapturada {
  conn: number;
  preambulo: string[];
  grupos: string[][];
  cierre: string;
}

const configuracionDelPresupuesto = "set_config('lock_timeout'";

const leerCadena = (b: Buffer, off: number) => {
  const fin = b.indexOf(0, off);
  return { s: b.toString('utf8', off, fin), next: fin + 1 };
};

const normalizar = (sql: string) => sql.replace(/\s+/g, ' ').trim();

export class ProxySql {
  readonly eventos: EventoSql[] = [];
  readonly errores: ErrorServidor[] = [];
  private servidor?: net.Server;
  private readonly sockets = new Set<net.Socket>();
  private contador = 0;

  constructor(private readonly destino: URL) {}

  iniciar(): Promise<number> {
    return new Promise((resolver) => {
      this.servidor = net.createServer((cli) => this.atender(cli));
      this.servidor.listen(0, '127.0.0.1', () =>
        resolver((this.servidor!.address() as net.AddressInfo).port),
      );
    });
  }

  async cerrar(): Promise<void> {
    for (const socket of this.sockets) socket.destroy();
    await new Promise<void>((resolver) => {
      if (!this.servidor) return resolver();
      this.servidor.close(() => resolver());
    });
  }

  reiniciar(): void {
    this.eventos.length = 0;
    this.errores.length = 0;
  }

  transacciones(): TransaccionCapturada[] {
    const porConexion = new Map<number, EventoSql[]>();
    for (const evento of this.eventos) {
      const lista = porConexion.get(evento.conn) ?? [];
      lista.push(evento);
      porConexion.set(evento.conn, lista);
    }
    const resultado: TransaccionCapturada[] = [];
    for (const [conn, lista] of porConexion) {
      let actual: TransaccionCapturada | null = null;
      for (const evento of lista) {
        const sql = normalizar(evento.sql);
        if (/^BEGIN/i.test(sql)) {
          actual = { conn, preambulo: [], grupos: [], cierre: '' };
          continue;
        }
        if (!actual) continue;
        if (/^(COMMIT|ROLLBACK)$/i.test(sql)) {
          actual.cierre = sql.toUpperCase();
          resultado.push(actual);
          actual = null;
          continue;
        }
        if (sql.includes(configuracionDelPresupuesto)) {
          actual.grupos.push([]);
          continue;
        }
        if (actual.grupos.length === 0) actual.preambulo.push(sql);
        else actual.grupos[actual.grupos.length - 1].push(sql);
      }
    }
    return resultado;
  }

  private atender(cli: net.Socket): void {
    const conn = ++this.contador;
    const dest = net.connect(Number(this.destino.port), this.destino.hostname);
    this.sockets.add(cli);
    this.sockets.add(dest);
    let bufC = Buffer.alloc(0);
    let inicio = true;
    const nombres = new Map<string, string>();
    let ultimoBind = '';

    cli.on('data', (d: Buffer) => {
      dest.write(d);
      bufC = Buffer.concat([bufC, d]);
      for (;;) {
        if (inicio) {
          if (bufC.length < 8) break;
          const len = bufC.readInt32BE(0);
          if (bufC.length < len) break;
          const codigo = bufC.readInt32BE(4);
          bufC = bufC.subarray(len);
          if (codigo !== 80877103) inicio = false;
          continue;
        }
        if (bufC.length < 5) break;
        const tipo = String.fromCharCode(bufC[0]);
        const len = bufC.readInt32BE(1);
        if (bufC.length < 1 + len) break;
        const cuerpo = bufC.subarray(5, 1 + len);
        if (tipo === 'P') {
          const nombre = leerCadena(cuerpo, 0);
          const consulta = leerCadena(cuerpo, nombre.next);
          nombres.set(nombre.s, consulta.s);
        } else if (tipo === 'B') {
          const portal = leerCadena(cuerpo, 0);
          ultimoBind = leerCadena(cuerpo, portal.next).s;
        } else if (tipo === 'E') {
          this.eventos.push({
            t: Date.now(),
            conn,
            sql: nombres.get(ultimoBind) ?? `?${ultimoBind}`,
          });
        } else if (tipo === 'Q') {
          this.eventos.push({
            t: Date.now(),
            conn,
            sql: leerCadena(cuerpo, 0).s,
          });
        }
        bufC = bufC.subarray(1 + len);
      }
    });

    let bufS = Buffer.alloc(0);
    dest.on('data', (d: Buffer) => {
      cli.write(d);
      bufS = Buffer.concat([bufS, d]);
      for (;;) {
        if (bufS.length < 5) break;
        const tipo = String.fromCharCode(bufS[0]);
        if (tipo === 'N' && bufS.length === 1) {
          bufS = bufS.subarray(1);
          break;
        }
        const len = bufS.readInt32BE(1);
        if (bufS.length < 1 + len) break;
        if (tipo === 'E') {
          const cuerpo = bufS.subarray(5, 1 + len);
          let off = 0;
          let code = '';
          let msg = '';
          while (off < cuerpo.length && cuerpo[off] !== 0) {
            const campo = String.fromCharCode(cuerpo[off]);
            const valor = leerCadena(cuerpo, off + 1);
            if (campo === 'C') code = valor.s;
            if (campo === 'M') msg = valor.s;
            off = valor.next;
          }
          this.errores.push({ t: Date.now(), conn, code, msg });
        }
        bufS = bufS.subarray(1 + len);
      }
    });

    cli.on('close', () => dest.destroy());
    dest.on('close', () => cli.destroy());
    cli.on('error', () => undefined);
    dest.on('error', () => undefined);
  }
}

const BLOQUEA_FILAS = /\bFOR\s+(UPDATE|SHARE|NO KEY UPDATE|KEY SHARE)\b/i;
const LECTURA_SIMPLE = /^SELECT\b/i;

export const esLecturaSimple = (sql: string): boolean =>
  LECTURA_SIMPLE.test(sql) && !BLOQUEA_FILAS.test(sql);

export function violacionesDelProtocolo(
  transaccion: TransaccionCapturada,
  tamanosEsperados: number[],
  sentenciasDeclaradas?: number[],
): string[] {
  const violaciones: string[] = [];
  const antes = transaccion.preambulo.filter(
    (sql) => !/^SET TRANSACTION ISOLATION LEVEL\b/i.test(sql),
  );
  if (antes.length > 0) {
    violaciones.push(
      `sentencias antes del primer set_config: ${antes.join(' | ')}`,
    );
  }
  transaccion.grupos.forEach((grupo, i) => {
    if (grupo.length === 0) {
      violaciones.push(`el grupo ${i} no ejecutó ninguna sentencia`);
    }
    if (grupo.length > 1) {
      const noLecturas = grupo.filter((sql) => !esLecturaSimple(sql));
      if (noLecturas.length > 0) {
        violaciones.push(
          `el grupo ${i} agrupa ${grupo.length} sentencias y no todas son lecturas simples: ${noLecturas
            .map((sql) => sql.slice(0, 60))
            .join(' | ')}`,
        );
      }
    }
  });
  const tamanos = transaccion.grupos.map((grupo) => grupo.length);
  if (JSON.stringify(tamanos) !== JSON.stringify(tamanosEsperados)) {
    violaciones.push(
      `grupos reales ${JSON.stringify(tamanos)} distintos de los esperados ${JSON.stringify(tamanosEsperados)}`,
    );
  }
  if (
    sentenciasDeclaradas &&
    JSON.stringify(tamanos) !== JSON.stringify(sentenciasDeclaradas)
  ) {
    violaciones.push(
      `grupos reales ${JSON.stringify(tamanos)} distintos de las sentencias declaradas por los pasos ${JSON.stringify(sentenciasDeclaradas)}`,
    );
  }
  if (!/^(COMMIT|ROLLBACK)$/.test(transaccion.cierre)) {
    violaciones.push(`la transacción no cerró con COMMIT/ROLLBACK`);
  }
  return violaciones;
}
