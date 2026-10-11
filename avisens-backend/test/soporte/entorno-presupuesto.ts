import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';
import request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { GalponesModule } from '../../src/modules/galpones/galpones.module';
import { GranjasModule } from '../../src/modules/granjas/granjas.module';
import { OrganizacionesModule } from '../../src/modules/organizaciones/organizaciones.module';
import { UsuariosGalponesModule } from '../../src/modules/usuarios-galpones/usuarios-galpones.module';
import { UsuariosModule } from '../../src/modules/usuarios/usuarios.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../../src/common/filters/prisma-exception.filter';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { validateEnv } from '../../src/config/env.validation';

export const PASSWORD = 'Prueba-e2e-123';

export interface Respuesta {
  status: number;
  body: Record<string, unknown>;
}

export interface Etapa {
  etiqueta: string;
  sql: string;
  parametros: unknown[];
  liberarMs: number | null;
}

export interface Accion {
  enMs: number;
  ejecutar: (retenidos: Map<string, Client>) => Promise<void>;
}

export interface Medicion {
  status: number;
  body: Record<string, unknown>;
  ms: number;
  bloqueadoPor: string[];
  idleEnTransaccion: number;
}

export interface Fixture {
  org: number;
  granja: number;
  op: number;
  objetivo: number;
  previo: number;
  filaPrevia: number;
  filaObjetivo: number | null;
  token: string;
}

export class Entorno {
  readonly sufijo = `${Date.now()}-${process.pid}`;
  readonly baseUrl = process.env.DATABASE_URL as string;
  readonly apps: INestApplication[] = [];
  readonly clientes: PrismaService[] = [];
  readonly urls: Record<string, string> = {};
  readonly ids = {
    organizaciones: [] as number[],
    usuarios: [] as number[],
    granjas: [] as number[],
    galpones: [] as number[],
  };
  prisma!: PrismaService;
  observador!: Client;
  tokenAdmin = '';
  private rolOperarioId = 0;
  private rolPropietarioId = 0;
  private hash = '';
  private contador = 0;

  static async crear(): Promise<Entorno> {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL es obligatoria para estas pruebas e2e');
    }
    const entorno = new Entorno();
    await entorno.iniciar();
    return entorno;
  }

  urlConApp(aplicacion: string, puertoProxy?: number): string {
    const url = new URL(this.baseUrl);
    url.searchParams.set('application_name', aplicacion);
    if (puertoProxy) {
      url.hostname = '127.0.0.1';
      url.port = String(puertoProxy);
    }
    return url.toString();
  }

  auth(token = this.tokenAdmin) {
    return { Authorization: `Bearer ${token}` };
  }

  clientePrisma(aplicacion: string, puertoProxy?: number): PrismaService {
    const cliente = new PrismaService({
      getOrThrow: () => this.urlConApp(aplicacion, puertoProxy),
    } as unknown as ConfigService);
    this.clientes.push(cliente);
    return cliente;
  }

  async crearApp(aplicacion: string, puertoProxy?: number) {
    const prismaApp = this.clientePrisma(aplicacion, puertoProxy);
    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
        AuthModule,
        GranjasModule,
        GalponesModule,
        UsuariosModule,
        UsuariosGalponesModule,
        OrganizacionesModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaApp)
      .compile();
    const app = modulo.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(
      new HttpExceptionFilter(),
      new PrismaExceptionFilter(),
    );
    await app.init();
    await app.listen(0, '127.0.0.1');
    this.apps.push(app);
    this.urls[aplicacion] = await app.getUrl();
    return { app, prisma: prismaApp, url: this.urls[aplicacion] };
  }

  private async iniciar() {
    const datos = await this.crearApp('e2e-presupuesto-datos');
    this.prisma = datos.prisma;
    this.observador = new Client({
      connectionString: this.urlConApp('e2e-presupuesto-observador'),
    });
    await this.observador.connect();

    const [rolAdmin, rolPropietario, rolOperario] = await Promise.all(
      ['Administrador', 'Propietario', 'Operario'].map((nombre) =>
        this.prisma.rol.upsert({
          where: { nombre },
          update: {},
          create: { nombre },
        }),
      ),
    );
    this.rolPropietarioId = rolPropietario.id;
    this.rolOperarioId = rolOperario.id;
    this.hash = await bcrypt.hash(PASSWORD, 4);
    const admin = await this.prisma.usuario.create({
      data: {
        nombre_completo: 'admin',
        cedula: `admin-${this.sufijo}`,
        email: `admin-${this.sufijo}@e2e.local`,
        password_hash: this.hash,
        rol_id: rolAdmin.id,
      },
    });
    this.ids.usuarios.push(admin.id);
    this.tokenAdmin = (await this.entrar(admin.email)).access_token;
  }

  async entrar(email: string) {
    return (
      await request(this.urls['e2e-presupuesto-datos'])
        .post('/v1/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200)
    ).body as { access_token: string; refresh_token: string };
  }

  async fixture(conFilaObjetivoInactiva = false): Promise<Fixture> {
    this.contador += 1;
    const n = this.contador;
    const org = await this.prisma.organizacion.create({
      data: { nombre: `E2E presupuesto ${this.sufijo}-${n}` },
    });
    this.ids.organizaciones.push(org.id);
    const dueno = await this.prisma.usuario.create({
      data: {
        nombre_completo: 'dueno',
        cedula: `d-${this.sufijo}-${n}`,
        email: `d-${this.sufijo}-${n}@e2e.local`,
        password_hash: this.hash,
        rol_id: this.rolPropietarioId,
        organizacion_id: org.id,
      },
    });
    this.ids.usuarios.push(dueno.id);
    const granja = await this.prisma.granja.create({
      data: {
        nombre: `Granja ${this.sufijo}-${n}`,
        propietario_id: dueno.id,
        organizacion_id: org.id,
      },
    });
    this.ids.granjas.push(granja.id);
    const op = await this.prisma.usuario.create({
      data: {
        nombre_completo: 'operario',
        cedula: `o-${this.sufijo}-${n}`,
        email: `o-${this.sufijo}-${n}@e2e.local`,
        password_hash: this.hash,
        rol_id: this.rolOperarioId,
        organizacion_id: org.id,
      },
    });
    this.ids.usuarios.push(op.id);
    const galpones: number[] = [];
    for (const sufijoGalpon of ['a', 'b']) {
      const g = await this.prisma.galpon.create({
        data: {
          granja_id: granja.id,
          codigo: `GP-${this.sufijo}-${n}${sufijoGalpon}`,
          nombre: `Galpón ${n}${sufijoGalpon}`,
          capacidad_aves: 300,
        },
      });
      this.ids.galpones.push(g.id);
      galpones.push(g.id);
    }
    const [objetivo, previo] = galpones;
    const filaPrevia = await this.prisma.usuarioGalpon.create({
      data: { usuario_id: op.id, galpon_id: previo },
    });
    const filaObjetivo = conFilaObjetivoInactiva
      ? await this.prisma.usuarioGalpon.create({
          data: { usuario_id: op.id, galpon_id: objetivo, activa: false },
        })
      : null;
    const sesion = await this.entrar(op.email);
    return {
      org: org.id,
      granja: granja.id,
      op: op.id,
      objetivo,
      previo,
      filaPrevia: filaPrevia.id,
      filaObjetivo: filaObjetivo?.id ?? null,
      token: sesion.access_token,
    };
  }

  async sostener(etapas: Etapa[]) {
    const retenidos: { c: Client; pid: number; etiqueta: string }[] = [];
    for (const etapa of etapas) {
      const c = new Client({
        connectionString: this.urlConApp(
          `e2e-presupuesto-ctl-${etapa.etiqueta}`,
        ),
      });
      c.on('error', () => undefined);
      await c.connect();
      const pid = (
        await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
      ).rows[0].pid;
      await c.query('BEGIN');
      await c.query(etapa.sql, etapa.parametros);
      retenidos.push({ c, pid, etiqueta: etapa.etiqueta });
    }
    return retenidos;
  }

  async medir(
    aplicacion: string,
    etapas: Etapa[],
    pedido: () => request.Test,
    opciones: { asentarMs?: number; acciones?: Accion[] } = {},
  ): Promise<Medicion> {
    const retenidos = await this.sostener(etapas);
    const etiquetaDePid = new Map(retenidos.map((r) => [r.pid, r.etiqueta]));
    const vistos = new Set<string>();
    let parar = false;
    const sondeo = (async () => {
      while (!parar) {
        const r = await this.observador.query<{ bloqueadores: number[] }>(
          `SELECT pg_blocking_pids(pid) AS bloqueadores
             FROM pg_stat_activity
            WHERE application_name = $1 AND wait_event_type = 'Lock'`,
          [aplicacion],
        );
        for (const fila of r.rows)
          for (const pid of fila.bloqueadores)
            vistos.add(etiquetaDePid.get(pid) ?? String(pid));
        await new Promise((resolver) => setTimeout(resolver, 40));
      }
    })();

    const temporizadores: NodeJS.Timeout[] = [];
    const t0 = Date.now();
    retenidos.forEach((r, i) => {
      const liberarMs = etapas[i].liberarMs;
      if (liberarMs !== null) {
        temporizadores.push(
          setTimeout(() => {
            void r.c.query('ROLLBACK').catch(() => undefined);
          }, liberarMs),
        );
      }
    });
    const porEtiqueta = new Map(retenidos.map((r) => [r.etiqueta, r.c]));
    for (const accion of opciones.acciones ?? []) {
      temporizadores.push(
        setTimeout(() => {
          void accion.ejecutar(porEtiqueta).catch(() => undefined);
        }, accion.enMs),
      );
    }

    const respuesta = await new Promise<Respuesta>((resolver) => {
      pedido().end((error, res) => {
        resolver(
          error
            ? { status: -1, body: { error: String(error) } }
            : { status: res.status, body: res.body as Record<string, unknown> },
        );
      });
    });
    const ms = Date.now() - t0;
    await new Promise((resolver) =>
      setTimeout(resolver, opciones.asentarMs ?? 500),
    );
    parar = true;
    await sondeo;
    const idle = (
      await this.observador.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE application_name = $1 AND state LIKE 'idle in transaction%'`,
        [aplicacion],
      )
    ).rows[0].n;
    for (const t of temporizadores) clearTimeout(t);
    for (const r of retenidos) {
      await r.c.query('ROLLBACK').catch(() => undefined);
      await r.c.end().catch(() => undefined);
    }
    return {
      status: respuesta.status,
      body: respuesta.body,
      ms,
      bloqueadoPor: [...vistos].sort(),
      idleEnTransaccion: idle,
    };
  }

  async limpiar() {
    const { ids, prisma } = this;
    await prisma.usuarioGalpon.deleteMany({
      where: {
        OR: [
          { galpon_id: { in: ids.galpones } },
          { usuario_id: { in: ids.usuarios } },
        ],
      },
    });
    await prisma.galpon.deleteMany({ where: { id: { in: ids.galpones } } });
    await prisma.granja.deleteMany({ where: { id: { in: ids.granjas } } });
    await prisma.sesion.deleteMany({
      where: { usuario_id: { in: ids.usuarios } },
    });
    await prisma.seguridadCuenta.deleteMany({
      where: { usuario_id: { in: ids.usuarios } },
    });
    await prisma.usuario.deleteMany({ where: { id: { in: ids.usuarios } } });
    await prisma.organizacion.deleteMany({
      where: { id: { in: ids.organizaciones } },
    });
    await this.observador.end();
    for (const app of this.apps) await app.close();
    for (const cliente of this.clientes) await cliente.$disconnect();
  }
}
