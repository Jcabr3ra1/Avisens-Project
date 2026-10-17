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
import { AuthModule } from '../src/modules/auth/auth.module';
import { GalponesModule } from '../src/modules/galpones/galpones.module';
import { GranjasModule } from '../src/modules/granjas/granjas.module';
import { OrganizacionesModule } from '../src/modules/organizaciones/organizaciones.module';
import { UsuariosGalponesModule } from '../src/modules/usuarios-galpones/usuarios-galpones.module';
import { UsuariosModule } from '../src/modules/usuarios/usuarios.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { validateEnv } from '../src/config/env.validation';

const TOPE_BARRERA_MS = 1000;
const APP_ASIGNACION = 'e2e-carrera-asignacion-1';
const APP_ESCRITOR = 'e2e-carrera-desactivacion';
const MENSAJE_ASIGNACION_OCUPADA =
  'Hay otra operación modificando los datos de esta asignación; intenta de nuevo';
const MENSAJE_USUARIO_OCUPADO =
  'El usuario está siendo modificado por otra operación; intenta de nuevo';
const MENSAJE_ORGANIZACION_OCUPADA =
  'La organización está siendo modificada por otra operación; intenta de nuevo';

type ViaAsignacion =
  | 'POST /usuarios-galpones'
  | 'POST /usuarios/:id/galpones'
  | 'PATCH /usuarios-galpones/:id/activar';
type Escritor =
  | 'DELETE usuario'
  | 'PATCH activo:false'
  | 'DELETE organización'
  | 'DELETE permanente';

const VIAS: ViaAsignacion[] = [
  'POST /usuarios-galpones',
  'POST /usuarios/:id/galpones',
  'PATCH /usuarios-galpones/:id/activar',
];
const ESCRITORES: Escritor[] = [
  'DELETE usuario',
  'PATCH activo:false',
  'DELETE organización',
  'DELETE permanente',
];

interface Respuesta {
  status: number;
  body: Record<string, unknown>;
}

interface Peticion {
  nombre: string;
  terminada: boolean;
  resultado: Respuesta | null;
  promesa: Promise<Respuesta>;
}

class BarreraNoAlcanzada extends Error {
  constructor(detalle: string) {
    super(
      `BARRERA NO ALCANZADA (no es una aserción del estado final): ${detalle}`,
    );
  }
}

interface Org {
  org: number;
  granja: number;
  ops: number[];
  gs: number[];
}

describe('Usuario: asignación frente a desactivación de usuario y organización, concurrencia determinista (e2e)', () => {
  jest.setTimeout(40000);

  const baseUrl = process.env.DATABASE_URL as string;
  const sufijo = `${Date.now()}-${process.pid}`;
  const password = 'Prueba-e2e-123';
  const apps: INestApplication[] = [];
  const urls: Record<string, string> = {};
  let prisma: PrismaService;
  let servidorDatos: string;
  let tokenAdmin: string;
  let rolOperarioId: number;
  let rolAdminId: number;
  let rolPropietarioId: number;
  let hash: string;
  let contador = 0;
  let control: Client;
  let pidControl = 0;
  let observador: Client;
  let enTransaccionControl = false;
  const peticiones: Peticion[] = [];
  const ids = {
    organizaciones: [] as number[],
    usuarios: [] as number[],
    granjas: [] as number[],
    galpones: [] as number[],
  };

  const urlConApp = (aplicacion: string) => {
    const url = new URL(baseUrl);
    url.searchParams.set('application_name', aplicacion);
    return url.toString();
  };

  const auth = (token = tokenAdmin) => ({ Authorization: `Bearer ${token}` });

  const crearApp = async (aplicacion: string) => {
    const prismaApp = new PrismaService({
      getOrThrow: () => urlConApp(aplicacion),
    } as unknown as ConfigService);
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
    apps.push(app);
    urls[aplicacion] = await app.getUrl();
    return { app, prisma: prismaApp };
  };

  const iniciar = (nombre: string, pedido: request.Test): Peticion => {
    const peticion: Peticion = {
      nombre,
      terminada: false,
      resultado: null,
      promesa: Promise.resolve({ status: 0, body: {} }),
    };
    peticion.promesa = new Promise<Respuesta>((resolver) => {
      pedido.end((error, res) => {
        peticion.terminada = true;
        peticion.resultado = error
          ? { status: -1, body: { error: String(error) } }
          : { status: res.status, body: res.body as Record<string, unknown> };
        resolver(peticion.resultado);
      });
    });
    peticiones.push(peticion);
    return peticion;
  };

  const volcado = async () => {
    const r = await observador.query(
      `SELECT pid, application_name, state, wait_event_type, wait_event,
              pg_blocking_pids(pid) AS bloqueadores, left(query, 90) AS consulta
         FROM pg_stat_activity
        WHERE application_name LIKE 'e2e-carrera-%' ORDER BY application_name, pid`,
    );
    return JSON.stringify(r.rows);
  };

  const esperarBloqueo = async (
    aplicacion: string,
    bloqueadores: number[],
    peticion: Peticion,
  ): Promise<number> => {
    const limite = Date.now() + TOPE_BARRERA_MS;
    for (;;) {
      if (peticion.terminada) {
        throw new BarreraNoAlcanzada(
          `${peticion.nombre} terminó sin bloquearse (${JSON.stringify(peticion.resultado)}). Conexiones: ${await volcado()}`,
        );
      }
      const r = await observador.query<{ pid: number; bloqueadores: number[] }>(
        `SELECT pid, pg_blocking_pids(pid) AS bloqueadores
           FROM pg_stat_activity
          WHERE application_name = $1 AND wait_event_type = 'Lock'`,
        [aplicacion],
      );
      const fila = r.rows.find((f) =>
        f.bloqueadores.some((b) => bloqueadores.includes(b)),
      );
      if (fila) return fila.pid;
      if (Date.now() > limite) {
        throw new BarreraNoAlcanzada(
          `${peticion.nombre} no quedó bloqueada por ${JSON.stringify(bloqueadores)} en ${TOPE_BARRERA_MS} ms. Conexiones: ${await volcado()}`,
        );
      }
      await new Promise((resolver) => setTimeout(resolver, 10));
    }
  };

  const retener = async (sql: string, parametros: unknown[] = []) => {
    if (!enTransaccionControl) {
      await control.query('BEGIN');
      enTransaccionControl = true;
    }
    await control.query(sql, parametros);
  };

  const liberar = async () => {
    if (enTransaccionControl) {
      await control.query('ROLLBACK');
      enTransaccionControl = false;
    }
  };

  const respuestaEn = async (
    peticion: Peticion,
    milisegundos = 12000,
  ): Promise<Respuesta> => {
    let temporizador: NodeJS.Timeout | undefined;
    const vencida = new Promise<never>((_, rechazar) => {
      temporizador = setTimeout(
        () =>
          rechazar(
            new Error(
              `${peticion.nombre} no respondió en ${milisegundos} ms (sin lock_timeout la espera no termina sola)`,
            ),
          ),
        milisegundos,
      );
    });
    try {
      return await Promise.race([peticion.promesa, vencida]);
    } finally {
      clearTimeout(temporizador);
    }
  };

  const correr = async (cuerpo: () => Promise<void>) => {
    try {
      await cuerpo();
    } finally {
      await liberar();
      await Promise.allSettled(peticiones.map((p) => p.promesa));
      peticiones.length = 0;
    }
  };

  const entrar = async (email: string) =>
    (
      await request(servidorDatos)
        .post('/v1/auth/login')
        .send({ email, password })
        .expect(200)
    ).body as { access_token: string; refresh_token: string };

  const emailDe = async (id: number) =>
    (await prisma.usuario.findUniqueOrThrow({ where: { id } })).email;

  const nuevaOrg = async (
    operarios: number,
    galpones: number,
    asignarTodo = false,
  ): Promise<Org> => {
    contador += 1;
    const org = await prisma.organizacion.create({
      data: { nombre: `E2E org ${sufijo}-${contador}` },
    });
    ids.organizaciones.push(org.id);
    const dueno = await prisma.usuario.create({
      data: {
        nombre_completo: 'dueno',
        cedula: `d-${sufijo}-${contador}`,
        email: `d-${sufijo}-${contador}@e2e.local`,
        password_hash: hash,
        rol_id: rolPropietarioId,
        organizacion_id: org.id,
      },
    });
    ids.usuarios.push(dueno.id);
    const granja = await prisma.granja.create({
      data: {
        nombre: `Granja ${sufijo}-${contador}`,
        propietario_id: dueno.id,
        organizacion_id: org.id,
      },
    });
    ids.granjas.push(granja.id);
    const ops: number[] = [];
    const gs: number[] = [];
    for (let i = 0; i < operarios; i++) {
      contador += 1;
      const u = await prisma.usuario.create({
        data: {
          nombre_completo: `op-${i}`,
          cedula: `o-${sufijo}-${contador}`,
          email: `o-${sufijo}-${contador}@e2e.local`,
          password_hash: hash,
          rol_id: rolOperarioId,
          organizacion_id: org.id,
        },
      });
      ids.usuarios.push(u.id);
      ops.push(u.id);
    }
    for (let j = 0; j < galpones; j++) {
      contador += 1;
      const g = await prisma.galpon.create({
        data: {
          granja_id: granja.id,
          codigo: `GU-${sufijo}-${contador}`,
          nombre: `Galpón ${contador}`,
          capacidad_aves: 300,
        },
      });
      ids.galpones.push(g.id);
      gs.push(g.id);
    }
    if (asignarTodo) {
      for (const u of ops)
        for (const g of gs)
          await prisma.usuarioGalpon.create({
            data: { usuario_id: u, galpon_id: g },
          });
    }
    return { org: org.id, granja: granja.id, ops, gs };
  };

  const filaDe = (usuario: number, galpon: number) =>
    prisma.usuarioGalpon.findUnique({
      where: {
        usuario_id_galpon_id: { usuario_id: usuario, galpon_id: galpon },
      },
    });

  const filasActivas = (usuario: number) =>
    prisma.usuarioGalpon.count({
      where: { usuario_id: usuario, activa: true },
    });

  const sesionesVivas = (usuario: number) =>
    prisma.sesion.count({ where: { usuario_id: usuario, revocada: false } });

  const usuarioActivo = async (id: number) =>
    (await prisma.usuario.findUniqueOrThrow({ where: { id } })).activo;

  const acceso = async (token: string, galpon: number) =>
    (
      await request(servidorDatos)
        .get(`/v1/galpones/${galpon}`)
        .set(auth(token))
    ).status;

  const reactivarTodo = async (o: Org, usuario: number) => {
    await request(servidorDatos)
      .patch(`/v1/organizaciones/${o.org}/activar`)
      .set(auth())
      .expect(200);
    await request(servidorDatos)
      .patch(`/v1/granjas/${o.granja}/activar`)
      .set(auth())
      .expect(200);
    await request(servidorDatos)
      .patch(`/v1/usuarios/${usuario}/activar`)
      .set(auth())
      .expect(200);
  };

  const conexionesColgadas = async () =>
    (
      await observador.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE application_name LIKE 'e2e-carrera-%' AND state LIKE 'idle in transaction%'
            AND pid <> $1`,
        [pidControl],
      )
    ).rows[0].n;

  const pedirAlta = (
    via: ViaAsignacion,
    aplicacion: string,
    op: number,
    galpon: number,
    fila: number | null,
  ) => {
    const url = urls[aplicacion];
    if (via === 'POST /usuarios-galpones') {
      return request(url)
        .post('/v1/usuarios-galpones')
        .set(auth())
        .send({ usuario_id: op, galpon_id: galpon });
    }
    if (via === 'POST /usuarios/:id/galpones') {
      return request(url)
        .post(`/v1/usuarios/${op}/galpones`)
        .set(auth())
        .send({ galpon_id: galpon });
    }
    return request(url)
      .patch(`/v1/usuarios-galpones/${fila}/activar`)
      .set(auth());
  };

  const pedirEscritor = (escritor: Escritor, aplicacion: string, o: Org) => {
    const url = urls[aplicacion];
    const op = o.ops[0];
    switch (escritor) {
      case 'DELETE usuario':
        return request(url).delete(`/v1/usuarios/${op}`).set(auth());
      case 'PATCH activo:false':
        return request(url)
          .patch(`/v1/usuarios/${op}`)
          .set(auth())
          .send({ activo: false });
      case 'DELETE organización':
        return request(url).delete(`/v1/organizaciones/${o.org}`).set(auth());
      case 'DELETE permanente':
        return request(url).delete(`/v1/usuarios/${op}/permanente`).set(auth());
    }
  };

  interface Fixture {
    o: Org;
    op: number;
    objetivo: number;
    previo: number;
    filaPrevia: number;
    filaObjetivo: number | null;
    token: string;
    refresh: string;
  }

  const fixtureAsignacion = async (via: ViaAsignacion): Promise<Fixture> => {
    const o = await nuevaOrg(2, 2);
    const [op, objetivo, previo] = [o.ops[0], o.gs[0], o.gs[1]];
    const filaPrevia = await prisma.usuarioGalpon.create({
      data: { usuario_id: op, galpon_id: previo },
    });
    const filaObjetivo =
      via === 'PATCH /usuarios-galpones/:id/activar'
        ? await prisma.usuarioGalpon.create({
            data: { usuario_id: op, galpon_id: objetivo, activa: false },
          })
        : null;
    const sesion = await entrar(await emailDe(op));
    return {
      o,
      op,
      objetivo,
      previo,
      filaPrevia: filaPrevia.id,
      filaObjetivo: filaObjetivo?.id ?? null,
      token: sesion.access_token,
      refresh: sesion.refresh_token,
    };
  };

  afterEach(async () => {
    await liberar();
    await Promise.allSettled(peticiones.map((p) => p.promesa));
    peticiones.length = 0;
  });

  beforeAll(async () => {
    const datos = await crearApp('e2e-carrera-datos');
    prisma = datos.prisma;
    servidorDatos = urls['e2e-carrera-datos'];
    await crearApp(APP_ASIGNACION);
    await crearApp('e2e-carrera-asignacion-2');
    await crearApp(APP_ESCRITOR);

    control = new Client({
      connectionString: urlConApp('e2e-carrera-control'),
    });
    await control.connect();
    pidControl = (
      await control.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
    ).rows[0].pid;
    observador = new Client({
      connectionString: urlConApp('e2e-carrera-observador'),
    });
    await observador.connect();

    const [rolAdmin, rolPropietario, rolOperario] = await Promise.all(
      ['Administrador', 'Propietario', 'Operario'].map((nombre) =>
        prisma.rol.upsert({
          where: { nombre },
          update: {},
          create: { nombre },
        }),
      ),
    );
    rolAdminId = rolAdmin.id;
    rolPropietarioId = rolPropietario.id;
    rolOperarioId = rolOperario.id;
    hash = await bcrypt.hash(password, 4);
    const admin = await prisma.usuario.create({
      data: {
        nombre_completo: 'admin',
        cedula: `admin-${sufijo}`,
        email: `admin-${sufijo}@e2e.local`,
        password_hash: hash,
        rol_id: rolAdminId,
      },
    });
    ids.usuarios.push(admin.id);
    tokenAdmin = (await entrar(admin.email)).access_token;
  });

  afterAll(async () => {
    await liberar();
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
    await control.end();
    await observador.end();
    for (const app of apps) await app.close();
  });

  describe('la asignación llega primero: la desactivación espera y revoca la fila recién creada', () => {
    for (const via of VIAS) {
      for (const escritor of ESCRITORES) {
        it(`${via} y ${escritor}`, async () => {
          const f = await fixtureAsignacion(via);
          await correr(async () => {
            await retener('SELECT id FROM galpones WHERE id = $1 FOR UPDATE', [
              f.objetivo,
            ]);
            const a = iniciar(
              'asignación',
              pedirAlta(via, APP_ASIGNACION, f.op, f.objetivo, f.filaObjetivo),
            );
            const pidA = await esperarBloqueo(APP_ASIGNACION, [pidControl], a);
            const w = iniciar(
              escritor,
              pedirEscritor(escritor, APP_ESCRITOR, f.o),
            );
            await esperarBloqueo(APP_ESCRITOR, [pidA], w);

            await liberar();
            const ra = await respuestaEn(a);
            const rw = await respuestaEn(w);

            expect([ra.status, rw.status]).toEqual([
              via === 'PATCH /usuarios-galpones/:id/activar' ? 200 : 201,
              200,
            ]);
            if (escritor === 'DELETE permanente') {
              expect(await prisma.usuario.count({ where: { id: f.op } })).toBe(
                0,
              );
              expect(
                await prisma.usuarioGalpon.count({
                  where: { usuario_id: f.op },
                }),
              ).toBe(0);
              return;
            }
            expect(await usuarioActivo(f.op)).toBe(false);
            expect(await filasActivas(f.op)).toBe(0);
            expect((await filaDe(f.op, f.objetivo))?.activa).toBe(false);
            expect(await sesionesVivas(f.op)).toBe(0);
            if (escritor === 'DELETE organización') {
              await reactivarTodo(f.o, f.op);
            } else {
              await request(servidorDatos)
                .patch(`/v1/usuarios/${f.op}/activar`)
                .set(auth())
                .expect(200);
            }
            expect(await acceso(f.token, f.objetivo)).toBe(403);
            expect(await acceso(f.token, f.previo)).toBe(403);
          });
        });
      }
    }
  });

  describe('la desactivación llega primero: la asignación espera, ve al usuario inactivo y se rechaza', () => {
    for (const via of VIAS) {
      for (const escritor of ESCRITORES) {
        it(`${via} y ${escritor}`, async () => {
          const f = await fixtureAsignacion(via);
          await correr(async () => {
            await retener(
              'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
              [f.filaPrevia],
            );
            const w = iniciar(
              escritor,
              pedirEscritor(escritor, APP_ESCRITOR, f.o),
            );
            const pidW = await esperarBloqueo(APP_ESCRITOR, [pidControl], w);
            const a = iniciar(
              'asignación',
              pedirAlta(via, APP_ASIGNACION, f.op, f.objetivo, f.filaObjetivo),
            );
            await esperarBloqueo(APP_ASIGNACION, [pidW], a);

            await liberar();
            const rw = await respuestaEn(w);
            const ra = await respuestaEn(a);

            expect(rw.status).toBe(200);
            if (escritor === 'DELETE permanente') {
              expect(ra.status).toBe(404);
              expect(ra.body.message).toBe('Usuario no encontrado');
              expect(await prisma.usuario.count({ where: { id: f.op } })).toBe(
                0,
              );
              return;
            }
            expect(ra.status).toBe(400);
            expect(ra.body.message).toBe(
              'No se puede asignar un Operario inactivo',
            );
            expect(await usuarioActivo(f.op)).toBe(false);
            expect(await filasActivas(f.op)).toBe(0);
            expect((await filaDe(f.op, f.objetivo))?.activa ?? false).toBe(
              false,
            );
            if (escritor === 'DELETE organización') {
              await reactivarTodo(f.o, f.op);
            } else {
              await request(servidorDatos)
                .patch(`/v1/usuarios/${f.op}/activar`)
                .set(auth())
                .expect(200);
            }
            expect(await acceso(f.token, f.objetivo)).toBe(403);
            expect(await acceso(f.token, f.previo)).toBe(403);
          });
        });
      }
    }
  });

  describe('paridad entre PATCH activo:false y DELETE', () => {
    it.each(['DELETE usuario', 'PATCH activo:false'] as Escritor[])(
      '%s deja usuario inactivo, sesiones revocadas y asignaciones inactivas; reactivar no las revive',
      async (escritor) => {
        const o = await nuevaOrg(1, 2, true);
        const op = o.ops[0];
        const sesion = await entrar(await emailDe(op));
        await entrar(await emailDe(op));
        expect(await sesionesVivas(op)).toBe(2);

        const r = await pedirEscritor(escritor, 'e2e-carrera-datos', o);

        expect(r.status).toBe(200);
        expect(await usuarioActivo(op)).toBe(false);
        expect(await sesionesVivas(op)).toBe(0);
        expect(await filasActivas(op)).toBe(0);
        const login = await request(servidorDatos)
          .post('/v1/auth/login')
          .send({ email: await emailDe(op), password });
        expect(login.status).toBe(401);

        await request(servidorDatos)
          .patch(`/v1/usuarios/${op}`)
          .set(auth())
          .send({ activo: true })
          .expect(200);
        expect(await acceso(sesion.access_token, o.gs[0])).toBe(403);
        expect(await filasActivas(op)).toBe(0);
        const refrescar = await request(servidorDatos)
          .post('/v1/auth/refresh')
          .send({ refresh_token: sesion.refresh_token });
        expect(refrescar.status).toBe(401);
      },
    );

    it('PATCH activo:false conserva los demás campos y la forma de la respuesta', async () => {
      const o = await nuevaOrg(1, 1, true);
      const op = o.ops[0];

      const r = await request(servidorDatos)
        .patch(`/v1/usuarios/${op}`)
        .set(auth())
        .send({ activo: false, nombre_completo: 'Nombre nuevo' });

      expect(r.status).toBe(200);
      expect(Object.keys(r.body as object).sort()).toEqual([
        'activo',
        'cedula',
        'email',
        'fecha_creacion',
        'id',
        'nombre_completo',
        'organizacion',
        'organizacion_id',
        'rol',
        'telefono',
      ]);
      expect((r.body as { activo: boolean }).activo).toBe(false);
      expect((r.body as { nombre_completo: string }).nombre_completo).toBe(
        'Nombre nuevo',
      );
      expect(
        (await prisma.usuario.findUniqueOrThrow({ where: { id: op } }))
          .nombre_completo,
      ).toBe('Nombre nuevo');
    });

    it('PATCH sin activo o con activo:true no toca sesiones ni asignaciones', async () => {
      const o = await nuevaOrg(1, 1, true);
      const op = o.ops[0];
      await entrar(await emailDe(op));

      await request(servidorDatos)
        .patch(`/v1/usuarios/${op}`)
        .set(auth())
        .send({ nombre_completo: 'Solo nombre' })
        .expect(200);
      await request(servidorDatos)
        .patch(`/v1/usuarios/${op}`)
        .set(auth())
        .send({ activo: true })
        .expect(200);

      expect(await sesionesVivas(op)).toBe(1);
      expect(await filasActivas(op)).toBe(1);
    });
  });

  describe('autorrechazo', () => {
    it('PATCH activo:false y DELETE sobre la propia cuenta son 403 y no cambian nada', async () => {
      contador += 1;
      const admin2 = await prisma.usuario.create({
        data: {
          nombre_completo: 'admin2',
          cedula: `a2-${sufijo}-${contador}`,
          email: `a2-${sufijo}-${contador}@e2e.local`,
          password_hash: hash,
          rol_id: rolAdminId,
        },
      });
      ids.usuarios.push(admin2.id);
      const { access_token } = await entrar(admin2.email);

      const patch = await request(servidorDatos)
        .patch(`/v1/usuarios/${admin2.id}`)
        .set(auth(access_token))
        .send({ activo: false, nombre_completo: 'No debe guardarse' });
      const borrado = await request(servidorDatos)
        .delete(`/v1/usuarios/${admin2.id}`)
        .set(auth(access_token));

      expect(patch.status).toBe(403);
      expect((patch.body as { message: string }).message).toBe(
        'No puedes desactivar tu propia cuenta',
      );
      expect(borrado.status).toBe(403);
      expect((borrado.body as { message: string }).message).toBe(
        'No puedes desactivar tu propia cuenta',
      );
      const tras = await prisma.usuario.findUniqueOrThrow({
        where: { id: admin2.id },
      });
      expect(tras.activo).toBe(true);
      expect(tras.nombre_completo).toBe('admin2');
      expect(await sesionesVivas(admin2.id)).toBe(1);
    });
  });

  describe('timeouts de espera: 409 y rollback completo', () => {
    it('DELETE usuario y PATCH activo:false: 409 a los ~5 s, sin cambios ni conexiones colgadas', async () => {
      for (const escritor of [
        'DELETE usuario',
        'PATCH activo:false',
      ] as Escritor[]) {
        const o = await nuevaOrg(1, 1, true);
        const op = o.ops[0];
        await entrar(await emailDe(op));
        const fila = await filaDe(op, o.gs[0]);
        await correr(async () => {
          await retener(
            'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
            [fila?.id],
          );
          const inicio = Date.now();
          const w = iniciar(escritor, pedirEscritor(escritor, APP_ESCRITOR, o));
          await esperarBloqueo(APP_ESCRITOR, [pidControl], w);
          const r = await respuestaEn(w, 15000);
          const espera = Date.now() - inicio;

          expect(r.status).toBe(409);
          expect(r.body.message).toBe(MENSAJE_USUARIO_OCUPADO);
          expect(espera).toBeGreaterThanOrEqual(4500);
          expect(espera).toBeLessThan(9000);
          expect(await usuarioActivo(op)).toBe(true);
          expect(await sesionesVivas(op)).toBe(1);
          expect(await filasActivas(op)).toBe(1);
          expect(await conexionesColgadas()).toBe(0);
        });
      }
    }, 40000);

    it('DELETE permanente: 409 y el usuario sigue intacto', async () => {
      const o = await nuevaOrg(1, 1, true);
      const op = o.ops[0];
      await entrar(await emailDe(op));
      const fila = await filaDe(op, o.gs[0]);
      await correr(async () => {
        await retener(
          'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
          [fila?.id],
        );
        const w = iniciar(
          'permanente',
          pedirEscritor('DELETE permanente', APP_ESCRITOR, o),
        );
        await esperarBloqueo(APP_ESCRITOR, [pidControl], w);
        const r = await respuestaEn(w, 15000);

        expect(r.status).toBe(409);
        expect(r.body.message).toBe(MENSAJE_USUARIO_OCUPADO);
        expect(await prisma.usuario.count({ where: { id: op } })).toBe(1);
        expect(await sesionesVivas(op)).toBe(1);
        expect(await filasActivas(op)).toBe(1);
        expect(await conexionesColgadas()).toBe(0);
      });
    }, 30000);

    it('DELETE organización: 409 y ni organización, ni usuarios, ni granjas cambian', async () => {
      const o = await nuevaOrg(2, 1, true);
      const fila = await filaDe(o.ops[1], o.gs[0]);
      await entrar(await emailDe(o.ops[0]));
      await correr(async () => {
        await retener(
          'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
          [fila?.id],
        );
        const w = iniciar(
          'organización',
          pedirEscritor('DELETE organización', APP_ESCRITOR, o),
        );
        await esperarBloqueo(APP_ESCRITOR, [pidControl], w);
        const r = await respuestaEn(w, 15000);

        expect(r.status).toBe(409);
        expect(r.body.message).toBe(MENSAJE_ORGANIZACION_OCUPADA);
        expect(
          (
            await prisma.organizacion.findUniqueOrThrow({
              where: { id: o.org },
            })
          ).activa,
        ).toBe(true);
        expect(await usuarioActivo(o.ops[0])).toBe(true);
        expect(await sesionesVivas(o.ops[0])).toBe(1);
        expect(
          (await prisma.granja.findUniqueOrThrow({ where: { id: o.granja } }))
            .activa,
        ).toBe(true);
        expect(await filasActivas(o.ops[0])).toBe(1);
        expect(await conexionesColgadas()).toBe(0);
      });
    }, 30000);

    it('la asignación espera ~3 s al usuario, responde 409 sin crear la fila y se puede reintentar', async () => {
      const o = await nuevaOrg(1, 1);
      const [op, g] = [o.ops[0], o.gs[0]];
      await correr(async () => {
        await retener('SELECT id FROM usuarios WHERE id = $1 FOR UPDATE', [op]);
        const inicio = Date.now();
        const a = iniciar(
          'asignación',
          pedirAlta('POST /usuarios-galpones', APP_ASIGNACION, op, g, null),
        );
        await esperarBloqueo(APP_ASIGNACION, [pidControl], a);
        const r = await respuestaEn(a, 10000);
        const espera = Date.now() - inicio;

        expect(r.status).toBe(409);
        expect(r.body.message).toBe(MENSAJE_ASIGNACION_OCUPADA);
        expect(espera).toBeGreaterThanOrEqual(2500);
        expect(espera).toBeLessThan(6000);
        expect(await filaDe(op, g)).toBeNull();
        expect(await conexionesColgadas()).toBe(0);

        await liberar();
        const reintento = await pedirAlta(
          'POST /usuarios-galpones',
          APP_ASIGNACION,
          op,
          g,
          null,
        );
        expect(reintento.status).toBe(201);
      });
    }, 30000);
  });

  describe('desactivación de organización frente a desactivación individual, ambos órdenes', () => {
    it('la organización llega primero: el DELETE de usuario espera y ambos terminan en 200', async () => {
      const o = await nuevaOrg(2, 1, true);
      const fila = await filaDe(o.ops[1], o.gs[0]);
      await entrar(await emailDe(o.ops[0]));
      await correr(async () => {
        await retener(
          'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
          [fila?.id],
        );
        const org = iniciar(
          'organización',
          pedirEscritor('DELETE organización', APP_ESCRITOR, o),
        );
        const pidOrg = await esperarBloqueo(APP_ESCRITOR, [pidControl], org);
        const usuario = iniciar(
          'usuario',
          request(urls[APP_ASIGNACION])
            .delete(`/v1/usuarios/${o.ops[0]}`)
            .set(auth()),
        );
        await esperarBloqueo(APP_ASIGNACION, [pidOrg], usuario);

        await liberar();

        expect((await respuestaEn(org)).status).toBe(200);
        expect((await respuestaEn(usuario)).status).toBe(200);
        expect(await filasActivas(o.ops[0])).toBe(0);
        expect(await filasActivas(o.ops[1])).toBe(0);
        expect(await usuarioActivo(o.ops[0])).toBe(false);
      });
    });

    it('el usuario llega primero: la organización espera su fila y ambos terminan en 200', async () => {
      const o = await nuevaOrg(2, 1, true);
      const fila = await filaDe(o.ops[0], o.gs[0]);
      await entrar(await emailDe(o.ops[0]));
      await correr(async () => {
        await retener(
          'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
          [fila?.id],
        );
        const usuario = iniciar(
          'usuario',
          request(urls[APP_ASIGNACION])
            .delete(`/v1/usuarios/${o.ops[0]}`)
            .set(auth()),
        );
        const pidUsuario = await esperarBloqueo(
          APP_ASIGNACION,
          [pidControl],
          usuario,
        );
        const org = iniciar(
          'organización',
          pedirEscritor('DELETE organización', APP_ESCRITOR, o),
        );
        await esperarBloqueo(APP_ESCRITOR, [pidUsuario], org);

        await liberar();

        expect((await respuestaEn(usuario)).status).toBe(200);
        expect((await respuestaEn(org)).status).toBe(200);
        expect(await filasActivas(o.ops[0])).toBe(0);
        expect(await filasActivas(o.ops[1])).toBe(0);
        expect(
          (
            await prisma.organizacion.findUniqueOrThrow({
              where: { id: o.org },
            })
          ).activa,
        ).toBe(false);
      });
    });
  });

  describe('galpón frente a desactivación de usuario: asignaciones bloqueadas por id', () => {
    it('el galpón llega primero y toma la fila de menor id; el usuario espera esa fila y ambos terminan', async () => {
      const o = await nuevaOrg(2, 1, true);
      const [r1, r2] = [
        await filaDe(o.ops[0], o.gs[0]),
        await filaDe(o.ops[1], o.gs[0]),
      ];
      expect((r1?.id ?? 0) < (r2?.id ?? 0)).toBe(true);
      await correr(async () => {
        await retener(
          'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
          [r2?.id],
        );
        const galpon = iniciar(
          'galpón',
          request(urls[APP_ESCRITOR])
            .delete(`/v1/galpones/${o.gs[0]}`)
            .set(auth()),
        );
        const pidGalpon = await esperarBloqueo(
          APP_ESCRITOR,
          [pidControl],
          galpon,
        );
        const usuario = iniciar(
          'usuario',
          request(urls[APP_ASIGNACION])
            .delete(`/v1/usuarios/${o.ops[0]}`)
            .set(auth()),
        );
        await esperarBloqueo(APP_ASIGNACION, [pidGalpon], usuario);

        await liberar();

        expect((await respuestaEn(galpon)).status).toBe(200);
        expect((await respuestaEn(usuario)).status).toBe(200);
        expect(await filasActivas(o.ops[0])).toBe(0);
        expect(await filasActivas(o.ops[1])).toBe(0);
      });
    });

    it('el usuario llega primero: galpón y usuario esperan la misma fila ajena y ninguno termina en 500', async () => {
      const o = await nuevaOrg(2, 1, true);
      const r2 = await filaDe(o.ops[1], o.gs[0]);
      await correr(async () => {
        await retener(
          'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
          [r2?.id],
        );
        const usuario = iniciar(
          'usuario',
          request(urls[APP_ASIGNACION])
            .delete(`/v1/usuarios/${o.ops[1]}`)
            .set(auth()),
        );
        const pidUsuario = await esperarBloqueo(
          APP_ASIGNACION,
          [pidControl],
          usuario,
        );
        const galpon = iniciar(
          'galpón',
          request(urls[APP_ESCRITOR])
            .delete(`/v1/galpones/${o.gs[0]}`)
            .set(auth()),
        );
        await esperarBloqueo(APP_ESCRITOR, [pidControl, pidUsuario], galpon);

        await liberar();

        expect((await respuestaEn(usuario)).status).toBe(200);
        expect((await respuestaEn(galpon)).status).toBe(200);
        expect(await filasActivas(o.ops[0])).toBe(0);
        expect(await filasActivas(o.ops[1])).toBe(0);
      });
    });
  });

  describe('eliminación permanente de galpón con asignaciones bloqueadas por id', () => {
    it('espera una fila ajena, la borra con las demás y elimina el galpón', async () => {
      const o = await nuevaOrg(2, 1, true);
      const fila = await filaDe(o.ops[1], o.gs[0]);
      await correr(async () => {
        await retener(
          'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
          [fila?.id],
        );
        const w = iniciar(
          'eliminar galpón',
          request(urls[APP_ESCRITOR])
            .delete(`/v1/galpones/${o.gs[0]}/permanente`)
            .set(auth()),
        );
        await esperarBloqueo(APP_ESCRITOR, [pidControl], w);

        await liberar();

        expect((await respuestaEn(w)).status).toBe(200);
        expect(await prisma.galpon.count({ where: { id: o.gs[0] } })).toBe(0);
        expect(
          await prisma.usuarioGalpon.count({ where: { galpon_id: o.gs[0] } }),
        ).toBe(0);
      });
    });
  });

  describe('estrés complementario sobre el código real', () => {
    it('desactivaciones, eliminaciones y asignaciones simultáneas no dan 500, ni deadlocks, ni filas activas con usuario o galpón inactivo', async () => {
      const o = await nuevaOrg(4, 4, true);
      for (const u of o.ops) await entrar(await emailDe(u));
      const apps4 = [
        'e2e-carrera-asignacion-1',
        'e2e-carrera-asignacion-2',
        APP_ESCRITOR,
        'e2e-carrera-datos',
      ];
      const antes = Number(
        (
          await observador.query<{ n: string }>(
            'SELECT deadlocks AS n FROM pg_stat_database WHERE datname = current_database()',
          )
        ).rows[0].n,
      );
      const estados: Record<string, number> = {};
      const violaciones: string[] = [];
      const RONDAS = 12;
      const azar = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

      for (let ronda = 0; ronda < RONDAS; ronda++) {
        const pedidos: Array<Promise<request.Response>> = [];
        let k = 0;
        const url = () => urls[apps4[k++ % apps4.length]];
        for (const u of o.ops)
          if (Math.random() < 0.5)
            pedidos.push(
              Math.random() < 0.5
                ? request(url())
                    .delete(`/v1/usuarios/${u}`)
                    .set(auth())
                    .then((x) => x)
                : request(url())
                    .patch(`/v1/usuarios/${u}`)
                    .set(auth())
                    .send({ activo: false })
                    .then((x) => x),
            );
        for (const g of o.gs)
          if (Math.random() < 0.5)
            pedidos.push(
              request(url())
                .delete(`/v1/galpones/${g}`)
                .set(auth())
                .then((x) => x),
            );
        if (Math.random() < 0.3)
          pedidos.push(
            request(url())
              .delete(`/v1/organizaciones/${o.org}`)
              .set(auth())
              .then((x) => x),
          );
        for (let i = 0; i < 8; i++)
          pedidos.push(
            request(url())
              .post('/v1/usuarios-galpones')
              .set(auth())
              .send({ usuario_id: azar(o.ops), galpon_id: azar(o.gs) })
              .then((x) => x),
          );
        const respuestas = await Promise.all(pedidos);
        for (const x of respuestas) {
          estados[x.status] = (estados[x.status] ?? 0) + 1;
        }
        const malas = await observador.query<{ detalle: string }>(
          `SELECT ug.usuario_id || '/' || ug.galpon_id AS detalle
             FROM usuarios_galpones ug
             JOIN usuarios u ON u.id = ug.usuario_id
             JOIN galpones g ON g.id = ug.galpon_id
            WHERE ug.galpon_id = ANY($1) AND ug.activa AND (NOT u.activo OR NOT g.activo)`,
          [o.gs],
        );
        violaciones.push(
          ...malas.rows.map((f) => `ronda ${ronda}: ${f.detalle}`),
        );
        await observador.query(
          'UPDATE usuarios SET activo = true WHERE organizacion_id = $1',
          [o.org],
        );
        await observador.query(
          'UPDATE organizaciones SET activa = true WHERE id = $1',
          [o.org],
        );
        await observador.query(
          'UPDATE granjas SET activa = true WHERE id = $1',
          [o.granja],
        );
        await observador.query(
          'UPDATE galpones SET activo = true WHERE id = ANY($1)',
          [o.gs],
        );
        await observador.query(
          'UPDATE usuarios_galpones SET activa = true WHERE galpon_id = ANY($1)',
          [o.gs],
        );
      }

      await new Promise((resolver) => setTimeout(resolver, 1500));
      await observador.query('SELECT pg_stat_clear_snapshot()');
      const despues = Number(
        (
          await observador.query<{ n: string }>(
            'SELECT deadlocks AS n FROM pg_stat_database WHERE datname = current_database()',
          )
        ).rows[0].n,
      );
      const codigos = Object.keys(estados);
      expect(codigos.filter((c) => Number(c) >= 500 || Number(c) < 0)).toEqual(
        [],
      );
      expect(violaciones).toEqual([]);
      expect(despues - antes).toBe(0);
    }, 180000);
  });
});
