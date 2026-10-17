import { usernameDePrueba } from './soporte/username';
import request from 'supertest';
import { RecuperacionesPasswordService } from '../src/modules/recuperaciones-password/recuperaciones-password.service';
import { MENSAJE_CUENTA_OCUPADA } from '../src/common/errores/bloqueo';
import { esperarGrafo } from './soporte/barreras';
import { ensayarConCompuerta } from './soporte/compuerta-bcrypt';
import { Entorno, Fixture, PASSWORD } from './soporte/entorno-presupuesto';

jest.setTimeout(60000);

const LOGIN = 'e2e-login-a';
const LOGIN2 = 'e2e-login-b';
const FALLIDO = 'e2e-login-fallido';
const ADMIN = 'e2e-login-admin';
const RECUP = 'e2e-login-recuperacion';
const ctl = (etiqueta: string) => `e2e-presupuesto-ctl-${etiqueta}`;

const CREDENCIALES_INVALIDAS = 'Credenciales inválidas';
const CUENTA_BLOQUEADA = 'Cuenta bloqueada temporalmente';
const BLOQUEA_SESIONES = /FROM "sesiones".*FOR UPDATE/;
const BLOQUEA_USUARIO_COMPARTIDO = /FROM "usuarios" WHERE "id" = \$1 FOR SHARE/;

interface Res {
  status: number;
  body: Record<string, unknown>;
}

const bcryptReal = jest.requireActual<typeof import('bcrypt')>('bcrypt');

describe('Login ↔ desactivación: intercalados sobre AuthService real por HTTP', () => {
  let entorno: Entorno;
  let urlLogin = '';
  let urlLogin2 = '';
  let urlFallido = '';
  let urlAdmin = '';
  let recuperaciones: RecuperacionesPasswordService;

  beforeAll(async () => {
    entorno = await Entorno.crear();
    urlLogin = (await entorno.crearApp(LOGIN)).url;
    urlLogin2 = (await entorno.crearApp(LOGIN2)).url;
    urlFallido = (await entorno.crearApp(FALLIDO)).url;
    urlAdmin = (await entorno.crearApp(ADMIN)).url;
    recuperaciones = new RecuperacionesPasswordService(
      entorno.clientePrisma(RECUP),
    );
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    const usuarios = entorno.ids.usuarios;
    await entorno.prisma.recuperacionPassword.deleteMany({
      where: {
        OR: [
          { usuario_id: { in: usuarios } },
          { atendida_por_id: { in: usuarios } },
        ],
      },
    });
    await entorno.prisma.notificacion.deleteMany({
      where: { usuario_id: { in: usuarios } },
    });
    await entorno.limpiar();
  });

  const usernameDe = async (id: number) =>
    (await entorno.prisma.usuario.findUniqueOrThrow({ where: { id } })).username;

  const enviar = (peticion: request.Test, senal?: AbortSignal) =>
    new Promise<Res>((resolver, rechazar) => {
      const abortar = () => {
        peticion.abort();
        rechazar(new Error('petición abortada por el ensayo'));
      };
      if (senal?.aborted) return abortar();
      senal?.addEventListener('abort', abortar, { once: true });
      peticion.then(
        (r) => {
          senal?.removeEventListener('abort', abortar);
          resolver({
            status: r.status,
            body: r.body as Record<string, unknown>,
          });
        },
        (error: unknown) => {
          senal?.removeEventListener('abort', abortar);
          rechazar(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });

  const iniciar = (
    url: string,
    email: string,
    password = PASSWORD,
    senal?: AbortSignal,
  ) =>
    enviar(
      request(url).post('/v1/auth/login').send({ username: email, password }),
      senal,
    );

  const admin = (
    metodo: 'patch' | 'delete',
    ruta: string,
    cuerpo?: object,
    senal?: AbortSignal,
  ) =>
    enviar(
      cuerpo
        ? request(urlAdmin)[metodo](ruta).set(entorno.auth()).send(cuerpo)
        : request(urlAdmin)[metodo](ruta).set(entorno.auth()),
      senal,
    );

  const permisos = (token: string) =>
    request(urlLogin)
      .get('/v1/auth/permisos')
      .set({ Authorization: `Bearer ${token}` })
      .then((r) => r.status);

  const refrescar = (token: string) =>
    request(urlLogin)
      .post('/v1/auth/refresh')
      .send({ refresh_token: token })
      .then((r) => r.status);

  const sesiones = (usuarioId: number) =>
    entorno.prisma.sesion.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { id: 'asc' },
      select: { id: true, revocada: true, session_id: true, expira_en: true },
    });

  const vivas = async (usuarioId: number) =>
    (await sesiones(usuarioId)).filter(
      (s) => !s.revocada && s.expira_en > new Date(),
    ).length;

  const seguridad = (usuarioId: number) =>
    entorno.prisma.seguridadCuenta.findUnique({
      where: { usuario_id: usuarioId },
      select: {
        intentos_fallidos: true,
        bloqueado_hasta: true,
        fecha_ultimo_login: true,
        debe_cambiar_password: true,
      },
    });

  const sesionesRevocadas = (usuarioId: number, n: number) =>
    Promise.all(
      Array.from({ length: n }, () =>
        entorno.prisma.sesion.create({
          data: {
            session_id: crypto.randomUUID(),
            usuario_id: usuarioId,
            refresh_token_hash: 'x',
            expira_en: new Date(Date.now() + 3600 * 1000),
            revocada: true,
          },
        }),
      ),
    );

  const pausaEnSesion = (id: number, etiqueta = 'P-candidata') => ({
    etiqueta,
    sql: 'SELECT id FROM sesiones WHERE id = $1 FOR UPDATE',
    parametros: [id],
    liberarMs: null,
  });

  const pausaEnAsignacion = (f: Fixture) => ({
    etiqueta: 'P-asignacion',
    sql: 'SELECT id FROM usuarios_galpones WHERE id = $1 FOR UPDATE',
    parametros: [f.filaPrevia],
    liberarMs: null,
  });

  const conCompuerta = <A>(
    iniciar: (senal: AbortSignal) => Promise<Res>,
    durante: (senal: AbortSignal) => Promise<A>,
  ) =>
    ensayarConCompuerta({
      modulo: bcryptReal,
      password: PASSWORD,
      iniciar,
      durante,
    });

  const jtiDe = (token: string) =>
    (
      JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
      ) as { jti: string }
    ).jti;

  interface Desactivacion {
    nombre: string;
    ejecutar: (f: Fixture, senal?: AbortSignal) => Promise<Res>;
    reactivar?: (f: Fixture) => Promise<void>;
    esperaDelAdmin: RegExp;
  }

  const activarUsuario = async (f: Fixture) => {
    await admin('patch', `/v1/usuarios/${f.op}/activar`);
  };

  const DESACTIVACIONES: Desactivacion[] = [
    {
      nombre: 'PATCH /usuarios/:id {activo:false}',
      ejecutar: (f, senal) =>
        admin('patch', `/v1/usuarios/${f.op}`, { activo: false }, senal),
      reactivar: activarUsuario,
      esperaDelAdmin: /^UPDATE "public"."usuarios"/,
    },
    {
      nombre: 'DELETE /usuarios/:id',
      ejecutar: (f, senal) =>
        admin('delete', `/v1/usuarios/${f.op}`, undefined, senal),
      reactivar: activarUsuario,
      esperaDelAdmin: /^UPDATE "public"."usuarios"/,
    },
    {
      nombre: 'DELETE /organizaciones/:id',
      ejecutar: (f, senal) =>
        admin('delete', `/v1/organizaciones/${f.org}`, undefined, senal),
      reactivar: async (f) => {
        await admin('patch', `/v1/organizaciones/${f.org}/activar`);
        await activarUsuario(f);
      },
      esperaDelAdmin: /FROM "usuarios".*FOR NO KEY UPDATE/,
    },
    {
      nombre: 'DELETE /usuarios/:id/permanente',
      ejecutar: (f, senal) =>
        admin('delete', `/v1/usuarios/${f.op}/permanente`, undefined, senal),
      esperaDelAdmin: /FROM "usuarios" WHERE "id" = \$1 FOR UPDATE/,
    },
  ];

  describe('el login gana: la desactivación espera, y luego revoca o elimina la sesión nueva', () => {
    it.each(DESACTIVACIONES)('$nombre', async (d) => {
      const f = await entorno.fixture();
      const email = await usernameDe(f.op);
      const [candidata] = await sesionesRevocadas(f.op, 1);
      let login: Res = { status: 0, body: {} };
      let desactivacion: Res = { status: 0, body: {} };

      await entorno.conControles(
        [pausaEnSesion(candidata.id)],
        async ([control]) => {
          const pendiente = iniciar(urlLogin, email);
          await esperarGrafo(entorno.observador, [
            {
              app: LOGIN,
              bloqueadoPor: [ctl('P-candidata')],
              consulta: BLOQUEA_SESIONES,
            },
          ]);
          const intento = d.ejecutar(f);
          await esperarGrafo(entorno.observador, [
            { app: LOGIN, bloqueadoPor: [ctl('P-candidata')] },
            {
              app: ADMIN,
              bloqueadoPor: [LOGIN],
              consulta: d.esperaDelAdmin,
            },
          ]);
          await control.c.query('ROLLBACK');
          [login, desactivacion] = await Promise.all([pendiente, intento]);
        },
      );

      expect(login.status).toBe(200);
      expect(desactivacion.status).toBe(200);
      const refresh = login.body.refresh_token as string;
      const access = login.body.access_token as string;
      expect(await refrescar(refresh)).toBe(401);
      if (d.reactivar) {
        const propia = (await sesiones(f.op)).find(
          (s) => s.revocada && s.session_id !== undefined,
        );
        expect(propia).toBeDefined();
        expect(await vivas(f.op)).toBe(0);
        expect(await permisos(access)).toBe(401);
        await d.reactivar(f);
        expect(await refrescar(refresh)).toBe(401);
        expect(await permisos(access)).toBe(200);
      } else {
        expect(
          await entorno.prisma.usuario.count({ where: { id: f.op } }),
        ).toBe(0);
        expect(await sesiones(f.op)).toEqual([]);
        expect(await seguridad(f.op)).toBeNull();
      }
    });
  });

  describe('la desactivación está en curso: el login espera al usuario y la cuenta queda sin sesión', () => {
    it.each(DESACTIVACIONES)('$nombre', async (d) => {
      const f = await entorno.fixture();
      const email = await usernameDe(f.op);
      let login: Res = { status: 0, body: {} };
      let desactivacion: Res = { status: 0, body: {} };

      await entorno.conControles([pausaEnAsignacion(f)], async ([control]) => {
        const intento = d.ejecutar(f);
        await esperarGrafo(entorno.observador, [
          {
            app: ADMIN,
            bloqueadoPor: [ctl('P-asignacion')],
            consulta: /FROM "usuarios_galpones".*FOR UPDATE/,
          },
        ]);
        const pendiente = iniciar(urlLogin, email);
        await esperarGrafo(entorno.observador, [
          { app: ADMIN, bloqueadoPor: [ctl('P-asignacion')] },
          {
            app: LOGIN,
            bloqueadoPor: [ADMIN],
            consulta: BLOQUEA_USUARIO_COMPARTIDO,
          },
        ]);
        await control.c.query('ROLLBACK');
        [desactivacion, login] = await Promise.all([intento, pendiente]);
      });

      expect(desactivacion.status).toBe(200);
      expect(login.status).toBe(401);
      expect(login.body.message).toBe(CREDENCIALES_INVALIDAS);
      expect(await vivas(f.op)).toBe(0);
    });
  });

  describe('la desactivación confirma entre la fase A y la fase B del login', () => {
    it.each(DESACTIVACIONES)('$nombre', async (d) => {
      const f = await entorno.fixture();
      const email = await usernameDe(f.op);
      const antes = await seguridad(f.op);
      const totalAntes = (await sesiones(f.op)).length;

      const { login, accion: desactivacion } = await conCompuerta(
        (senal) => iniciar(urlLogin, email, PASSWORD, senal),
        (senal) => d.ejecutar(f, senal),
      );

      expect(desactivacion.status).toBe(200);
      expect(login.status).toBe(401);
      expect(login.body.message).toBe(CREDENCIALES_INVALIDAS);
      expect(await vivas(f.op)).toBe(0);
      if (d.reactivar) {
        expect((await sesiones(f.op)).length).toBe(totalAntes);
        expect(await seguridad(f.op)).toEqual(antes);
      } else {
        expect(await sesiones(f.op)).toEqual([]);
      }
    });
  });

  describe('seguridad_cuenta frente a un intento fallido', () => {
    const preparar = async () => {
      const f = await entorno.fixture();
      await entorno.prisma.seguridadCuenta.update({
        where: { usuario_id: f.op },
        data: { intentos_fallidos: 4 },
      });
      return { f, email: await usernameDe(f.op) };
    };

    it('la cuenta se bloquea entre la fase A y la B: 403, sin sesión nueva y el bloqueo se conserva', async () => {
      const { f, email } = await preparar();
      const totalAntes = (await sesiones(f.op)).length;

      const { login, accion: fallido } = await conCompuerta(
        (senal) => iniciar(urlLogin, email, PASSWORD, senal),
        (senal) => iniciar(urlFallido, email, 'incorrecta-123', senal),
      );

      expect(fallido.status).toBe(401);
      expect(login.status).toBe(403);
      expect(login.body.message).toBe(CUENTA_BLOQUEADA);
      expect((await sesiones(f.op)).length).toBe(totalAntes);
      const final = await seguridad(f.op);
      expect(final?.intentos_fallidos).toBe(5);
      expect(final?.bloqueado_hasta && final.bloqueado_hasta > new Date()).toBe(
        true,
      );
    });

    it('el intento fallido llega mientras el login retiene la fila: espera y el bloqueo se aplica después, sin borrarse', async () => {
      const { f, email } = await preparar();
      const [candidata] = await sesionesRevocadas(f.op, 1);
      let login: Res = { status: 0, body: {} };
      let fallido: Res = { status: 0, body: {} };

      await entorno.conControles(
        [pausaEnSesion(candidata.id)],
        async ([control]) => {
          const pendiente = iniciar(urlLogin, email);
          await esperarGrafo(entorno.observador, [
            { app: LOGIN, bloqueadoPor: [ctl('P-candidata')] },
          ]);
          const intento = iniciar(urlFallido, email, 'incorrecta-123');
          await esperarGrafo(entorno.observador, [
            { app: LOGIN, bloqueadoPor: [ctl('P-candidata')] },
            {
              app: FALLIDO,
              bloqueadoPor: [LOGIN],
              consulta: /INSERT INTO "public"."seguridad_cuenta"/,
            },
          ]);
          await control.c.query('ROLLBACK');
          [login, fallido] = await Promise.all([pendiente, intento]);
        },
      );

      expect(login.status).toBe(200);
      expect(fallido.status).toBe(401);
      const final = await seguridad(f.op);
      expect(final?.intentos_fallidos).toBe(5);
      expect(final?.bloqueado_hasta && final.bloqueado_hasta > new Date()).toBe(
        true,
      );
    });

    it('el login correcto con un intento fallido ya confirmado antes entra con 403 sin tocar el bloqueo (control de lectura)', async () => {
      const { f, email } = await preparar();
      expect((await iniciar(urlFallido, email, 'incorrecta-123')).status).toBe(
        401,
      );

      const login = await iniciar(urlLogin, email);

      expect(login.status).toBe(403);
      expect((await seguridad(f.op))?.intentos_fallidos).toBe(5);
    });
  });

  describe('recuperación de contraseña', () => {
    const solicitud = (usuarioId: number) =>
      entorno.prisma.recuperacionPassword.create({
        data: { usuario_id: usuarioId },
      });
    const administrador = () => entorno.ids.usuarios[0];

    it('aprobada entre la fase A y la B: el hash cambió, 401 sin sesión y sin contar un intento', async () => {
      const f = await entorno.fixture();
      const email = await usernameDe(f.op);
      const s = await solicitud(f.op);

      const { login } = await conCompuerta(
        (senal) => iniciar(urlLogin, email, PASSWORD, senal),
        () => recuperaciones.aprobar(s.id, administrador()),
      );

      expect(login.status).toBe(401);
      expect(login.body.message).toBe(CREDENCIALES_INVALIDAS);
      expect(await vivas(f.op)).toBe(0);
      const final = await seguridad(f.op);
      expect(final?.intentos_fallidos).toBe(0);
      expect(final?.debe_cambiar_password).toBe(true);
    });

    it('aprobada mientras el login está en la fase B: espera al login y revoca la sesión nueva', async () => {
      const f = await entorno.fixture();
      const email = await usernameDe(f.op);
      const s = await solicitud(f.op);
      const [candidata] = await sesionesRevocadas(f.op, 1);
      let login: Res = { status: 0, body: {} };

      await entorno.conControles(
        [pausaEnSesion(candidata.id)],
        async ([control]) => {
          const pendiente = iniciar(urlLogin, email);
          await esperarGrafo(entorno.observador, [
            { app: LOGIN, bloqueadoPor: [ctl('P-candidata')] },
          ]);
          const aprobacion = recuperaciones.aprobar(s.id, administrador());
          await esperarGrafo(entorno.observador, [
            { app: LOGIN, bloqueadoPor: [ctl('P-candidata')] },
            {
              app: RECUP,
              bloqueadoPor: [LOGIN],
              consulta: /^UPDATE "public"."usuarios"/,
            },
          ]);
          await control.c.query('ROLLBACK');
          [login] = await Promise.all([pendiente, aprobacion]);
        },
      );

      expect(login.status).toBe(200);
      expect(await vivas(f.op)).toBe(0);
      expect(await refrescar(login.body.refresh_token as string)).toBe(401);
      expect((await seguridad(f.op))?.debe_cambiar_password).toBe(true);
    });

    it('cambiarPassword mientras el login está en la fase B: espera y revoca la sesión nueva', async () => {
      const f = await entorno.fixture();
      const email = await usernameDe(f.op);
      const [candidata] = await sesionesRevocadas(f.op, 1);
      let login: Res = { status: 0, body: {} };

      await entorno.conControles(
        [pausaEnSesion(candidata.id)],
        async ([control]) => {
          const pendiente = iniciar(urlLogin, email);
          await esperarGrafo(entorno.observador, [
            { app: LOGIN, bloqueadoPor: [ctl('P-candidata')] },
          ]);
          const cambio = recuperaciones.cambiarPassword(
            f.op,
            'Nueva-clave-123',
          );
          await esperarGrafo(entorno.observador, [
            { app: LOGIN, bloqueadoPor: [ctl('P-candidata')] },
            {
              app: RECUP,
              bloqueadoPor: [LOGIN],
              consulta: /^UPDATE "public"."usuarios"/,
            },
          ]);
          await control.c.query('ROLLBACK');
          [login] = await Promise.all([pendiente, cambio]);
        },
      );

      expect(login.status).toBe(200);
      expect(await vivas(f.op)).toBe(0);
      expect(await refrescar(login.body.refresh_token as string)).toBe(401);
    });
  });

  describe('dos logins simultáneos del mismo usuario', () => {
    it('con varias sesiones candidatas: el segundo espera al primero, solo se eliminan las candidatas y ambos entran', async () => {
      const f = await entorno.fixture();
      const email = await usernameDe(f.op);
      const candidatas = await sesionesRevocadas(f.op, 3);
      const vencida = await entorno.prisma.sesion.create({
        data: {
          session_id: crypto.randomUUID(),
          usuario_id: f.op,
          refresh_token_hash: 'x',
          expira_en: new Date(Date.now() - 1000),
        },
      });
      const ids = [...candidatas.map((c) => c.id), vencida.id];
      const viva = (await sesiones(f.op)).find((s) => !ids.includes(s.id))!;
      let r1: Res = { status: 0, body: {} };
      let r2: Res = { status: 0, body: {} };

      await entorno.conControles(
        [pausaEnSesion(Math.max(...ids), 'P-ultima')],
        async ([control]) => {
          const l1 = iniciar(urlLogin, email);
          await esperarGrafo(entorno.observador, [
            {
              app: LOGIN,
              bloqueadoPor: [ctl('P-ultima')],
              consulta: BLOQUEA_SESIONES,
            },
          ]);
          const l2 = iniciar(urlLogin2, email);
          await esperarGrafo(entorno.observador, [
            { app: LOGIN, bloqueadoPor: [ctl('P-ultima')] },
            {
              app: LOGIN2,
              bloqueadoPor: [LOGIN],
              consulta: /FROM "seguridad_cuenta".*FOR UPDATE/,
            },
          ]);
          await control.c.query('ROLLBACK');
          [r1, r2] = await Promise.all([l1, l2]);
        },
      );

      expect([r1.status, r2.status]).toEqual([200, 200]);
      const finales = await sesiones(f.op);
      expect(finales).toHaveLength(3);
      expect(finales.some((s) => ids.includes(s.id))).toBe(false);
      expect(finales.some((s) => s.id === viva.id)).toBe(true);
      expect(await vivas(f.op)).toBe(3);
      const t1 = r1.body.refresh_token as string;
      const t2 = r2.body.refresh_token as string;
      expect(t1).not.toBe(t2);
      expect(jtiDe(t1)).not.toBe(jtiDe(t2));
    });

    it('sin sesiones candidatas: ambos entran, con session_id y jti distintos', async () => {
      const f = await entorno.fixture();
      const email = await usernameDe(f.op);
      let r1: Res = { status: 0, body: {} };
      let r2: Res = { status: 0, body: {} };

      await entorno.conControles(
        [
          {
            etiqueta: 'P-seguridad',
            sql: 'SELECT id FROM seguridad_cuenta WHERE usuario_id = $1 FOR UPDATE',
            parametros: [f.op],
            liberarMs: null,
          },
        ],
        async ([control]) => {
          const l1 = iniciar(urlLogin, email);
          await esperarGrafo(entorno.observador, [
            { app: LOGIN, bloqueadoPor: [ctl('P-seguridad')] },
          ]);
          const l2 = iniciar(urlLogin2, email);
          await esperarGrafo(entorno.observador, [
            { app: LOGIN, bloqueadoPor: [ctl('P-seguridad')] },
            {
              app: LOGIN2,
              bloqueadoPor: [LOGIN],
              consulta: /FROM "seguridad_cuenta".*FOR UPDATE/,
            },
          ]);
          await control.c.query('ROLLBACK');
          [r1, r2] = await Promise.all([l1, l2]);
        },
      );

      expect([r1.status, r2.status]).toEqual([200, 200]);
      expect(await vivas(f.op)).toBe(3);
      const t1 = r1.body.refresh_token as string;
      const t2 = r2.body.refresh_token as string;
      expect(jtiDe(t1)).not.toBe(jtiDe(t2));
      const sessionIds = new Set(
        (await sesiones(f.op)).map((s) => s.session_id),
      );
      expect(sessionIds.size).toBe(3);
    });
  });

  describe('presupuesto: 409 cuando la espera supera el tope de 3 s', () => {
    it('devuelve 409 con el mensaje acordado y no crea sesión ni cambia seguridad_cuenta', async () => {
      const f = await entorno.fixture();
      const email = await usernameDe(f.op);
      const antes = {
        s: await seguridad(f.op),
        n: (await sesiones(f.op)).length,
      };
      let login: Res = { status: 0, body: {} };
      let ms = 0;

      await entorno.conControles(
        [
          {
            etiqueta: 'P-usuario',
            sql: 'SELECT id FROM usuarios WHERE id = $1 FOR UPDATE',
            parametros: [f.op],
            liberarMs: null,
          },
        ],
        async () => {
          const t0 = Date.now();
          const pendiente = iniciar(urlLogin, email);
          await esperarGrafo(entorno.observador, [
            {
              app: LOGIN,
              bloqueadoPor: [ctl('P-usuario')],
              consulta: BLOQUEA_USUARIO_COMPARTIDO,
            },
          ]);
          login = await pendiente;
          ms = Date.now() - t0;
        },
      );

      expect(login.status).toBe(409);
      expect(login.body.message).toBe(MENSAJE_CUENTA_OCUPADA);
      expect(ms).toBeGreaterThanOrEqual(2800);
      expect(ms).toBeLessThan(4500);
      expect(await seguridad(f.op)).toEqual(antes.s);
      expect((await sesiones(f.op)).length).toBe(antes.n);
    });
  });

  describe('ramas de la fase B', () => {
    it('contraseña temporal vigente: solo el token de cambio, sin sesión', async () => {
      const f = await entorno.fixture();
      await entorno.prisma.seguridadCuenta.update({
        where: { usuario_id: f.op },
        data: {
          debe_cambiar_password: true,
          password_temporal_expira_en: new Date(Date.now() + 3600 * 1000),
          intentos_fallidos: 2,
        },
      });
      const totalAntes = (await sesiones(f.op)).length;

      const login = await iniciar(urlLogin, await usernameDe(f.op));

      expect(login.status).toBe(200);
      expect(login.body.requiere_cambio_password).toBe(true);
      expect(typeof login.body.cambio_password_token).toBe('string');
      expect(login.body.access_token).toBeUndefined();
      expect((await sesiones(f.op)).length).toBe(totalAntes);
      expect((await seguridad(f.op))?.intentos_fallidos).toBe(0);
    });

    it('contraseña temporal vencida: 403 sin tocar intentos ni sesiones', async () => {
      const f = await entorno.fixture();
      await entorno.prisma.seguridadCuenta.update({
        where: { usuario_id: f.op },
        data: {
          debe_cambiar_password: true,
          password_temporal_expira_en: new Date(Date.now() - 1000),
          intentos_fallidos: 2,
        },
      });
      const totalAntes = (await sesiones(f.op)).length;

      const login = await iniciar(urlLogin, await usernameDe(f.op));

      expect(login.status).toBe(403);
      expect(login.body.message).toBe(
        'La contraseña temporal venció. Solicita una nueva recuperación.',
      );
      expect((await sesiones(f.op)).length).toBe(totalAntes);
      expect((await seguridad(f.op))?.intentos_fallidos).toBe(2);
    });

    it('usuario sin organización y sin seguridad_cuenta: entra y se crea seguridad_cuenta', async () => {
      const rol = await entorno.prisma.rol.findUniqueOrThrow({
        where: { nombre: 'Administrador' },
      });
      const base = await entorno.prisma.usuario.findFirstOrThrow({
        where: { id: entorno.ids.usuarios[0] },
      });
      const u = await entorno.prisma.usuario.create({
        data: {
          nombre_completo: 'sin organización',
          cedula: `so-${entorno.sufijo}`,
          username: usernameDePrueba(`so-${entorno.sufijo}@e2e.local`),
          email: `so-${entorno.sufijo}@e2e.local`,
          password_hash: base.password_hash,
          rol_id: rol.id,
        },
      });
      entorno.ids.usuarios.push(u.id);
      expect(await seguridad(u.id)).toBeNull();

      const login = await iniciar(urlLogin, u.username);

      expect(login.status).toBe(200);
      expect(login.body.usuario).toMatchObject({
        id: u.id,
        email: u.email,
        rol: 'Administrador',
        organizacion_id: null,
      });
      expect((await seguridad(u.id))?.intentos_fallidos).toBe(0);
      expect(await vivas(u.id)).toBe(1);
      expect(await permisos(login.body.access_token as string)).toBe(200);
    });

    it('contraseña incorrecta: 401 y cuenta el intento, sin abrir la fase B', async () => {
      const f = await entorno.fixture();

      const login = await iniciar(
        urlLogin,
        await usernameDe(f.op),
        'incorrecta-123',
      );

      expect(login.status).toBe(401);
      expect((await seguridad(f.op))?.intentos_fallidos).toBe(1);
    });

    it('rotación y logout siguen funcionando con la sesión creada por la fase B', async () => {
      const f = await entorno.fixture();
      const login = await iniciar(urlLogin, await usernameDe(f.op));
      const refresh = login.body.refresh_token as string;

      const rotado = await request(urlLogin)
        .post('/v1/auth/refresh')
        .send({ refresh_token: refresh });
      expect(rotado.status).toBe(200);
      const reutilizado = await refrescar(refresh);
      expect(reutilizado).toBe(401);
      const nuevo = (rotado.body as { refresh_token: string }).refresh_token;
      const salida = await request(urlLogin)
        .post('/v1/auth/logout')
        .send({ refresh_token: nuevo });
      expect(salida.status).toBe(204);
      expect(await refrescar(nuevo)).toBe(401);
    });
  });
});
