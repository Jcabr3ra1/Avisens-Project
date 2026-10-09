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
import { UsuariosGalponesModule } from '../src/modules/usuarios-galpones/usuarios-galpones.module';
import { UsuariosModule } from '../src/modules/usuarios/usuarios.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { validateEnv } from '../src/config/env.validation';

const TOPE_BARRERA_MS = 1000;
const LOCK_TIMEOUT_ASIGNACION_MS = 3000;
const LOCK_TIMEOUT_DESACTIVACION_MS = 5000;

type ViaAsignacion =
  | 'POST /usuarios-galpones'
  | 'POST /usuarios/:id/galpones'
  | 'PATCH /usuarios-galpones/:id/activar';
type ViaDesactivacion = 'PATCH activo:false' | 'DELETE';

const ALTAS: ViaAsignacion[] = [
  'POST /usuarios-galpones',
  'POST /usuarios/:id/galpones',
];
const VIAS_ASIGNACION: ViaAsignacion[] = [
  ...ALTAS,
  'PATCH /usuarios-galpones/:id/activar',
];
const VIAS_DESACTIVACION: ViaDesactivacion[] = ['PATCH activo:false', 'DELETE'];

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

interface Escenario {
  galpon: number;
  op1: number;
  op2: number;
  filaOp1: number | null;
  filaOp2: number;
}

describe('Galpón: asignación frente a desactivación, concurrencia determinista (e2e)', () => {
  jest.setTimeout(30000);

  const baseUrl = process.env.DATABASE_URL as string;
  const sufijo = `${Date.now()}-${process.pid}`;
  const password = 'Prueba-e2e-123';
  const apps: INestApplication[] = [];
  const urls: Record<string, string> = {};
  let prisma: PrismaService;
  let servidorDatos: string;
  let tokenAdmin: string;
  let granjaId: number;
  let rolOperarioId: number;
  let hash: string;
  let contador = 0;
  let control: Client;
  let pidControl = 0;
  let observador: Client;
  let enTransaccionControl = false;
  const clavesAdvisory: number[] = [];
  const triggers: Array<{ funcion: string; trigger: string }> = [];
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

  const auth = () => ({ Authorization: `Bearer ${tokenAdmin}` });

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

  const retenerAdvisory = async (clave: number) => {
    await control.query('SELECT pg_advisory_lock($1)', [clave]);
    clavesAdvisory.push(clave);
  };

  const liberar = async () => {
    if (enTransaccionControl) {
      await control.query('ROLLBACK');
      enTransaccionControl = false;
    }
    while (clavesAdvisory.length > 0) {
      await control.query('SELECT pg_advisory_unlock($1)', [
        clavesAdvisory.pop(),
      ]);
    }
  };

  const retirarTriggers = async () => {
    while (triggers.length > 0) {
      const t = triggers.pop() as { funcion: string; trigger: string };
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS ${t.trigger} ON usuarios_galpones`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${t.funcion}()`);
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
      await retirarTriggers();
      await Promise.allSettled(peticiones.map((p) => p.promesa));
      peticiones.length = 0;
    }
  };

  const crearOperario = async (etiqueta: string) => {
    contador += 1;
    const usuario = await prisma.usuario.create({
      data: {
        nombre_completo: `operario-${etiqueta}`,
        cedula: `op-${sufijo}-${contador}`,
        email: `op-${sufijo}-${contador}@e2e.local`,
        password_hash: hash,
        rol_id: rolOperarioId,
        organizacion_id: (
          await prisma.granja.findUniqueOrThrow({
            where: { id: granjaId },
            select: { organizacion_id: true },
          })
        ).organizacion_id,
      },
    });
    ids.usuarios.push(usuario.id);
    return usuario;
  };

  const nuevoEscenario = async (
    opciones: {
      filaInactivaOp1?: boolean;
    } = {},
  ): Promise<Escenario> => {
    contador += 1;
    const galpon = await prisma.galpon.create({
      data: {
        granja_id: granjaId,
        codigo: `GCR-${sufijo}-${contador}`,
        nombre: `Galpón carrera ${contador}`,
        capacidad_aves: 300,
      },
    });
    ids.galpones.push(galpon.id);
    const [op1, op2] = [await crearOperario('uno'), await crearOperario('dos')];
    const filaOp2 = await prisma.usuarioGalpon.create({
      data: { usuario_id: op2.id, galpon_id: galpon.id },
    });
    const filaOp1 = opciones.filaInactivaOp1
      ? await prisma.usuarioGalpon.create({
          data: {
            usuario_id: op1.id,
            galpon_id: galpon.id,
            activa: false,
            rol_asignacion: 'galponero',
            fecha_asignacion: new Date('2026-01-01T00:00:00.000Z'),
          },
        })
      : null;
    return {
      galpon: galpon.id,
      op1: op1.id,
      op2: op2.id,
      filaOp1: filaOp1?.id ?? null,
      filaOp2: filaOp2.id,
    };
  };

  const pedirAsignacion = (
    via: ViaAsignacion,
    aplicacion: string,
    e: Escenario,
  ) => {
    const url = urls[aplicacion];
    if (via === 'POST /usuarios-galpones') {
      return request(url)
        .post('/v1/usuarios-galpones')
        .set(auth())
        .send({ usuario_id: e.op1, galpon_id: e.galpon });
    }
    if (via === 'POST /usuarios/:id/galpones') {
      return request(url)
        .post(`/v1/usuarios/${e.op1}/galpones`)
        .set(auth())
        .send({ galpon_id: e.galpon });
    }
    return request(url)
      .patch(`/v1/usuarios-galpones/${e.filaOp1}/activar`)
      .set(auth());
  };

  const pedirDesactivacion = (
    via: ViaDesactivacion,
    galponId: number,
    extra: Record<string, unknown> = {},
  ) => {
    const url = urls['e2e-carrera-desactivacion'];
    return via === 'DELETE'
      ? request(url).delete(`/v1/galpones/${galponId}`).set(auth())
      : request(url)
          .patch(`/v1/galpones/${galponId}`)
          .set(auth())
          .send({ activo: false, ...extra });
  };

  const bloquearParaAltaDe = async (e: Escenario, via: ViaAsignacion) => {
    if (via === 'PATCH /usuarios-galpones/:id/activar') {
      await retener(
        'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
        [e.filaOp1],
      );
    } else {
      await retener('SELECT id FROM usuarios WHERE id = $1 FOR UPDATE', [
        e.op1,
      ]);
    }
  };

  const filaDe = (usuario: number, galpon: number) =>
    prisma.usuarioGalpon.findUnique({
      where: {
        usuario_id_galpon_id: { usuario_id: usuario, galpon_id: galpon },
      },
    });

  const accesoDelOperario = async (e: Escenario) => {
    const tokenOperario = await entrar(
      (await prisma.usuario.findUniqueOrThrow({ where: { id: e.op1 } })).email,
    );
    return (
      await request(servidorDatos)
        .get(`/v1/galpones/${e.galpon}`)
        .set({ Authorization: `Bearer ${tokenOperario}` })
    ).status;
  };

  const entrar = async (email: string) =>
    (
      (
        await request(servidorDatos)
          .post('/v1/auth/login')
          .send({ email, password })
          .expect(200)
      ).body as { access_token: string }
    ).access_token;

  const conexionesColgadas = async (aplicacion: string) =>
    (
      await observador.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE application_name = $1 AND state LIKE 'idle in transaction%'`,
        [aplicacion],
      )
    ).rows[0].n;

  const galponLibre = async (galponId: number) => {
    await observador.query('BEGIN');
    try {
      await observador.query(
        'SELECT id FROM galpones WHERE id = $1 FOR UPDATE NOWAIT',
        [galponId],
      );
      return true;
    } catch (error) {
      if ((error as { code?: string }).code === '55P03') return false;
      throw error;
    } finally {
      await observador.query('ROLLBACK');
    }
  };

  afterEach(async () => {
    await liberar();
    await retirarTriggers();
    await Promise.allSettled(peticiones.map((p) => p.promesa));
    peticiones.length = 0;
  });

  beforeAll(async () => {
    const datos = await crearApp('e2e-carrera-datos');
    prisma = datos.prisma;
    servidorDatos = urls['e2e-carrera-datos'];
    await crearApp('e2e-carrera-asignacion-1');
    await crearApp('e2e-carrera-asignacion-2');
    await crearApp('e2e-carrera-desactivacion');

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
    rolOperarioId = rolOperario.id;
    hash = await bcrypt.hash(password, 4);
    const org = await prisma.organizacion.create({
      data: { nombre: `E2E carrera ${sufijo}` },
    });
    ids.organizaciones.push(org.id);
    const crear = (rol_id: number, tipo: string, orgId: number | null) =>
      prisma.usuario.create({
        data: {
          nombre_completo: tipo,
          cedula: `${tipo}-${sufijo}`,
          email: `${tipo}-${sufijo}@e2e.local`,
          password_hash: hash,
          rol_id,
          organizacion_id: orgId,
        },
      });
    const [admin, dueno] = [
      await crear(rolAdmin.id, 'admin', null),
      await crear(rolPropietario.id, 'dueno', org.id),
    ];
    ids.usuarios.push(admin.id, dueno.id);
    const granja = await prisma.granja.create({
      data: {
        nombre: `Granja carrera ${sufijo}`,
        propietario_id: dueno.id,
        organizacion_id: org.id,
      },
    });
    ids.granjas.push(granja.id);
    granjaId = granja.id;
    tokenAdmin = await entrar(admin.email);
  });

  afterAll(async () => {
    await liberar();
    await retirarTriggers();
    await prisma.usuarioGalpon.deleteMany({
      where: { galpon_id: { in: ids.galpones } },
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

  describe.each(VIAS_DESACTIVACION)(
    'asignación primero ↔ %s',
    (desactivacion) => {
      it.each(VIAS_ASIGNACION)(
        'la asignación por %s termina y la desactivación la revoca',
        async (asignacion) => {
          const e = await nuevoEscenario({
            filaInactivaOp1:
              asignacion === 'PATCH /usuarios-galpones/:id/activar',
          });
          await correr(async () => {
            await bloquearParaAltaDe(e, asignacion);
            const a = iniciar(
              'asignación',
              pedirAsignacion(asignacion, 'e2e-carrera-asignacion-1', e),
            );
            const pidAsignacion = await esperarBloqueo(
              'e2e-carrera-asignacion-1',
              [pidControl],
              a,
            );
            const d = iniciar(
              'desactivación',
              pedirDesactivacion(desactivacion, e.galpon),
            );
            await esperarBloqueo(
              'e2e-carrera-desactivacion',
              [pidAsignacion],
              d,
            );

            await liberar();
            const [ra, rd] = await Promise.all([a.promesa, d.promesa]);

            expect(ra.status).toBe(
              asignacion === 'PATCH /usuarios-galpones/:id/activar' ? 200 : 201,
            );
            expect(rd.status).toBe(200);
            const galpon = await prisma.galpon.findUniqueOrThrow({
              where: { id: e.galpon },
            });
            expect(galpon.activo).toBe(false);
            const fila = await filaDe(e.op1, e.galpon);
            expect(fila).not.toBeNull();
            expect(fila?.activa).toBe(false);
            expect((await filaDe(e.op2, e.galpon))?.activa).toBe(false);

            await request(servidorDatos)
              .patch(`/v1/galpones/${e.galpon}/activar`)
              .set(auth())
              .expect(200);
            expect((await filaDe(e.op1, e.galpon))?.activa).toBe(false);
            expect(await accesoDelOperario(e)).toBe(403);
          });
        },
      );
    },
  );

  describe.each(VIAS_DESACTIVACION)(
    'desactivación primero ↔ %s',
    (desactivacion) => {
      it.each(VIAS_ASIGNACION)(
        'la asignación por %s se rechaza (400) y no crea ni reactiva nada',
        async (asignacion) => {
          const e = await nuevoEscenario({
            filaInactivaOp1:
              asignacion === 'PATCH /usuarios-galpones/:id/activar',
          });
          await correr(async () => {
            await retener(
              'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
              [e.filaOp2],
            );
            const d = iniciar(
              'desactivación',
              pedirDesactivacion(desactivacion, e.galpon),
            );
            const pidDesactivacion = await esperarBloqueo(
              'e2e-carrera-desactivacion',
              [pidControl],
              d,
            );
            const a = iniciar(
              'asignación',
              pedirAsignacion(asignacion, 'e2e-carrera-asignacion-1', e),
            );
            await esperarBloqueo(
              'e2e-carrera-asignacion-1',
              [pidDesactivacion],
              a,
            );

            await liberar();
            const [ra, rd] = await Promise.all([a.promesa, d.promesa]);

            expect(rd.status).toBe(200);
            expect(ra.status).toBe(400);
            expect(String(ra.body.message)).toMatch(/galpón inactivo/);
            const galpon = await prisma.galpon.findUniqueOrThrow({
              where: { id: e.galpon },
            });
            expect(galpon.activo).toBe(false);
            const fila = await filaDe(e.op1, e.galpon);
            if (asignacion === 'PATCH /usuarios-galpones/:id/activar') {
              expect(fila?.activa).toBe(false);
              expect(fila?.rol_asignacion).toBe('galponero');
              expect(fila?.fecha_asignacion.toISOString()).toBe(
                '2026-01-01T00:00:00.000Z',
              );
            } else {
              expect(fila).toBeNull();
            }
            expect((await filaDe(e.op2, e.galpon))?.activa).toBe(false);
          });
        },
      );
    },
  );

  it('dos altas simultáneas del mismo par terminan ambas y dejan una sola fila activa', async () => {
    const e = await nuevoEscenario();
    await correr(async () => {
      await retener('SELECT id FROM galpones WHERE id = $1 FOR UPDATE', [
        e.galpon,
      ]);
      const a1 = iniciar(
        'alta 1',
        pedirAsignacion(
          'POST /usuarios-galpones',
          'e2e-carrera-asignacion-1',
          e,
        ),
      );
      const pidA1 = await esperarBloqueo(
        'e2e-carrera-asignacion-1',
        [pidControl],
        a1,
      );
      const a2 = iniciar(
        'alta 2',
        pedirAsignacion(
          'POST /usuarios/:id/galpones',
          'e2e-carrera-asignacion-2',
          e,
        ),
      );
      await esperarBloqueo('e2e-carrera-asignacion-2', [pidControl, pidA1], a2);

      await liberar();
      const [r1, r2] = await Promise.all([a1.promesa, a2.promesa]);

      expect([r1.status, r2.status]).toEqual([201, 201]);
      expect(r1.body.id).toBe(r2.body.id);
      const filas = await prisma.usuarioGalpon.findMany({
        where: { usuario_id: e.op1, galpon_id: e.galpon },
      });
      expect(filas).toHaveLength(1);
      expect(filas[0].activa).toBe(true);
    });
  });

  it('una desactivación que ya tocó la fila no deja que otra asignación se cuele (sin deadlock ni 500)', async () => {
    const e = await nuevoEscenario();
    await correr(async () => {
      const clave = 900000 + e.galpon;
      const funcion = `e2e_pausa_${e.galpon}`;
      const trigger = `e2e_pausa_trg_${e.galpon}`;
      await prisma.$executeRawUnsafe(
        `CREATE FUNCTION ${funcion}() RETURNS trigger AS $$ BEGIN PERFORM pg_advisory_xact_lock(${clave}); RETURN NEW; END $$ LANGUAGE plpgsql`,
      );
      triggers.push({ funcion, trigger });
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER ${trigger} AFTER UPDATE ON usuarios_galpones FOR EACH ROW WHEN (OLD.galpon_id = ${e.galpon}) EXECUTE FUNCTION ${funcion}()`,
      );
      await retenerAdvisory(clave);

      const d = iniciar(
        'desactivación',
        pedirDesactivacion('PATCH activo:false', e.galpon),
      );
      const pidD = await esperarBloqueo(
        'e2e-carrera-desactivacion',
        [pidControl],
        d,
      );
      const reasignar = iniciar(
        'reasignación de la fila ya activa',
        request(urls['e2e-carrera-asignacion-1'])
          .post('/v1/usuarios-galpones')
          .set(auth())
          .send({ usuario_id: e.op2, galpon_id: e.galpon }),
      );
      await esperarBloqueo('e2e-carrera-asignacion-1', [pidD], reasignar);

      await liberar();
      const [rd, rr] = await Promise.all([d.promesa, reasignar.promesa]);

      expect(rd.status).toBe(200);
      expect(rr.status).toBe(400);
      expect((await filaDe(e.op2, e.galpon))?.activa).toBe(false);
      expect(
        (await prisma.galpon.findUniqueOrThrow({ where: { id: e.galpon } }))
          .activo,
      ).toBe(false);
    });
  });

  describe('eliminación permanente', () => {
    it('eliminación primero: la asignación posterior recibe 404 y no queda nada', async () => {
      const e = await nuevoEscenario();
      await correr(async () => {
        await retener(
          'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
          [e.filaOp2],
        );
        const d = iniciar(
          'eliminación permanente',
          request(urls['e2e-carrera-desactivacion'])
            .delete(`/v1/galpones/${e.galpon}/permanente`)
            .set(auth()),
        );
        const pidD = await esperarBloqueo(
          'e2e-carrera-desactivacion',
          [pidControl],
          d,
        );
        const a = iniciar(
          'asignación',
          pedirAsignacion(
            'POST /usuarios-galpones',
            'e2e-carrera-asignacion-1',
            e,
          ),
        );
        await esperarBloqueo('e2e-carrera-asignacion-1', [pidD], a);

        await liberar();
        const [rd, ra] = await Promise.all([d.promesa, a.promesa]);

        expect(rd.status).toBe(200);
        expect(rd.body).toEqual({ id: e.galpon, eliminado: true });
        expect(ra.status).toBe(404);
        expect(await prisma.galpon.count({ where: { id: e.galpon } })).toBe(0);
        expect(
          await prisma.usuarioGalpon.count({ where: { galpon_id: e.galpon } }),
        ).toBe(0);
      });
    });

    it('asignación primero: la eliminación se lleva también la fila recién creada', async () => {
      const e = await nuevoEscenario();
      await correr(async () => {
        await retener('SELECT id FROM usuarios WHERE id = $1 FOR UPDATE', [
          e.op1,
        ]);
        const a = iniciar(
          'asignación',
          pedirAsignacion(
            'POST /usuarios-galpones',
            'e2e-carrera-asignacion-1',
            e,
          ),
        );
        const pidA = await esperarBloqueo(
          'e2e-carrera-asignacion-1',
          [pidControl],
          a,
        );
        const d = iniciar(
          'eliminación permanente',
          request(urls['e2e-carrera-desactivacion'])
            .delete(`/v1/galpones/${e.galpon}/permanente`)
            .set(auth()),
        );
        await esperarBloqueo('e2e-carrera-desactivacion', [pidA], d);

        await liberar();
        const [ra, rd] = await Promise.all([a.promesa, d.promesa]);

        expect(ra.status).toBe(201);
        expect(rd.status).toBe(200);
        expect(await prisma.galpon.count({ where: { id: e.galpon } })).toBe(0);
        expect(
          await prisma.usuarioGalpon.count({ where: { galpon_id: e.galpon } }),
        ).toBe(0);
      });
    });
  });

  describe('timeouts de bloqueo: 409 estrecho y rollback', () => {
    it('la asignación que espera el galpón más de 3 s responde 409 y no deja la fila', async () => {
      const e = await nuevoEscenario();
      await correr(async () => {
        await retener('SELECT id FROM galpones WHERE id = $1 FOR UPDATE', [
          e.galpon,
        ]);
        const inicio = Date.now();
        const a = iniciar(
          'asignación',
          pedirAsignacion(
            'POST /usuarios-galpones',
            'e2e-carrera-asignacion-1',
            e,
          ),
        );
        await esperarBloqueo('e2e-carrera-asignacion-1', [pidControl], a);

        const r = await respuestaEn(a);

        expect(r.status).toBe(409);
        expect(String(r.body.message)).toMatch(/siendo modificado/);
        expect(Date.now() - inicio).toBeGreaterThanOrEqual(
          LOCK_TIMEOUT_ASIGNACION_MS - 200,
        );
        expect(await filaDe(e.op1, e.galpon)).toBeNull();
        expect(await conexionesColgadas('e2e-carrera-asignacion-1')).toBe(0);
      });
    });

    it('la asignación que espera la fila más de 3 s responde 409, conserva la fila y suelta el galpón', async () => {
      const e = await nuevoEscenario({ filaInactivaOp1: true });
      await correr(async () => {
        await retener(
          'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
          [e.filaOp1],
        );
        const a = iniciar(
          'asignación',
          pedirAsignacion(
            'PATCH /usuarios-galpones/:id/activar',
            'e2e-carrera-asignacion-1',
            e,
          ),
        );
        await esperarBloqueo('e2e-carrera-asignacion-1', [pidControl], a);

        const r = await respuestaEn(a);

        expect(r.status).toBe(409);
        const fila = await filaDe(e.op1, e.galpon);
        expect(fila?.activa).toBe(false);
        expect(fila?.rol_asignacion).toBe('galponero');
        expect(fila?.fecha_asignacion.toISOString()).toBe(
          '2026-01-01T00:00:00.000Z',
        );
        expect(await galponLibre(e.galpon)).toBe(true);
        expect(await conexionesColgadas('e2e-carrera-asignacion-1')).toBe(0);
      });
    });

    it.each(VIAS_DESACTIVACION)(
      '%s que espera el galpón más de 5 s responde 409 y no cambia nada',
      async (desactivacion) => {
        const e = await nuevoEscenario();
        await correr(async () => {
          await retener('SELECT id FROM galpones WHERE id = $1 FOR SHARE', [
            e.galpon,
          ]);
          const inicio = Date.now();
          const d = iniciar(
            'desactivación',
            pedirDesactivacion(desactivacion, e.galpon, {
              nombre: 'Nombre nuevo',
            }),
          );
          await esperarBloqueo('e2e-carrera-desactivacion', [pidControl], d);

          const r = await respuestaEn(d);

          expect(r.status).toBe(409);
          expect(String(r.body.message)).toMatch(/siendo modificado/);
          expect(Date.now() - inicio).toBeGreaterThanOrEqual(
            LOCK_TIMEOUT_DESACTIVACION_MS - 200,
          );
          const galpon = await prisma.galpon.findUniqueOrThrow({
            where: { id: e.galpon },
          });
          expect(galpon.activo).toBe(true);
          expect(galpon.nombre).not.toBe('Nombre nuevo');
          expect((await filaDe(e.op2, e.galpon))?.activa).toBe(true);
          expect(await conexionesColgadas('e2e-carrera-desactivacion')).toBe(0);
        });
      },
    );

    it('la eliminación permanente que espera el galpón más de 5 s responde 409 y no borra nada', async () => {
      const e = await nuevoEscenario();
      await correr(async () => {
        await retener('SELECT id FROM galpones WHERE id = $1 FOR SHARE', [
          e.galpon,
        ]);
        const d = iniciar(
          'eliminación permanente',
          request(urls['e2e-carrera-desactivacion'])
            .delete(`/v1/galpones/${e.galpon}/permanente`)
            .set(auth()),
        );
        await esperarBloqueo('e2e-carrera-desactivacion', [pidControl], d);

        const r = await respuestaEn(d);

        expect(r.status).toBe(409);
        expect(await prisma.galpon.count({ where: { id: e.galpon } })).toBe(1);
        expect((await filaDe(e.op2, e.galpon))?.activa).toBe(true);
      });
    });
  });
});
