import { Prisma } from '@prisma/client';
import request from 'supertest';
import {
  Entorno,
  Etapa,
  Fixture,
  Medicion,
} from './soporte/entorno-presupuesto';
import {
  esEsperaVencida,
  PresupuestoAgotado,
  PresupuestoTransaccion,
  SentenciaVencida,
  transaccionConPresupuesto,
} from '../src/common/bloqueos/presupuesto-transaccion';
import { PrismaService } from '../src/prisma/prisma.service';

const APP = 'e2e-presupuesto-http';
const APP_DIRECTA = 'e2e-presupuesto-directa';
const MENSAJE_USUARIO_OCUPADO =
  'El usuario está siendo modificado por otra operación; intenta de nuevo';
const MENSAJE_ASIGNACION_OCUPADA =
  'Hay otra operación modificando los datos de esta asignación; intenta de nuevo';
const MENSAJE_ORGANIZACION_OCUPADA =
  'La organización está siendo modificada por otra operación; intenta de nuevo';

describe('Presupuesto de esperas de las transacciones con bloqueos (e2e)', () => {
  jest.setTimeout(60000);

  let entorno: Entorno;
  let prismaDirecto: PrismaService;
  let url: string;

  beforeAll(async () => {
    entorno = await Entorno.crear();
    url = (await entorno.crearApp(APP)).url;
    prismaDirecto = entorno.clientePrisma(APP_DIRECTA);
  });

  afterAll(async () => {
    await entorno.limpiar();
  });

  const estado = async (f: Fixture) => ({
    usuarioActivo: (
      await entorno.prisma.usuario.findUniqueOrThrow({ where: { id: f.op } })
    ).activo,
    sesionesVivas: await entorno.prisma.sesion.count({
      where: { usuario_id: f.op, revocada: false },
    }),
    asignacionesActivas: await entorno.prisma.usuarioGalpon.count({
      where: { usuario_id: f.op, activa: true },
    }),
  });

  const sinCambios = {
    usuarioActivo: true,
    sesionesVivas: 1,
    asignacionesActivas: 1,
  };

  const cadenaDeUsuario = (
    f: Fixture,
    liberar: [number, number, number | null],
  ): Etapa[] => [
    {
      etiqueta: 'A-usuario',
      sql: 'SELECT id FROM usuarios WHERE id = $1 FOR UPDATE',
      parametros: [f.op],
      liberarMs: liberar[0],
    },
    {
      etiqueta: 'B-sesion',
      sql: 'SELECT id FROM sesiones WHERE usuario_id = $1 FOR UPDATE',
      parametros: [f.op],
      liberarMs: liberar[1],
    },
    {
      etiqueta: 'C-asignacion',
      sql: 'SELECT id FROM usuarios_galpones WHERE usuario_id = $1 FOR UPDATE',
      parametros: [f.op],
      liberarMs: liberar[2],
    },
  ];

  const patchDesactivar = (f: Fixture) => () =>
    request(url)
      .patch(`/v1/usuarios/${f.op}`)
      .set(entorno.auth())
      .send({ activo: false });

  const ajustesLocalesDeLasConexiones = async (aplicacion: PrismaService) => {
    const lecturas = await Promise.all(
      Array.from(
        { length: 14 },
        () =>
          aplicacion.$queryRaw<
            Array<{ lock: string; sentencia: string }>
          >`SELECT pg_sleep(0.3)::text AS dormido, current_setting('lock_timeout') AS lock, current_setting('statement_timeout') AS sentencia`,
      ),
    );
    const base = (
      await entorno.observador.query<{ lock: string; sentencia: string }>(
        `SELECT current_setting('lock_timeout') AS lock, current_setting('statement_timeout') AS sentencia`,
      )
    ).rows[0];
    return {
      lecturas: lecturas.map((l) => ({
        lock: l[0].lock,
        sentencia: l[0].sentencia,
      })),
      base,
    };
  };

  const sinAjustesPegados = async (aplicacion: PrismaService) => {
    const { lecturas, base } = await ajustesLocalesDeLasConexiones(aplicacion);
    expect(lecturas.length).toBe(14);
    for (const lectura of lecturas) {
      expect(lectura).toEqual(base);
    }
  };

  const verificar = (m: Medicion, ms: [number, number]) => {
    expect(m.ms).toBeGreaterThanOrEqual(ms[0]);
    expect(m.ms).toBeLessThanOrEqual(ms[1]);
    expect(m.idleEnTransaccion).toBe(0);
  };

  describe('esperas encadenadas entre pasos: antes 500 (P2028) pasadas de 10 s, ahora 409 dentro del presupuesto', () => {
    it('PATCH activo:false con esperas de 4 / 8,6 / 12 s: 409 a ~8 s, revierte y libera la conexión', async () => {
      const f = await entorno.fixture();

      const m = await entorno.medir(
        APP,
        cadenaDeUsuario(f, [4000, 8600, 12000]),
        patchDesactivar(f),
      );

      expect(m.status).toBe(409);
      expect(m.body.message).toBe(MENSAJE_USUARIO_OCUPADO);
      verificar(m, [7000, 9500]);
      expect(m.bloqueadoPor).toEqual(
        expect.arrayContaining(['A-usuario', 'B-sesion']),
      );
      expect(await estado(f)).toEqual(sinCambios);
      await sinAjustesPegados(entorno.prisma);
    });

    it('PATCH activo:false cuando la suma de esperas cabe (2,5 s + 2,5 s): 200 y revoca todo', async () => {
      const f = await entorno.fixture();

      const m = await entorno.medir(
        APP,
        cadenaDeUsuario(f, [2500, 5000, 5000]).slice(0, 2),
        patchDesactivar(f),
      );

      expect(m.status).toBe(200);
      expect(m.body).toMatchObject({ id: f.op, activo: false });
      expect(m.ms).toBeLessThan(7000);
      expect(m.idleEnTransaccion).toBe(0);
      expect(await estado(f)).toEqual({
        usuarioActivo: false,
        sesionesVivas: 0,
        asignacionesActivas: 0,
      });
    });

    it('DELETE organización con esperas de 3,5 / 7 / 10,5 s: 409 a ~8 s y revierte', async () => {
      const f = await entorno.fixture();

      const m = await entorno.medir(
        APP,
        cadenaDeUsuario(f, [3500, 7000, 10500]),
        () =>
          request(url)
            .delete(`/v1/organizaciones/${f.org}`)
            .set(entorno.auth()),
      );

      expect(m.status).toBe(409);
      expect(m.body.message).toBe(MENSAJE_ORGANIZACION_OCUPADA);
      verificar(m, [7000, 9500]);
      expect(await estado(f)).toEqual(sinCambios);
      expect(
        (
          await entorno.prisma.organizacion.findUniqueOrThrow({
            where: { id: f.org },
          })
        ).activa,
      ).toBe(true);
      await sinAjustesPegados(entorno.prisma);
    });

    it('asignar galpón con tres esperas de 2,8 s (8,4 s en total): 409 a ~8 s y no crea la asignación', async () => {
      const f = await entorno.fixture();

      const m = await entorno.medir(
        APP,
        [
          {
            etiqueta: 'A-usuario',
            sql: 'SELECT id FROM usuarios WHERE id = $1 FOR NO KEY UPDATE',
            parametros: [f.op],
            liberarMs: 2800,
          },
          {
            etiqueta: 'B-galpon',
            sql: 'SELECT id FROM galpones WHERE id = $1 FOR NO KEY UPDATE',
            parametros: [f.objetivo],
            liberarMs: 5600,
          },
          {
            etiqueta: 'C-alta',
            sql: 'INSERT INTO usuarios_galpones (usuario_id, galpon_id, activa) VALUES ($1, $2, true)',
            parametros: [f.op, f.objetivo],
            liberarMs: 8400,
          },
        ],
        () =>
          request(url)
            .post('/v1/usuarios-galpones')
            .set(entorno.auth())
            .send({ usuario_id: f.op, galpon_id: f.objetivo }),
      );

      expect(m.status).toBe(409);
      expect(m.body.message).toBe(MENSAJE_ASIGNACION_OCUPADA);
      verificar(m, [7000, 9500]);
      expect(m.bloqueadoPor).toEqual(
        expect.arrayContaining(['A-usuario', 'B-galpon', 'C-alta']),
      );
      expect(
        await entorno.prisma.usuarioGalpon.count({
          where: { usuario_id: f.op, galpon_id: f.objetivo },
        }),
      ).toBe(0);
      await sinAjustesPegados(entorno.prisma);
    });
  });

  describe('esperas encadenadas dentro de una misma llamada de Prisma (nivel de transacción, sin lecturas previas de la petición)', () => {
    it('con la llamada dividida (escritura + lectura con k = 3) las mismas esperas dan 409 a ~6 s, no a 13 s', async () => {
      const f = await entorno.fixture();
      await entorno.conControles(
        [
          {
            etiqueta: 'A-fila',
            sql: 'SELECT id FROM usuarios WHERE id = $1 FOR UPDATE',
            parametros: [f.op],
            liberarMs: null,
          },
          {
            etiqueta: 'B-roles',
            sql: 'LOCK TABLE roles IN ACCESS EXCLUSIVE MODE',
            parametros: [],
            liberarMs: null,
          },
          {
            etiqueta: 'C-orgs',
            sql: 'LOCK TABLE organizaciones IN ACCESS EXCLUSIVE MODE',
            parametros: [],
            liberarMs: null,
          },
        ],
        async (retenidos, programador) => {
          const soltarEn = [4500, 9000, 13000];
          retenidos.forEach((r, i) => {
            programador.programar(`liberar ${r.etiqueta}`, soltarEn[i], () =>
              r.c.query('ROLLBACK'),
            );
          });
          const t0 = Date.now();
          try {
            const error = await transaccionConPresupuesto(
              prismaDirecto,
              5000,
              async (p) => {
                await p.paso('actualizar', (tx) =>
                  tx.usuario.update({
                    where: { id: f.op },
                    data: { activo: false },
                    select: { id: true },
                  }),
                );
                await p.paso(
                  'leer respuesta',
                  (tx) =>
                    tx.usuario.findUniqueOrThrow({
                      where: { id: f.op },
                      select: {
                        id: true,
                        rol: { select: { id: true } },
                        organizacion: { select: { id: true } },
                      },
                    }),
                  3,
                );
              },
            ).then(
              () => null,
              (e: unknown) => e,
            );

            const ms = Date.now() - t0;
            expect(esEsperaVencida(error)).toBe(true);
            expect(ms).toBeGreaterThan(5000);
            expect(ms).toBeLessThan(8300);
            expect(
              (
                await entorno.prisma.usuario.findUniqueOrThrow({
                  where: { id: f.op },
                })
              ).activo,
            ).toBe(true);
          } finally {
            await new Promise((resolver) =>
              setTimeout(resolver, Math.max(0, 13300 - (Date.now() - t0))),
            );
          }
        },
      );
    });
  });

  describe('lo que no se traduce a 409', () => {
    it('una cancelación manual (pg_cancel_backend) de la espera sigue siendo 500', async () => {
      const f = await entorno.fixture();

      const m = await entorno.medir(
        APP,
        cadenaDeUsuario(f, [20000, 20000, 20000]).slice(0, 1),
        patchDesactivar(f),
        {
          acciones: [
            {
              enMs: 1500,
              ejecutar: async () => {
                await entorno.observador.query(
                  `SELECT pg_cancel_backend(pid) FROM pg_stat_activity
                    WHERE application_name = $1 AND wait_event_type = 'Lock'`,
                  [APP],
                );
              },
            },
          ],
        },
      );

      expect(m.status).toBe(500);
      expect(m.ms).toBeLessThan(4000);
      expect(m.idleEnTransaccion).toBe(0);
      expect(await estado(f)).toEqual(sinCambios);
      await sinAjustesPegados(entorno.prisma);
    });

    it('un deadlock real (40P01) sigue sin convertirse en 409', async () => {
      const f = await entorno.fixture();
      let codigoDelOtro = '';

      const m = await entorno.medir(
        APP,
        [
          {
            etiqueta: 'D-sesion',
            sql: 'SELECT id FROM sesiones WHERE usuario_id = $1 FOR UPDATE',
            parametros: [f.op],
            liberarMs: null,
          },
        ],
        patchDesactivar(f),
        {
          asentarMs: 1500,
          acciones: [
            {
              enMs: 700,
              ejecutar: async (retenidos) => {
                const otro = retenidos.get('D-sesion')!;
                try {
                  await otro.query(
                    'SELECT id FROM usuarios WHERE id = $1 FOR UPDATE',
                    [f.op],
                  );
                } catch (error) {
                  codigoDelOtro = (error as { code?: string }).code ?? '';
                }
                await otro.query('ROLLBACK').catch(() => undefined);
              },
            },
          ],
        },
      );

      expect(m.status).not.toBe(409);
      expect(
        (codigoDelOtro === '40P01' && m.status === 200) ||
          (codigoDelOtro === '' && m.status === 500),
      ).toBe(true);
      expect(m.idleEnTransaccion).toBe(0);
    });

    it('una sentencia lenta que excede su statement_timeout armado (57014 con el mensaje exacto) sí es SentenciaVencida', async () => {
      const t0 = Date.now();

      const error = await prismaDirecto
        .$transaction(async (tx) => {
          const p = new PresupuestoTransaccion(tx, 5000, undefined, 1000, 250);
          await p.paso(
            'sentencia lenta',
            (cliente) => cliente.$queryRaw`SELECT pg_sleep(4)::text`,
          );
        })
        .then(
          () => null,
          (e: unknown) => e,
        );

      expect(error).toBeInstanceOf(SentenciaVencida);
      expect(esEsperaVencida(error)).toBe(true);
      expect(Date.now() - t0).toBeGreaterThanOrEqual(1100);
      expect(Date.now() - t0).toBeLessThan(2500);
    });

    it('la misma sentencia cancelada a mano (pg_cancel_backend) antes del vencimiento no se traduce', async () => {
      const cancelar = setTimeout(() => {
        void entorno.observador
          .query(
            `SELECT pg_cancel_backend(pid) FROM pg_stat_activity
              WHERE application_name = $1 AND query LIKE '%pg_sleep(4)%'
                AND pid <> pg_backend_pid()`,
            [APP_DIRECTA],
          )
          .catch(() => undefined);
      }, 400);

      const error = await prismaDirecto
        .$transaction(async (tx) => {
          const p = new PresupuestoTransaccion(tx, 5000, undefined, 1000, 250);
          await p.paso(
            'sentencia lenta',
            (cliente) => cliente.$queryRaw`SELECT pg_sleep(4)::text`,
          );
        })
        .then(
          () => null,
          (e: unknown) => e,
        );
      clearTimeout(cancelar);

      expect(error).not.toBeInstanceOf(SentenciaVencida);
      expect(error).not.toBeNull();
      expect(esEsperaVencida(error)).toBe(false);
    });

    it('P2028 de maxWait (sin conexión libre) no entra en la traducción y queda fuera del presupuesto', async () => {
      const saturado = entorno.clientePrisma('e2e-presupuesto-saturado');
      const ocupando = Array.from({ length: 10 }, async () => {
        await saturado.$queryRaw`SELECT pg_sleep(4)::text`;
      });
      await new Promise((resolver) => setTimeout(resolver, 300));
      const inicio = Date.now();

      const error = await transaccionConPresupuesto(saturado, 5000, (p) =>
        p.paso('nunca llega', () => Promise.resolve()),
      ).then(
        () => null,
        (e: unknown) => e,
      );

      expect((error as { code?: string } | null)?.code).toBe('P2028');
      expect(esEsperaVencida(error)).toBe(false);
      expect(Date.now() - inicio).toBeGreaterThanOrEqual(1500);
      await Promise.all(ocupando);
    });

    it('P2028 de la transacción vencida (10 s de Prisma) tampoco se traduce', async () => {
      const f = await entorno.fixture();
      await entorno.conControles(
        [
          {
            etiqueta: 'L-larga',
            sql: 'SELECT id FROM usuarios WHERE id = $1 FOR UPDATE',
            parametros: [f.op],
            liberarMs: null,
          },
        ],
        async (retenidos, programador) => {
          programador.programar('liberar L-larga', 11000, () =>
            retenidos[0].c.query('ROLLBACK'),
          );
          {
            const error = await prismaDirecto
              .$transaction(
                async (tx) => {
                  const p = new PresupuestoTransaccion(
                    tx,
                    20000,
                    undefined,
                    40000,
                    250,
                  );
                  await p.paso(
                    'espera larga',
                    (cliente) =>
                      cliente.$queryRaw`SELECT id FROM usuarios WHERE id = ${f.op} FOR UPDATE`,
                  );
                  await p.paso(
                    'siguiente',
                    (cliente) => cliente.$queryRaw`SELECT 1`,
                  );
                },
                {
                  isolationLevel:
                    Prisma.TransactionIsolationLevel.ReadCommitted,
                  timeout: 10000,
                },
              )
              .then(
                () => null,
                (e: unknown) => e,
              );

            expect((error as { code?: string } | null)?.code).toBe('P2028');
            expect(esEsperaVencida(error)).toBe(false);
            expect(error).not.toBeInstanceOf(PresupuestoAgotado);
          }
        },
      );
    });
  });

  describe('el hueco original: una llamada de Prisma con relaciones son varias sentencias', () => {
    it('la llamada sin dividir supera los 8 s y 10 s de Prisma; el paso siguiente aborta sin enviarse', async () => {
      const f = await entorno.fixture();
      await entorno.conControles(
        [
          {
            etiqueta: 'A-fila',
            sql: 'SELECT id FROM usuarios WHERE id = $1 FOR UPDATE',
            parametros: [f.op],
            liberarMs: null,
          },
          {
            etiqueta: 'B-roles',
            sql: 'LOCK TABLE roles IN ACCESS EXCLUSIVE MODE',
            parametros: [],
            liberarMs: null,
          },
          {
            etiqueta: 'C-orgs',
            sql: 'LOCK TABLE organizaciones IN ACCESS EXCLUSIVE MODE',
            parametros: [],
            liberarMs: null,
          },
        ],
        async (retenidos, programador) => {
          const soltarEn = [4500, 9000, 13000];
          retenidos.forEach((r, i) => {
            programador.programar(`liberar ${r.etiqueta}`, soltarEn[i], () =>
              r.c.query('ROLLBACK'),
            );
          });
          const t0 = Date.now();
          let siguienteEjecutado = false;
          try {
            const error = await transaccionConPresupuesto(
              prismaDirecto,
              5000,
              async (p) => {
                await p.paso('llamada sin dividir', (tx) =>
                  tx.usuario.update({
                    where: { id: f.op },
                    data: { activo: false },
                    select: {
                      id: true,
                      rol: { select: { id: true } },
                      organizacion: { select: { id: true } },
                    },
                  }),
                );
                await p.paso('paso siguiente', (tx) => {
                  siguienteEjecutado = true;
                  return tx.$queryRaw`SELECT 1`;
                });
              },
            ).then(
              () => null,
              (e: unknown) => e,
            );

            const ms = Date.now() - t0;
            expect(error).toBeInstanceOf(PresupuestoAgotado);
            expect(ms).toBeGreaterThan(12000);
            expect(siguienteEjecutado).toBe(false);
            expect(
              (
                await entorno.prisma.usuario.findUniqueOrThrow({
                  where: { id: f.op },
                })
              ).activo,
            ).toBe(true);
          } finally {
            await new Promise((resolver) => setTimeout(resolver, 500));
          }
        },
      );
    });
  });
});
