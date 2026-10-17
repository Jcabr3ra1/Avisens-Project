import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  clienteDePrueba,
  secuenciaDeLlamadas,
} from '../../common/bloqueos/cliente-de-prueba.testing';
import {
  PresupuestoAgotado,
  SentenciaVencida,
} from '../../common/bloqueos/presupuesto-transaccion';
import { MENSAJE_CUENTA_OCUPADA } from '../../common/errores/bloqueo';

jest.mock('bcrypt');

interface LlamadaCreateSesion {
  data: { session_id: string; refresh_token_hash: string };
}

interface LlamadaUpdateManySesion {
  where: Record<string, unknown>;
  data?: Record<string, unknown>;
}

function ultimaLlamadaCreateSesion(mockFn: jest.Mock): LlamadaCreateSesion {
  const llamadas = mockFn.mock.calls as unknown as [LlamadaCreateSesion][];
  return llamadas[llamadas.length - 1][0];
}

function ultimaLlamadaUpdateMany(mockFn: jest.Mock): LlamadaUpdateManySesion {
  const llamadas = mockFn.mock.calls as unknown as [LlamadaUpdateManySesion][];
  return llamadas[llamadas.length - 1][0];
}

function usuarioFalso(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    email: 'test@avisens.com',
    nombre_completo: 'Test',
    password_hash: 'hash-guardado',
    activo: true,
    organizacion_id: 10,
    rol: { nombre: 'Operario' },
    seguridad_cuenta: null,
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    usuario: { findUnique: jest.fn(), findMany: jest.fn() },
    sesion: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    seguridadCuenta: { upsert: jest.fn(), update: jest.fn() },
    notificacion: { createMany: jest.fn() },
    $transaction: jest.fn(),
    $configurar: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };
  const jwt = { signAsync: jest.fn() };
  const config = { getOrThrow: jest.fn(), get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jwt.signAsync.mockResolvedValue('un-token');
    config.getOrThrow.mockReturnValue('secreto');
    config.get.mockReturnValue('15m');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hash-refresh');
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    const dto = { email: 'test@avisens.com', password: 'buena' };

    const errorDriver = (codigo: string, mensaje = '') => {
      const e = new Error('error del driver');
      e.name = 'DriverAdapterError';
      (e as Error & { cause: unknown }).cause = {
        originalCode: codigo,
        originalMessage: mensaje,
      };
      return e;
    };

    const filaActual = (cambios: Record<string, unknown> = {}) => ({
      nombre_completo: 'Test',
      email: 'test@avisens.com',
      activo: true,
      password_hash: 'hash-guardado',
      organizacion_id: 10,
      rol: 'Operario',
      organizacion_activa: true,
      ...cambios,
    });

    const seguridadNormal = (cambios: Record<string, unknown> = {}) => ({
      bloqueado_hasta: null,
      debe_cambiar_password: false,
      password_temporal_expira_en: null,
      ...cambios,
    });

    const prepararFaseB = (
      opciones: {
        bloqueo?: unknown[];
        actual?: unknown[];
        seguridad?: unknown[];
        candidatas?: unknown[];
      } = {},
    ) => {
      prisma.$queryRaw
        .mockResolvedValueOnce(opciones.bloqueo ?? [{ id: 1 }])
        .mockResolvedValueOnce(opciones.actual ?? [filaActual()])
        .mockResolvedValueOnce(opciones.seguridad ?? [seguridadNormal()])
        .mockResolvedValueOnce(opciones.candidatas ?? []);
    };

    const etiquetaDeSql = (llamada: number) => {
      const sql = (
        prisma.$queryRaw.mock.calls[llamada] as [TemplateStringsArray]
      )[0].join('?');
      if (sql.includes('FOR SHARE')) return 'usuario';
      if (sql.includes('JOIN "roles"')) return 'revalidar';
      if (sql.includes('"seguridad_cuenta"')) return 'seguridad';
      return 'candidatas';
    };

    const orden = () => {
      const eventos: Array<[number, string]> = [];
      prisma.$queryRaw.mock.invocationCallOrder.forEach((o, i) =>
        eventos.push([o, etiquetaDeSql(i)]),
      );
      const otros: Array<[string, jest.Mock]> = [
        ['configurar', prisma.$configurar],
        ['asegurar', prisma.$executeRaw],
        ['eliminar', prisma.sesion.deleteMany],
        ['crear', prisma.sesion.create],
        ['reiniciar', prisma.seguridadCuenta.update],
      ];
      for (const [nombre, mock] of otros) {
        for (const o of mock.mock.invocationCallOrder) {
          eventos.push([o, nombre]);
        }
      }
      return eventos.sort((x, y) => x[0] - y[0]).map(([, nombre]) => nombre);
    };

    beforeEach(() => {
      prisma.$queryRaw.mockReset();
      prisma.$transaction.mockReset();
      prisma.$transaction.mockImplementation((operacion: unknown) =>
        (operacion as (tx: typeof prisma) => unknown)(clienteDePrueba(prisma)),
      );
      prisma.$configurar.mockResolvedValue([{}]);
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.seguridadCuenta.update.mockResolvedValue({ id: 1 });
      prisma.sesion.create.mockResolvedValue({ id: 99 });
      prisma.sesion.deleteMany.mockResolvedValue({ count: 0 });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    describe('fase A: rechazos y bcrypt fuera de la transacción', () => {
      it('rechaza (401) si el usuario no existe', async () => {
        prisma.usuario.findUnique.mockResolvedValue(null);

        await expect(
          service.login({ email: 'x@x.com', password: '123456' }),
        ).rejects.toThrow(UnauthorizedException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('rechaza (401) si el usuario está inactivo', async () => {
        prisma.usuario.findUnique.mockResolvedValue(
          usuarioFalso({ activo: false }),
        );

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('rechaza (401) si la organización está inactiva', async () => {
        prisma.usuario.findUnique.mockResolvedValue(
          usuarioFalso({ organizacion: { activa: false } }),
        );

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('rechaza (403) una cuenta bloqueada antes de ejecutar bcrypt', async () => {
        prisma.usuario.findUnique.mockResolvedValue(
          usuarioFalso({
            seguridad_cuenta: {
              id: 1,
              intentos_fallidos: 5,
              bloqueado_hasta: new Date(Date.now() + 60 * 60 * 1000),
            },
          }),
        );

        await expect(service.login(dto)).rejects.toThrow(ForbiddenException);
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('rechaza (401) y registra el intento si la contraseña es incorrecta, sin abrir la transacción', async () => {
        prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
          service.login({ email: 'test@avisens.com', password: 'mala' }),
        ).rejects.toThrow(UnauthorizedException);

        expect(prisma.seguridadCuenta.upsert).toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
      });

      it('avisa a administración al tercer intento fallido', async () => {
        prisma.usuario.findUnique.mockResolvedValue(
          usuarioFalso({
            seguridad_cuenta: { id: 1, intentos_fallidos: 2 },
          }),
        );
        prisma.usuario.findMany.mockResolvedValue([{ id: 9 }]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
          service.login({ email: 'test@avisens.com', password: 'mala' }),
        ).rejects.toThrow(UnauthorizedException);

        expect(prisma.notificacion.createMany).toHaveBeenCalledWith({
          data: [
            expect.objectContaining({
              usuario_id: 9,
              tipo: 'seguridad_cuenta',
              titulo: 'Intentos de acceso por revisar',
              referencia_tipo: 'seguridad_cuenta',
              referencia_id: 1,
            }),
          ],
        });
      });

      it('avisa a administración cuando bloquea una cuenta', async () => {
        prisma.usuario.findUnique.mockResolvedValue(
          usuarioFalso({
            seguridad_cuenta: { id: 1, intentos_fallidos: 4 },
          }),
        );
        prisma.usuario.findMany.mockResolvedValue([{ id: 9 }]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
          service.login({ email: 'test@avisens.com', password: 'mala' }),
        ).rejects.toThrow(UnauthorizedException);

        expect(prisma.notificacion.createMany).toHaveBeenCalledWith({
          data: [
            expect.objectContaining({
              usuario_id: 9,
              tipo: 'seguridad_cuenta',
              titulo: 'Cuenta bloqueada temporalmente',
              referencia_tipo: 'seguridad_cuenta',
              referencia_id: 1,
            }),
          ],
        });
      });

      it('bcrypt se ejecuta antes de abrir la transacción', async () => {
        prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
        prepararFaseB();

        await service.login(dto);

        expect(
          secuenciaDeLlamadas(
            ['bcrypt', bcrypt.compare as jest.Mock],
            ['transaccion', prisma.$transaction],
          ),
        ).toEqual(['bcrypt', 'transaccion']);
      });
    });

    describe('fase B: rama normal', () => {
      beforeEach(() => {
        prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
      });

      it('sigue el orden usuario → revalidar → seguridad → sesiones, con una configuración de presupuesto antes de cada paso', async () => {
        prepararFaseB({ candidatas: [{ id: 3 }, { id: 5 }] });

        await service.login(dto);

        expect(orden()).toEqual([
          'configurar',
          'usuario',
          'configurar',
          'revalidar',
          'configurar',
          'asegurar',
          'configurar',
          'seguridad',
          'configurar',
          'candidatas',
          'configurar',
          'eliminar',
          'configurar',
          'crear',
          'configurar',
          'reiniciar',
        ]);
      });

      it('bloquea al usuario con FOR SHARE y la fila de seguridad con FOR UPDATE', async () => {
        prepararFaseB();

        await service.login(dto);

        const sql = (llamada: number) =>
          (
            prisma.$queryRaw.mock.calls[llamada] as [TemplateStringsArray]
          )[0].join('?');
        expect(sql(0)).toContain('FOR SHARE');
        expect(sql(2)).toContain('FOR UPDATE');
        expect(sql(3)).toMatch(/ORDER BY "id" FOR UPDATE/);
      });

      it('elimina únicamente los ids de las sesiones seleccionadas', async () => {
        prepararFaseB({ candidatas: [{ id: 3 }, { id: 5 }] });

        await service.login(dto);

        expect(prisma.sesion.deleteMany).toHaveBeenCalledTimes(1);
        expect(prisma.sesion.deleteMany).toHaveBeenCalledWith({
          where: { id: { in: [3, 5] } },
        });
      });

      it('sin sesiones candidatas no ejecuta ningún DELETE', async () => {
        prepararFaseB({ candidatas: [] });

        await service.login(dto);

        expect(prisma.sesion.deleteMany).not.toHaveBeenCalled();
      });

      it('crea la sesión con un session_id nuevo y el hash SHA-256 del refresh token', async () => {
        prepararFaseB();

        const resultado = await service.login(dto);

        expect(resultado).toMatchObject({
          requiere_cambio_password: false,
          access_token: 'un-token',
          refresh_token: 'un-token',
        });
        const llamada = ultimaLlamadaCreateSesion(prisma.sesion.create);
        expect(llamada.data.session_id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
        expect(llamada.data.refresh_token_hash).toMatch(/^[0-9a-f]{64}$/);
      });

      it('cada login genera un session_id y un jti distintos', async () => {
        prepararFaseB();
        await service.login(dto);
        prepararFaseB();
        await service.login(dto);

        const sesiones = (
          prisma.sesion.create.mock.calls as unknown as [LlamadaCreateSesion][]
        ).map(([llamada]) => llamada.data.session_id);
        expect(new Set(sesiones).size).toBe(2);
        const jtis = (
          jwt.signAsync.mock.calls as unknown as [{ jti?: string }][]
        )
          .map(([payload]) => payload.jti)
          .filter(Boolean);
        expect(new Set(jtis).size).toBe(2);
      });

      it('firma y responde con los datos revalidados, no con los de la fase A', async () => {
        prepararFaseB({
          actual: [
            filaActual({
              nombre_completo: 'Nombre nuevo',
              email: 'nuevo@avisens.com',
              rol: 'Propietario',
              organizacion_id: 22,
            }),
          ],
        });

        const resultado = await service.login(dto);

        expect(resultado).toMatchObject({
          usuario: {
            id: 1,
            nombre: 'Nombre nuevo',
            email: 'nuevo@avisens.com',
            rol: 'Propietario',
            organizacion_id: 22,
          },
        });
        expect(jwt.signAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'nuevo@avisens.com',
            rol: 'Propietario',
            organizacion_id: 22,
          }),
          expect.any(Object),
        );
      });

      it('conserva a un usuario sin organización y sin seguridad_cuenta previa', async () => {
        prisma.usuario.findUnique.mockResolvedValue(
          usuarioFalso({ organizacion_id: null, organizacion: null }),
        );
        prepararFaseB({
          actual: [
            filaActual({ organizacion_id: null, organizacion_activa: null }),
          ],
        });

        const resultado = await service.login(dto);

        expect(resultado).toMatchObject({
          requiere_cambio_password: false,
          usuario: { organizacion_id: null },
        });
        expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      });

      it('reinicia los intentos y registra el último login al final', async () => {
        prepararFaseB();

        await service.login(dto);

        expect(prisma.seguridadCuenta.update).toHaveBeenCalledWith({
          where: { usuario_id: 1 },
          data: {
            intentos_fallidos: 0,
            bloqueado_hasta: null,
            fecha_ultimo_login: expect.any(Date) as Date,
          },
          select: { id: true },
        });
      });
    });

    describe('fase B: revalidación bajo bloqueo', () => {
      beforeEach(() => {
        prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
      });

      const sinEscrituras = () => {
        expect(prisma.$executeRaw).not.toHaveBeenCalled();
        expect(prisma.seguridadCuenta.update).not.toHaveBeenCalled();
        expect(prisma.sesion.deleteMany).not.toHaveBeenCalled();
        expect(prisma.sesion.create).not.toHaveBeenCalled();
      };

      it('rechaza (401) si el usuario ya no existe', async () => {
        prepararFaseB({ bloqueo: [] });

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        sinEscrituras();
      });

      it('rechaza (401) si se desactivó entre la fase A y la B', async () => {
        prepararFaseB({ actual: [filaActual({ activo: false })] });

        await expect(service.login(dto)).rejects.toThrow(
          new UnauthorizedException('Credenciales inválidas'),
        );
        sinEscrituras();
      });

      it('rechaza (401) si su organización se desactivó', async () => {
        prepararFaseB({
          actual: [filaActual({ organizacion_activa: false })],
        });

        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
        sinEscrituras();
      });

      it('rechaza (401) si el hash de contraseña cambió, sin tocar seguridad_cuenta ni contar un intento', async () => {
        prepararFaseB({
          actual: [filaActual({ password_hash: 'hash-distinto' })],
        });

        await expect(service.login(dto)).rejects.toThrow(
          new UnauthorizedException('Credenciales inválidas'),
        );
        sinEscrituras();
        expect(prisma.seguridadCuenta.upsert).not.toHaveBeenCalled();
      });

      it('rechaza (403) si la cuenta quedó bloqueada y conserva el bloqueo', async () => {
        prepararFaseB({
          seguridad: [
            seguridadNormal({
              bloqueado_hasta: new Date(Date.now() + 60_000),
            }),
          ],
        });

        await expect(service.login(dto)).rejects.toThrow(
          new ForbiddenException('Cuenta bloqueada temporalmente'),
        );
        expect(prisma.seguridadCuenta.update).not.toHaveBeenCalled();
        expect(prisma.sesion.create).not.toHaveBeenCalled();
      });
    });

    describe('fase B: contraseña temporal', () => {
      beforeEach(() => {
        prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
      });

      it('entrega solo el token de cambio, reinicia intentos y no toca sesiones', async () => {
        prepararFaseB({
          seguridad: [
            seguridadNormal({
              debe_cambiar_password: true,
              password_temporal_expira_en: new Date(Date.now() + 60_000),
            }),
          ],
        });

        const resultado = await service.login(dto);

        expect(resultado).toEqual({
          requiere_cambio_password: true,
          cambio_password_token: 'un-token',
        });
        expect(prisma.sesion.create).not.toHaveBeenCalled();
        expect(prisma.sesion.deleteMany).not.toHaveBeenCalled();
        expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
        expect(prisma.seguridadCuenta.update).toHaveBeenCalledTimes(1);
        expect(jwt.signAsync).toHaveBeenCalledWith(
          { sub: 1, tipo: 'cambio_password' },
          expect.objectContaining({ expiresIn: '15m' }),
        );
      });

      it.each([
        ['vencida', new Date(Date.now() - 60_000)],
        ['sin fecha de vencimiento', null],
      ])(
        'rechaza (403) una contraseña temporal %s sin tocar intentos ni sesiones',
        async (_nombre, expira) => {
          prepararFaseB({
            seguridad: [
              seguridadNormal({
                debe_cambiar_password: true,
                password_temporal_expira_en: expira,
              }),
            ],
          });

          await expect(service.login(dto)).rejects.toThrow(
            new ForbiddenException(
              'La contraseña temporal venció. Solicita una nueva recuperación.',
            ),
          );
          expect(prisma.seguridadCuenta.update).not.toHaveBeenCalled();
          expect(prisma.sesion.create).not.toHaveBeenCalled();
        },
      );
    });

    describe('fase B: presupuesto y 409', () => {
      beforeEach(() => {
        prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
      });

      it('traduce a 409 un lock_timeout (55P03) y no deja sesión ni cambios', async () => {
        prisma.$queryRaw.mockRejectedValueOnce(errorDriver('55P03'));

        await expect(service.login(dto)).rejects.toThrow(
          new ConflictException(MENSAJE_CUENTA_OCUPADA),
        );
        expect(prisma.sesion.create).not.toHaveBeenCalled();
        expect(prisma.seguridadCuenta.update).not.toHaveBeenCalled();
      });

      it.each([
        ['presupuesto agotado', new PresupuestoAgotado('antes de «x»')],
        ['sentencia vencida', new SentenciaVencida('x', null)],
      ])('traduce a 409: %s', async (_nombre, error) => {
        prisma.$transaction.mockRejectedValue(error);

        await expect(service.login(dto)).rejects.toThrow(
          new ConflictException(MENSAJE_CUENTA_OCUPADA),
        );
      });

      it.each([
        [
          'cancelación manual',
          errorDriver('57014', 'canceling statement due to user request'),
        ],
        ['deadlock (40P01)', errorDriver('40P01', 'deadlock detected')],
        ['P2028', Object.assign(new Error('expirada'), { code: 'P2028' })],
        ['error corriente', new Error('otro')],
      ])('no traduce a 409: %s', async (_nombre, error) => {
        prisma.$queryRaw.mockRejectedValueOnce(error);

        await expect(service.login(dto)).rejects.toBe(error);
      });
    });
  });

  describe('refresh', () => {
    const SESSION_ID = '11111111-1111-4111-8111-111111111111';

    it('con un refresh token válido rota por session_id (compare-and-swap) y devuelve tokens nuevos', async () => {
      prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
      prisma.sesion.updateMany.mockResolvedValue({ count: 1 });

      const tokens = await service.refresh(1, SESSION_ID, 'token-valido');

      expect(tokens.access_token).toBe('un-token');
      expect(tokens.refresh_token).toBe('un-token');
      const llamada = ultimaLlamadaUpdateMany(prisma.sesion.updateMany);
      expect(llamada.where.session_id).toBe(SESSION_ID);
      expect(llamada.where.usuario_id).toBe(1);
      expect(llamada.where.revocada).toBe(false);
      expect(typeof llamada.data?.refresh_token_hash).toBe('string');
    });

    it('rechaza (401) si el compare-and-swap no afectó ninguna fila (token ya rotado, sesión revocada o expirada)', async () => {
      prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
      prisma.sesion.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.refresh(1, SESSION_ID, 'token-ya-rotado'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza (401) si el usuario quedó inactivo, sin llegar a tocar la sesión', async () => {
      prisma.usuario.findUnique.mockResolvedValue(
        usuarioFalso({ activo: false }),
      );

      await expect(
        service.refresh(1, SESSION_ID, 'token-valido'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.sesion.updateMany).not.toHaveBeenCalled();
    });

    it('no revoca ni toca otras sesiones del usuario: el UPDATE va acotado por session_id, no solo usuario_id', async () => {
      prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
      prisma.sesion.updateMany.mockResolvedValue({ count: 1 });

      await service.refresh(1, SESSION_ID, 'token-valido');

      const llamada = ultimaLlamadaUpdateMany(prisma.sesion.updateMany);
      expect(llamada.where.session_id).toBe(SESSION_ID);
    });
  });

  describe('logout', () => {
    const SESSION_ID = '22222222-2222-4222-8222-222222222222';

    it('revoca por session_id, sin exigir el hash del token (funciona aunque ya haya rotado)', async () => {
      prisma.sesion.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(1, SESSION_ID);

      expect(prisma.sesion.updateMany).toHaveBeenCalledWith({
        where: { session_id: SESSION_ID, usuario_id: 1 },
        data: { revocada: true },
      });
    });

    it('el filtro incluye usuario_id: no puede revocar la sesión de otro usuario aunque el session_id coincidiera', async () => {
      prisma.sesion.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(42, SESSION_ID);

      const llamada = ultimaLlamadaUpdateMany(prisma.sesion.updateMany);
      expect(llamada.where).toEqual({ session_id: SESSION_ID, usuario_id: 42 });
    });

    it('preserva las demás sesiones del usuario: el WHERE nunca es solo usuario_id', async () => {
      prisma.sesion.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(1, SESSION_ID);

      const llamada = ultimaLlamadaUpdateMany(prisma.sesion.updateMany);
      expect(llamada.where).not.toEqual({ usuario_id: 1 });
      expect(llamada.where.session_id).toBeDefined();
    });
  });
});
