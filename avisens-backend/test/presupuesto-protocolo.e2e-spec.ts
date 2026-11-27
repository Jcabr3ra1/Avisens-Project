import request from 'supertest';
import { Entorno, Fixture } from './soporte/entorno-presupuesto';
import {
  ProxySql,
  TransaccionCapturada,
  violacionesDelProtocolo,
} from './soporte/proxy-sql';
import {
  PresupuestoTransaccion,
  transaccionConPresupuesto,
} from '../src/common/bloqueos/presupuesto-transaccion';
import { PrismaService } from '../src/prisma/prisma.service';

const APP_PROXY = 'e2e-protocolo-http';
const APP_PROXY_DIRECTA = 'e2e-protocolo-directa';

interface Operacion {
  nombre: string;
  conFilaObjetivoInactiva?: boolean;
  esperados: number[];
  pedir: (url: string, e: Entorno, f: Fixture) => request.Test;
}

const SOLO_ESCRITURAS = (n: number) => Array.from({ length: n }, () => 1);

describe('Presupuesto: cobertura sobre el SQL realmente ejecutado (protocolo de Postgres)', () => {
  jest.setTimeout(60000);

  let entorno: Entorno;
  let proxy: ProxySql;
  let url: string;
  let prismaProxy: PrismaService;

  beforeAll(async () => {
    entorno = await Entorno.crear();
    proxy = new ProxySql(new URL(entorno.baseUrl));
    const puerto = await proxy.iniciar();
    url = (await entorno.crearApp(APP_PROXY, puerto)).url;
    prismaProxy = entorno.clientePrisma(APP_PROXY_DIRECTA, puerto);
    await prismaProxy.$connect();
  });

  afterAll(async () => {
    await entorno.limpiar();
    await proxy.cerrar();
  });

  afterEach(() => jest.restoreAllMocks());

  const OPERACIONES: Operacion[] = [
    {
      nombre: 'POST /usuarios-galpones (alta nueva)',
      esperados: [1, 2, 1, 2, 1, 1, 3],
      pedir: (u, e, f) =>
        request(u)
          .post('/v1/usuarios-galpones')
          .set(e.auth())
          .send({ usuario_id: f.op, galpon_id: f.objetivo }),
    },
    {
      nombre: 'POST /usuarios/:id/galpones (fila existente inactiva)',
      conFilaObjetivoInactiva: true,
      esperados: [1, 2, 1, 2, 1, 1, 3],
      pedir: (u, e, f) =>
        request(u)
          .post(`/v1/usuarios/${f.op}/galpones`)
          .set(e.auth())
          .send({ galpon_id: f.objetivo }),
    },
    {
      nombre: 'PATCH /usuarios-galpones/:id/activar',
      conFilaObjetivoInactiva: true,
      esperados: [1, 2, 1, 2, 1, 1, 3],
      pedir: (u, e, f) =>
        request(u)
          .patch(`/v1/usuarios-galpones/${f.filaObjetivo}/activar`)
          .set(e.auth()),
    },
    {
      nombre: 'PATCH /usuarios/:id {activo:false}',
      esperados: [1, 3, 1, 1, 1, 1],
      pedir: (u, e, f) =>
        request(u)
          .patch(`/v1/usuarios/${f.op}`)
          .set(e.auth())
          .send({ activo: false, nombre_completo: 'cambiado' }),
    },
    {
      nombre: 'DELETE /usuarios/:id',
      esperados: SOLO_ESCRITURAS(5),
      pedir: (u, e, f) =>
        request(u).delete(`/v1/usuarios/${f.op}`).set(e.auth()),
    },
    {
      nombre: 'DELETE /usuarios/:id/permanente',
      esperados: SOLO_ESCRITURAS(7),
      pedir: (u, e, f) =>
        request(u).delete(`/v1/usuarios/${f.op}/permanente`).set(e.auth()),
    },
    {
      nombre: 'DELETE /organizaciones/:id',
      esperados: SOLO_ESCRITURAS(8),
      pedir: (u, e, f) =>
        request(u).delete(`/v1/organizaciones/${f.org}`).set(e.auth()),
    },
    {
      nombre: 'PATCH /galpones/:id {activo:false}',
      esperados: [1, 2, 1, 1],
      pedir: (u, e, f) =>
        request(u)
          .patch(`/v1/galpones/${f.previo}`)
          .set(e.auth())
          .send({ activo: false }),
    },
    {
      nombre: 'DELETE /galpones/:id',
      esperados: SOLO_ESCRITURAS(3),
      pedir: (u, e, f) =>
        request(u).delete(`/v1/galpones/${f.previo}`).set(e.auth()),
    },
    {
      nombre: 'DELETE /galpones/:id/permanente',
      esperados: SOLO_ESCRITURAS(4),
      pedir: (u, e, f) =>
        request(u).delete(`/v1/galpones/${f.previo}/permanente`).set(e.auth()),
    },
  ];

  const transaccionConGrupos = (): TransaccionCapturada => {
    const conGrupos = proxy.transacciones().filter((t) => t.grupos.length > 0);
    expect(conGrupos).toHaveLength(1);
    return conGrupos[0];
  };

  const espiarDeclaradas = (forzarUnaSentencia = false) => {
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
        const efectivas = forzarUnaSentencia ? 1 : sentencias;
        declaradas.push(efectivas);
        return original.call(this, nombre, ejecutar, efectivas);
      });
    return declaradas;
  };

  describe('cada operación: grupos reales = grupos esperados = sentencias declaradas por los pasos', () => {
    it.each(OPERACIONES)('$nombre', async (operacion) => {
      const f = await entorno.fixture(operacion.conFilaObjetivoInactiva);
      const declaradas = espiarDeclaradas();
      proxy.reiniciar();

      const res = await operacion.pedir(url, entorno, f);
      await new Promise((resolver) => setTimeout(resolver, 200));

      expect([200, 201]).toContain(res.status);
      const transaccion = transaccionConGrupos();
      expect(transaccion.cierre).toBe('COMMIT');
      expect(
        violacionesDelProtocolo(transaccion, operacion.esperados, declaradas),
      ).toEqual([]);
    });
  });

  describe('mutaciones: el análisis de protocolo detecta las coberturas rotas', () => {
    it('omitir un reservar deja dos sentencias de escritura en un mismo grupo', async () => {
      const f = await entorno.fixture();
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
          return llamadas === 4
            ? Promise.resolve()
            : original.call(this, sentencias);
        });
      const declaradas = espiarDeclaradas();
      proxy.reiniciar();

      await request(url)
        .patch(`/v1/usuarios/${f.op}`)
        .set(entorno.auth())
        .send({ activo: false })
        .expect(200);
      await new Promise((resolver) => setTimeout(resolver, 200));

      const violaciones = violacionesDelProtocolo(
        transaccionConGrupos(),
        [1, 3, 1, 1, 1, 1],
        declaradas,
      );
      expect(violaciones.length).toBeGreaterThan(0);
      expect(violaciones.join('\n')).toMatch(/no todas son lecturas simples/);
    });

    it('declarar menos sentencias de las que el paso ejecuta (k = 1 en la lectura de 3)', async () => {
      const f = await entorno.fixture();
      const declaradas = espiarDeclaradas(true);
      proxy.reiniciar();

      await request(url)
        .patch(`/v1/usuarios/${f.op}`)
        .set(entorno.auth())
        .send({ activo: false })
        .expect(200);
      await new Promise((resolver) => setTimeout(resolver, 200));

      const violaciones = violacionesDelProtocolo(
        transaccionConGrupos(),
        [1, 3, 1, 1, 1, 1],
        declaradas,
      );
      expect(violaciones.join('\n')).toMatch(
        /distintos de las sentencias declaradas/,
      );
    });

    it('volver a la llamada con relaciones como un solo paso: 4 sentencias con una escritura', async () => {
      const f = await entorno.fixture();
      const declaradas = espiarDeclaradas();
      proxy.reiniciar();

      await transaccionConPresupuesto(prismaProxy, 5000, (p) =>
        p.paso('llamada sin dividir', (tx) =>
          tx.usuario.update({
            where: { id: f.op },
            data: { activo: false },
            select: {
              id: true,
              rol: { select: { id: true, nombre: true } },
              organizacion: { select: { id: true, nombre: true } },
            },
          }),
        ),
      );
      await new Promise((resolver) => setTimeout(resolver, 200));

      const transaccion = transaccionConGrupos();
      expect(transaccion.grupos[0].length).toBeGreaterThan(1);
      const violaciones = violacionesDelProtocolo(transaccion, [1], declaradas);
      expect(violaciones.join('\n')).toMatch(/no todas son lecturas simples/);
      expect(violaciones.join('\n')).toMatch(
        /distintos de las sentencias declaradas/,
      );
    });

    it('una escritura antes del primer set_config es una violación', () => {
      const transaccion: TransaccionCapturada = {
        conn: 1,
        preambulo: [
          'SET TRANSACTION ISOLATION LEVEL READ COMMITTED',
          'UPDATE "usuarios" SET "activo" = $1 WHERE "id" = $2',
        ],
        grupos: [['SELECT 1']],
        cierre: 'COMMIT',
      };

      expect(violacionesDelProtocolo(transaccion, [1], [1]).join('\n')).toMatch(
        /antes del primer set_config/,
      );
    });

    it('un grupo de lecturas con un FOR UPDATE o una escritura no cuenta como lectura simple', () => {
      const conBloqueo: TransaccionCapturada = {
        conn: 1,
        preambulo: ['SET TRANSACTION ISOLATION LEVEL READ COMMITTED'],
        grupos: [
          ['SELECT id FROM usuarios', 'SELECT id FROM roles FOR UPDATE'],
        ],
        cierre: 'COMMIT',
      };
      const conEscritura: TransaccionCapturada = {
        ...conBloqueo,
        grupos: [['SELECT id FROM usuarios', 'UPDATE roles SET nombre = $1']],
      };

      for (const t of [conBloqueo, conEscritura]) {
        expect(violacionesDelProtocolo(t, [2], [2]).join('\n')).toMatch(
          /no todas son lecturas simples/,
        );
      }
    });

    it('un grupo vacío, un cierre ausente o grupos distintos de los esperados', () => {
      const transaccion: TransaccionCapturada = {
        conn: 1,
        preambulo: ['SET TRANSACTION ISOLATION LEVEL READ COMMITTED'],
        grupos: [[], ['SELECT 1']],
        cierre: '',
      };

      const texto = violacionesDelProtocolo(transaccion, [1, 1], [1, 1]).join(
        '\n',
      );

      expect(texto).toMatch(/no ejecutó ninguna sentencia/);
      expect(texto).toMatch(/COMMIT\/ROLLBACK/);
      expect(texto).toMatch(/distintos de los esperados/);
    });
  });

  describe('los ajustes locales no sobreviven a la transacción', () => {
    it('tras confirmar y tras revertir, ninguna conexión del pool conserva lock_timeout ni statement_timeout', async () => {
      const f = await entorno.fixture();
      await request(url)
        .patch(`/v1/usuarios/${f.op}`)
        .set(entorno.auth())
        .send({ activo: false })
        .expect(200);
      await expect(
        transaccionConPresupuesto(prismaProxy, 5000, async (p) => {
          await p.paso('lectura', (tx) => tx.$queryRaw`SELECT 1`);
          throw new Error('revertir a propósito');
        }),
      ).rejects.toThrow('revertir a propósito');

      for (const cliente of [prismaProxy, entorno.prisma]) {
        const lecturas = await Promise.all(
          Array.from(
            { length: 14 },
            () =>
              cliente.$queryRaw<
                Array<{ lock: string; sentencia: string }>
              >`SELECT pg_sleep(0.3)::text AS dormido, current_setting('lock_timeout') AS lock, current_setting('statement_timeout') AS sentencia`,
          ),
        );
        const base = (
          await entorno.observador.query<{ lock: string; sentencia: string }>(
            `SELECT current_setting('lock_timeout') AS lock, current_setting('statement_timeout') AS sentencia`,
          )
        ).rows[0];
        for (const lectura of lecturas)
          expect({
            lock: lectura[0].lock,
            sentencia: lectura[0].sentencia,
          }).toEqual(base);
      }
    });
  });
});
