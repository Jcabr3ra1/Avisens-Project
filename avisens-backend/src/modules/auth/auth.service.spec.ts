import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt');

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
    usuario: { findUnique: jest.fn() },
    sesion: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    seguridadCuenta: { upsert: jest.fn() },
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
    it('con un refresh token válido renueva tokens y actualiza la sesión', async () => {
      prisma.sesion.findMany.mockResolvedValue([
        { id: 10, refresh_token_hash: 'hash-de-la-sesion' },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.usuario.findUnique.mockResolvedValue(usuarioFalso());

      const tokens = await service.refresh(
        1,
        'test@avisens.com',
        'token-valido',
      );

      expect(tokens.access_token).toBe('un-token');
      expect(tokens.refresh_token).toBe('un-token');

      expect(prisma.sesion.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 10 } }),
      );
    });

    it('rechaza (401) si ninguna sesión coincide con el token', async () => {
      prisma.sesion.findMany.mockResolvedValue([
        { id: 10, refresh_token_hash: 'hash-de-la-sesion' },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refresh(1, 'test@avisens.com', 'token-malo'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.sesion.update).not.toHaveBeenCalled();
    });

    it('rechaza (401) si no hay sesiones activas', async () => {
      prisma.sesion.findMany.mockResolvedValue([]);

      await expect(
        service.refresh(1, 'test@avisens.com', 'cualquier-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza (401) si el usuario quedó inactivo', async () => {
      prisma.sesion.findMany.mockResolvedValue([
        { id: 10, refresh_token_hash: 'hash-de-la-sesion' },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.usuario.findUnique.mockResolvedValue(
        usuarioFalso({ activo: false }),
      );

      await expect(
        service.refresh(1, 'test@avisens.com', 'token-valido'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revoca la sesión cuyo token coincide', async () => {
      prisma.sesion.findMany.mockResolvedValue([
        { id: 1, refresh_token_hash: 'hash-a' },
        { id: 2, refresh_token_hash: 'hash-b' },
      ]);

      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      await service.logout(1, 'token-de-la-sesion-2');

      expect(prisma.sesion.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { revocada: true },
      });
    });

    it('no revoca nada si ninguna sesión coincide', async () => {
      prisma.sesion.findMany.mockResolvedValue([
        { id: 1, refresh_token_hash: 'hash-a' },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.logout(1, 'token-que-no-existe');

      expect(prisma.sesion.update).not.toHaveBeenCalled();
    });
  });
});
