import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { DeviceTokenGuard } from './device-token.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { hashDeviceToken } from '../security/device-token';

describe('DeviceTokenGuard', () => {
  let guard: DeviceTokenGuard;

  const prisma = {
    dispositivo: { findFirst: jest.fn(), update: jest.fn() },
  };

  const activo = {
    id: 7,
    galpon_id: 3,
    codigo_topic: 'galpon1',
    activo: true,
    token_ingesta: null,
    token_ingesta_hash: hashDeviceToken('abc123'),
    galpon: {
      activo: true,
      granja: { activa: true, organizacion: { activa: true } },
    },
  };

  const contextoCon = (headers: Record<string, unknown>) => {
    const req: Record<string, unknown> = { headers };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    return { ctx, req };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceTokenGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    guard = module.get<DeviceTokenGuard>(DeviceTokenGuard);
  });

  afterEach(() => jest.clearAllMocks());

  it('acepta un token válido y adjunta el dispositivo a la petición', async () => {
    prisma.dispositivo.findFirst.mockResolvedValue(activo);
    const { ctx, req } = contextoCon({ 'x-device-token': 'abc123' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.dispositivo).toEqual({
      id: 7,
      galpon_id: 3,
      codigo_topic: 'galpon1',
    });
  });

  it('rechaza (401) si falta el header X-Device-Token', async () => {
    const { ctx } = contextoCon({});

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(prisma.dispositivo.findFirst).not.toHaveBeenCalled();
  });

  it('rechaza (401) si el token no existe', async () => {
    prisma.dispositivo.findFirst.mockResolvedValue(null);
    const { ctx } = contextoCon({ 'x-device-token': 'noexiste' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza (401) si el dispositivo está inactivo', async () => {
    prisma.dispositivo.findFirst.mockResolvedValue({
      ...activo,
      activo: false,
    });
    const { ctx } = contextoCon({ 'x-device-token': 'abc123' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('migra un token legado en texto plano a su hash', async () => {
    prisma.dispositivo.findFirst.mockResolvedValue({
      ...activo,
      token_ingesta: 'abc123',
      token_ingesta_hash: null,
    });
    const { ctx } = contextoCon({ 'x-device-token': 'abc123' });

    await guard.canActivate(ctx);

    expect(prisma.dispositivo.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        token_ingesta: null,
        token_ingesta_hash: hashDeviceToken('abc123'),
      },
    });
  });

  it('rechaza un dispositivo si su organización está inactiva', async () => {
    prisma.dispositivo.findFirst.mockResolvedValue({
      ...activo,
      galpon: {
        activo: true,
        granja: { activa: true, organizacion: { activa: false } },
      },
    });
    const { ctx } = contextoCon({ 'x-device-token': 'abc123' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
