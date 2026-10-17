import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

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
    seguridadCuenta: { upsert: jest.fn() },
    notificacion: { createMany: jest.fn() },
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
    it('rechaza (401) si el usuario no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza (401) si el usuario está inactivo', async () => {
      prisma.usuario.findUnique.mockResolvedValue(
        usuarioFalso({ activo: false }),
      );

      await expect(
        service.login({ email: 'test@avisens.com', password: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza (401) si la organización está inactiva', async () => {
      prisma.usuario.findUnique.mockResolvedValue(
        usuarioFalso({ organizacion: { activa: false } }),
      );

      await expect(
        service.login({ email: 'test@avisens.com', password: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza (403) si la cuenta está bloqueada', async () => {
      const enUnaHora = new Date(Date.now() + 60 * 60 * 1000);
      prisma.usuario.findUnique.mockResolvedValue(
        usuarioFalso({
          seguridad_cuenta: {
            id: 1,
            intentos_fallidos: 5,
            bloqueado_hasta: enUnaHora,
          },
        }),
      );

      await expect(
        service.login({ email: 'test@avisens.com', password: '123456' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza (401) y registra el intento si la contraseña es incorrecta', async () => {
      prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@avisens.com', password: 'mala' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.seguridadCuenta.upsert).toHaveBeenCalled();
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

    it('con credenciales correctas devuelve tokens, crea sesión y resetea intentos', async () => {
      prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const resultado = await service.login({
        email: 'test@avisens.com',
        password: 'buena',
      });

      expect(resultado.access_token).toBe('un-token');
      expect(resultado.refresh_token).toBe('un-token');
      expect(resultado.requiere_cambio_password).toBe(false);
      expect(resultado.usuario).toEqual({
        id: 1,
        nombre: 'Test',
        email: 'test@avisens.com',
        rol: 'Operario',
        organizacion_id: 10,
      });
      expect(prisma.sesion.create).toHaveBeenCalled();
      const llamadaCreate = ultimaLlamadaCreateSesion(prisma.sesion.create);
      expect(llamadaCreate.data.session_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      // SHA-256 hex (64 caracteres) de tokens.refresh_token -- no bcrypt
      // (que daría un string con prefijo "$2b$...").
      expect(llamadaCreate.data.refresh_token_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(prisma.sesion.deleteMany).toHaveBeenCalled();
      expect(prisma.seguridadCuenta.upsert).toHaveBeenCalled();
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ organizacion_id: 10 }),
        expect.any(Object),
      );
    });

    it('con contraseña temporal solo entrega un token limitado de cambio', async () => {
      prisma.usuario.findUnique.mockResolvedValue(
        usuarioFalso({
          seguridad_cuenta: {
            id: 1,
            intentos_fallidos: 0,
            bloqueado_hasta: null,
            debe_cambiar_password: true,
            password_temporal_expira_en: new Date(Date.now() + 60_000),
          },
        }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const resultado = await service.login({
        email: 'test@avisens.com',
        password: 'temporal',
      });

      expect(resultado).toEqual({
        requiere_cambio_password: true,
        cambio_password_token: 'un-token',
      });
      expect(prisma.sesion.create).not.toHaveBeenCalled();
      expect(jwt.signAsync).toHaveBeenCalledWith(
        { sub: 1, tipo: 'cambio_password' },
        expect.objectContaining({ expiresIn: '15m' }),
      );
    });

    it('rechaza una contraseña temporal vencida', async () => {
      prisma.usuario.findUnique.mockResolvedValue(
        usuarioFalso({
          seguridad_cuenta: {
            id: 1,
            intentos_fallidos: 0,
            bloqueado_hasta: null,
            debe_cambiar_password: true,
            password_temporal_expira_en: new Date(Date.now() - 60_000),
          },
        }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({
          email: 'test@avisens.com',
          password: 'temporal',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.sesion.create).not.toHaveBeenCalled();
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
