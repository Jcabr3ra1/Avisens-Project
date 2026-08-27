import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoRecuperacionPassword } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RecuperacionesPasswordService } from './recuperaciones-password.service';

jest.mock('bcrypt');

describe('RecuperacionesPasswordService', () => {
  let service: RecuperacionesPasswordService;

  const prisma = {
    usuario: { findUnique: jest.fn(), update: jest.fn() },
    seguridadCuenta: { upsert: jest.fn(), update: jest.fn() },
    sesion: { updateMany: jest.fn() },
    recuperacionPassword: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const argumentosDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[Record<string, unknown>]>;
    return calls[0][0];
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecuperacionesPasswordService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(RecuperacionesPasswordService);
    prisma.$transaction.mockImplementation((operacion: unknown) =>
      typeof operacion === 'function'
        ? (operacion as (tx: typeof prisma) => unknown)(prisma)
        : Promise.resolve([[], 0]),
    );
    (bcrypt.hash as jest.Mock).mockResolvedValue('hash-temporal');
  });

  afterEach(() => jest.clearAllMocks());

  it('responde igual si el correo no existe para no revelar cuentas', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    const respuesta = await service.solicitar('nadie@avisens.com');

    expect(respuesta.mensaje).toContain('Si la cuenta existe');
    expect(prisma.recuperacionPassword.create).not.toHaveBeenCalled();
  });

  it('crea una sola solicitud pendiente para un usuario activo', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 5, activo: true });
    prisma.recuperacionPassword.findFirst.mockResolvedValue(null);

    await service.solicitar('OP@AVISENS.COM', '  Olvido  ', '127.0.0.1');

    expect(prisma.usuario.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'op@avisens.com' } }),
    );
    expect(prisma.recuperacionPassword.create).toHaveBeenCalledWith({
      data: {
        usuario_id: 5,
        motivo: 'Olvido',
        ip_solicitud: '127.0.0.1',
      },
    });
  });

  it('no duplica una solicitud que ya está pendiente', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 5, activo: true });
    prisma.recuperacionPassword.findFirst.mockResolvedValue({ id: 8 });

    await service.solicitar('op@avisens.com');

    expect(prisma.recuperacionPassword.create).not.toHaveBeenCalled();
  });

  it('al aprobar cambia el hash, revoca sesiones y exige cambio', async () => {
    prisma.recuperacionPassword.findUnique.mockResolvedValue({
      id: 8,
      usuario_id: 5,
      estado: EstadoRecuperacionPassword.pendiente,
      usuario: { id: 5, activo: true },
    });

    const respuesta = await service.aprobar(8, 1, 'Verificado');

    expect(respuesta.password_temporal).toBeDefined();
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { password_hash: 'hash-temporal' },
    });
    const seguridad = argumentosDe(prisma.seguridadCuenta.upsert);
    expect(
      (seguridad.update as Record<string, unknown>).debe_cambiar_password,
    ).toBe(true);
    expect(prisma.sesion.updateMany).toHaveBeenCalledWith({
      where: { usuario_id: 5, revocada: false },
      data: { revocada: true },
    });
  });

  it('no permite atender dos veces una solicitud', async () => {
    prisma.recuperacionPassword.findUnique.mockResolvedValue({
      id: 8,
      estado: EstadoRecuperacionPassword.aprobada,
      usuario: { id: 5, activo: true },
    });

    await expect(service.aprobar(8, 1)).rejects.toThrow(BadRequestException);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('rechaza con 404 una solicitud inexistente', async () => {
    prisma.recuperacionPassword.findUnique.mockResolvedValue(null);

    await expect(service.rechazar(99, 1)).rejects.toThrow(NotFoundException);
  });

  it('al definir la contraseña definitiva completa solicitudes y revoca sesiones', async () => {
    await service.cambiarPassword(5, 'NuevaSegura123!');

    const seguridad = argumentosDe(prisma.seguridadCuenta.update);
    expect(seguridad.data).toEqual(
      expect.objectContaining({
        debe_cambiar_password: false,
        password_temporal_expira_en: null,
      }),
    );
    const recuperacion = argumentosDe(prisma.recuperacionPassword.updateMany);
    expect(recuperacion.data).toEqual(
      expect.objectContaining({
        estado: EstadoRecuperacionPassword.completada,
        usado: true,
      }),
    );
  });
});
