import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RecuperacionPasswordService } from './recuperacion-password.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt');

describe('RecuperacionPasswordService', () => {
  let service: RecuperacionPasswordService;
  let prisma: any;

  const mockPrisma = {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    recuperacionPassword: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    seguridadCuenta: {
      upsert: jest.fn(),
    },
    sesion: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecuperacionPasswordService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RecuperacionPasswordService>(
      RecuperacionPasswordService,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('solicitar', () => {
    it('debería devolver el mensaje genérico si el usuario no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      const resultado = await service.solicitar({
        email: 'noexiste@test.com',
      } as any);

      expect(resultado.mensaje).toContain('Si el correo está registrado');
      expect(prisma.recuperacionPassword.create).not.toHaveBeenCalled();
    });

    it('debería devolver el mensaje genérico si el usuario está inactivo', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 1,
        email: 'inactivo@test.com',
        activo: false,
      });

      const resultado = await service.solicitar({
        email: 'inactivo@test.com',
      } as any);

      expect(resultado.mensaje).toContain('Si el correo está registrado');
      expect(prisma.recuperacionPassword.create).not.toHaveBeenCalled();
    });

    it('debería invalidar tokens previos y crear uno nuevo para un usuario válido', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 1,
        email: 'valido@test.com',
        activo: true,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash-simulado');

      const resultado = await service.solicitar({
        email: 'valido@test.com',
      } as any);

      expect(prisma.recuperacionPassword.updateMany).toHaveBeenCalledWith({
        where: { usuario_id: 1, usado: false },
        data: { usado: true },
      });
      expect(prisma.recuperacionPassword.create).toHaveBeenCalled();
      expect(resultado.mensaje).toContain('Si el correo está registrado');
    });
  });

  describe('restablecer', () => {
    it('debería lanzar UnauthorizedException si el usuario no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.restablecer({
          email: 'noexiste@test.com',
          token: 'abc',
          password: 'nuevaPass123',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si el token es inválido o expiró', async () => {
      prisma.usuario.findUnique.mockResolvedValue({ id: 1 });
      prisma.recuperacionPassword.findMany.mockResolvedValue([]);

      await expect(
        service.restablecer({
          email: 'valido@test.com',
          token: 'token-invalido',
          password: 'nuevaPass123',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debería actualizar la contraseña y revocar sesiones con un token válido', async () => {
      prisma.usuario.findUnique.mockResolvedValue({ id: 1 });
      prisma.recuperacionPassword.findMany.mockResolvedValue([
        { id: 10, token_hash: 'hash-token', usuario_id: 1 },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('nuevo-hash');

      const resultado = await service.restablecer({
        email: 'valido@test.com',
        token: 'token-correcto',
        password: 'nuevaPass123',
      } as any);

      expect(prisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password_hash: 'nuevo-hash' },
      });
      expect(prisma.sesion.updateMany).toHaveBeenCalledWith({
        where: { usuario_id: 1, revocada: false },
        data: { revocada: true },
      });
      expect(resultado.mensaje).toBe('Contraseña actualizada correctamente');
    });
  });
});