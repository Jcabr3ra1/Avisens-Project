import request from 'supertest';
import { PresupuestoTransaccion } from '../src/common/bloqueos/presupuesto-transaccion';
import { Entorno, Fixture, PASSWORD } from './soporte/entorno-presupuesto';
import {
  ProxySql,
  TransaccionCapturada,
  violacionesDelProtocolo,
} from './soporte/proxy-sql';

const APP_PROXY = 'e2e-login-protocolo';

const USUARIO = 'usuario FOR SHARE';
const REVALIDAR = 'revalidar usuario, rol y organización';
const ASEGURAR = 'asegurar seguridad_cuenta';
const SEGURIDAD = 'seguridad_cuenta FOR UPDATE';
const CANDIDATAS = 'sesiones candidatas FOR UPDATE';
const ELIMINAR = 'eliminar sesiones por ids';
const CREAR = 'crear sesión';
const REINICIAR = 'reiniciar intentos';
const DESCONOCIDA = 'sentencia fuera del contrato';

const SIN_CANDIDATAS = [
  USUARIO,
  REVALIDAR,
  ASEGURAR,
  SEGURIDAD,
  CANDIDATAS,
  CREAR,
  REINICIAR,
];
const CON_CANDIDATAS = [
  USUARIO,
  REVALIDAR,
  ASEGURAR,
  SEGURIDAD,
  CANDIDATAS,
  ELIMINAR,
  CREAR,
  REINICIAR,
];
const TEMPORAL = [USUARIO, REVALIDAR, ASEGURAR, SEGURIDAD, REINICIAR];

function etiquetaDeSentencia(sql: string): string {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (/^SELECT "id" FROM "usuarios" WHERE "id" = \$1 FOR SHARE$/.test(s)) {
    return USUARIO;
  }
  if (/JOIN "roles"/.test(s) && /LEFT JOIN "organizaciones"/.test(s)) {
    return REVALIDAR;
  }
  if (
    /^INSERT INTO "seguridad_cuenta" \("usuario_id"\) VALUES \(\$1\) ON CONFLICT \("usuario_id"\) DO NOTHING$/.test(
      s,
    )
  ) {
    return ASEGURAR;
  }
  if (/FROM "seguridad_cuenta" WHERE "usuario_id" = \$1 FOR UPDATE$/.test(s)) {
    return SEGURIDAD;
  }
  if (
    /^SELECT "id" FROM "sesiones" WHERE "usuario_id" = \$1 AND \("expira_en" < \$2 OR "revocada" = true\) ORDER BY "id" FOR UPDATE$/.test(
      s,
    )
  ) {
    return CANDIDATAS;
  }
  if (
    /^DELETE FROM "public"."sesiones" WHERE "public"."sesiones"."id" IN \(\$1(,\$\d+)*\)$/.test(
      s,
    )
  ) {
    return ELIMINAR;
  }
  if (/^INSERT INTO "public"."sesiones"/.test(s)) return CREAR;
  if (/^UPDATE "public"."seguridad_cuenta"/.test(s)) return REINICIAR;
  return DESCONOCIDA;
}

const etiquetasDeLogin = (t: TransaccionCapturada): string[] =>
  t.grupos.map((grupo) => etiquetaDeSentencia(grupo.join(' ; ')));

describe('Login: cobertura del presupuesto y orden de bloqueos sobre el SQL realmente ejecutado', () => {
  jest.setTimeout(60000);

  let entorno: Entorno;
  let proxy: ProxySql;
  let url: string;

  beforeAll(async () => {
    entorno = await Entorno.crear();
    proxy = new ProxySql(new URL(entorno.baseUrl));
    const puerto = await proxy.iniciar();
    url = (await entorno.crearApp(APP_PROXY, puerto)).url;
  });

  afterAll(async () => {
    await entorno.limpiar();
    await proxy.cerrar();
  });

  afterEach(() => jest.restoreAllMocks());

  const usernameDe = async (id: number) =>
    (await entorno.prisma.usuario.findUniqueOrThrow({ where: { id } })).username;

  const entrar = (email: string, password = PASSWORD) =>
    request(url).post('/v1/auth/login').send({ username: email, password });

  const espiarDeclaradas = (
    forzar?: (nombre: string, sentencias: number) => number,
  ) => {
    const original = Object.getOwnPropertyDescriptor(
      PresupuestoTransaccion.prototype,
      'paso',
    )!.value as PresupuestoTransaccion['paso'];
    const declaradas: number[] = [];
    jest
      .spyOn(PresupuestoTransaccion.prototype, 'paso')
      .mockImplementation(function (
        this: PresupuestoTransaccion,
        nombre: string,
        ejecutar,
        sentencias = 1,
      ) {
        const efectivas = forzar ? forzar(nombre, sentencias) : sentencias;
        declaradas.push(efectivas);
        return original.call(this, nombre, ejecutar, efectivas);
      });
    return declaradas;
  };

  const unicaTransaccion = (): TransaccionCapturada => {
    const todas = proxy.transacciones();
    expect(todas).toHaveLength(1);
    expect(todas[0].grupos.length).toBeGreaterThan(0);
    return todas[0];
  };

  const sesionRevocada = (f: Fixture) =>
    entorno.prisma.sesion.create({
      data: {
        session_id: crypto.randomUUID(),
        usuario_id: f.op,
        refresh_token_hash: 'x',
        expira_en: new Date(Date.now() + 3600 * 1000),
        revocada: true,
      },
    });

  const CASOS: Array<{
    nombre: string;
    preparar: (f: Fixture) => Promise<unknown>;
    etiquetas: string[];
    esperados: number[];
  }> = [
    {
      nombre: 'rama normal con sesiones candidatas',
      preparar: sesionRevocada,
      etiquetas: CON_CANDIDATAS,
      esperados: [1, 1, 1, 1, 1, 1, 1, 1],
    },
    {
      nombre: 'rama normal sin sesiones candidatas',
      preparar: () => Promise.resolve(),
      etiquetas: SIN_CANDIDATAS,
      esperados: [1, 1, 1, 1, 1, 1, 1],
    },
    {
      nombre: 'rama de contraseña temporal',
      preparar: (f) =>
        entorno.prisma.seguridadCuenta.update({
          where: { usuario_id: f.op },
          data: {
            debe_cambiar_password: true,
            password_temporal_expira_en: new Date(Date.now() + 3600 * 1000),
          },
        }),
      etiquetas: TEMPORAL,
      esperados: [1, 1, 1, 1, 1],
    },
  ];

  describe('cada rama: un único paso por sentencia, en el orden usuario → seguridad_cuenta → sesiones', () => {
    it.each(CASOS)('$nombre', async (caso) => {
      const f = await entorno.fixture();
      await caso.preparar(f);
      const email = await usernameDe(f.op);
      const declaradas = espiarDeclaradas();
      proxy.reiniciar();

      const res = await entrar(email);
      await new Promise((resolver) => setTimeout(resolver, 200));

      expect(res.status).toBe(200);
      const transaccion = unicaTransaccion();
      expect(transaccion.cierre).toBe('COMMIT');
      expect(
        violacionesDelProtocolo(transaccion, caso.esperados, declaradas),
      ).toEqual([]);
      expect(etiquetasDeLogin(transaccion)).toEqual(caso.etiquetas);
    });
  });

  describe('fase A: sin transacción', () => {
    it('una contraseña incorrecta nunca abre la transacción de la fase B', async () => {
      const f = await entorno.fixture();
      const email = await usernameDe(f.op);
      proxy.reiniciar();

      const res = await entrar(email, 'incorrecta-123');
      await new Promise((resolver) => setTimeout(resolver, 200));

      expect(res.status).toBe(401);
      expect(proxy.transacciones()).toEqual([]);
    });

    it('una cuenta bloqueada se rechaza sin transacción y sin ejecutar bcrypt', async () => {
      const f = await entorno.fixture();
      await entorno.prisma.seguridadCuenta.update({
        where: { usuario_id: f.op },
        data: { bloqueado_hasta: new Date(Date.now() + 3600 * 1000) },
      });
      const email = await usernameDe(f.op);
      proxy.reiniciar();

      const res = await entrar(email);
      await new Promise((resolver) => setTimeout(resolver, 200));

      expect(res.status).toBe(403);
      expect(proxy.transacciones()).toEqual([]);
    });
  });

  describe('mutaciones: el análisis detecta las coberturas y los órdenes rotos', () => {
    it('omitir un reservar deja el DELETE en el mismo grupo que el bloqueo de candidatas', async () => {
      const f = await entorno.fixture();
      await sesionRevocada(f);
      const email = await usernameDe(f.op);
      const original = Object.getOwnPropertyDescriptor(
        PresupuestoTransaccion.prototype,
        'reservar',
      )!.value as (this: PresupuestoTransaccion, k: number) => Promise<void>;
      let llamadas = 0;
      jest
        .spyOn(
          PresupuestoTransaccion.prototype as unknown as {
            reservar: (sentencias: number) => Promise<void>;
          },
          'reservar',
        )
        .mockImplementation(function (
          this: PresupuestoTransaccion,
          sentencias: number,
        ) {
          llamadas += 1;
          return llamadas === 6
            ? Promise.resolve()
            : original.call(this, sentencias);
        });
      const declaradas = espiarDeclaradas();
      proxy.reiniciar();

      const res = await entrar(email);
      await new Promise((resolver) => setTimeout(resolver, 200));

      expect(res.status).toBe(200);
      const violaciones = violacionesDelProtocolo(
        unicaTransaccion(),
        [1, 1, 1, 1, 1, 1, 1, 1],
        declaradas,
      );
      expect(violaciones.join('\n')).toMatch(/no todas son lecturas simples/);
    });

    it('declarar más sentencias de las que ejecuta un paso no coincide con el SQL real', async () => {
      const f = await entorno.fixture();
      const email = await usernameDe(f.op);
      const declaradas = espiarDeclaradas((nombre, k) =>
        nombre === 'crear sesión' ? 2 : k,
      );
      proxy.reiniciar();

      const res = await entrar(email);
      await new Promise((resolver) => setTimeout(resolver, 200));

      expect(res.status).toBe(200);
      expect(
        violacionesDelProtocolo(
          unicaTransaccion(),
          [1, 1, 1, 1, 1, 1, 1],
          declaradas,
        ).join('\n'),
      ).toMatch(/distintos de las sentencias declaradas/);
    });

    const transaccionDe = (...sentencias: string[]): TransaccionCapturada => ({
      conn: 1,
      preambulo: ['SET TRANSACTION ISOLATION LEVEL READ COMMITTED'],
      grupos: sentencias.map((s) => [s]),
      cierre: 'COMMIT',
    });

    const SQL = {
      usuario: 'SELECT "id" FROM "usuarios" WHERE "id" = $1 FOR SHARE',
      revalidar:
        'SELECT u."email" FROM "usuarios" u JOIN "roles" r ON r."id" = u."rol_id" LEFT JOIN "organizaciones" o ON o."id" = u."organizacion_id" WHERE u."id" = $1',
      asegurar:
        'INSERT INTO "seguridad_cuenta" ("usuario_id") VALUES ($1) ON CONFLICT ("usuario_id") DO NOTHING',
      seguridad:
        'SELECT "bloqueado_hasta" FROM "seguridad_cuenta" WHERE "usuario_id" = $1 FOR UPDATE',
      candidatas:
        'SELECT "id" FROM "sesiones" WHERE "usuario_id" = $1 AND ("expira_en" < $2 OR "revocada" = true) ORDER BY "id" FOR UPDATE',
      eliminar:
        'DELETE FROM "public"."sesiones" WHERE "public"."sesiones"."id" IN ($1,$2)',
      deleteAmplio:
        'DELETE FROM "public"."sesiones" WHERE ("public"."sesiones"."usuario_id" = $1 AND ("public"."sesiones"."expira_en" < $2 OR "public"."sesiones"."revocada" = $3))',
      crear: 'INSERT INTO "public"."sesiones" ("session_id") VALUES ($1)',
      reiniciar:
        'UPDATE "public"."seguridad_cuenta" SET "intentos_fallidos" = $1',
    };

    it('el contrato exacto se reconoce (control de la propia prueba)', () => {
      expect(
        etiquetasDeLogin(
          transaccionDe(
            SQL.usuario,
            SQL.revalidar,
            SQL.asegurar,
            SQL.seguridad,
            SQL.candidatas,
            SQL.eliminar,
            SQL.crear,
            SQL.reiniciar,
          ),
        ),
      ).toEqual(CON_CANDIDATAS);
    });

    it('un deleteMany amplio por usuario en lugar de los ids seleccionados queda fuera del contrato', () => {
      const etiquetas = etiquetasDeLogin(
        transaccionDe(
          SQL.usuario,
          SQL.revalidar,
          SQL.asegurar,
          SQL.seguridad,
          SQL.deleteAmplio,
          SQL.crear,
          SQL.reiniciar,
        ),
      );

      expect(etiquetas).toContain(DESCONOCIDA);
      expect(etiquetas).not.toEqual(SIN_CANDIDATAS);
    });

    it('bloquear seguridad_cuenta antes que el usuario rompe el orden', () => {
      const etiquetas = etiquetasDeLogin(
        transaccionDe(
          SQL.seguridad,
          SQL.usuario,
          SQL.revalidar,
          SQL.asegurar,
          SQL.candidatas,
          SQL.crear,
          SQL.reiniciar,
        ),
      );

      expect(etiquetas).not.toEqual(SIN_CANDIDATAS);
    });

    it('tomar las sesiones antes que seguridad_cuenta rompe el orden', () => {
      const etiquetas = etiquetasDeLogin(
        transaccionDe(
          SQL.usuario,
          SQL.revalidar,
          SQL.asegurar,
          SQL.candidatas,
          SQL.seguridad,
          SQL.crear,
          SQL.reiniciar,
        ),
      );

      expect(etiquetas).not.toEqual(SIN_CANDIDATAS);
    });

    it('modificar seguridad_cuenta antes de revalidar rompe el orden', () => {
      const etiquetas = etiquetasDeLogin(
        transaccionDe(
          SQL.usuario,
          SQL.asegurar,
          SQL.revalidar,
          SQL.seguridad,
          SQL.candidatas,
          SQL.crear,
          SQL.reiniciar,
        ),
      );

      expect(etiquetas).not.toEqual(SIN_CANDIDATAS);
    });

    it('un bloqueo de usuario FOR UPDATE en lugar de FOR SHARE queda fuera del contrato', () => {
      const etiquetas = etiquetasDeLogin(
        transaccionDe(
          SQL.usuario.replace('FOR SHARE', 'FOR UPDATE'),
          SQL.revalidar,
          SQL.asegurar,
          SQL.seguridad,
          SQL.candidatas,
          SQL.crear,
          SQL.reiniciar,
        ),
      );

      expect(etiquetas[0]).toBe(DESCONOCIDA);
    });

    it('una escritura antes del primer set_config es una violación', () => {
      const transaccion: TransaccionCapturada = {
        conn: 1,
        preambulo: [
          'SET TRANSACTION ISOLATION LEVEL READ COMMITTED',
          SQL.deleteAmplio,
        ],
        grupos: [[SQL.usuario]],
        cierre: 'COMMIT',
      };

      expect(violacionesDelProtocolo(transaccion, [1], [1]).join('\n')).toMatch(
        /antes del primer set_config/,
      );
    });
  });
});
