import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { DeviceTokenGuard } from './device-token.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('DeviceTokenGuard', () => {
  let guard: DeviceTokenGuard;

  const prisma = { dispositivo: { findUnique: jest.fn() } };

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
    prisma.dispositivo.findUnique.mockResolvedValue({
      id: 7,
      galpon_id: 3,
      codigo_topic: 'galpon1',
      activo: true,
    });
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
    expect(prisma.dispositivo.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza (401) si el token no existe', async () => {
    prisma.dispositivo.findUnique.mockResolvedValue(null);
    const { ctx } = contextoCon({ 'x-device-token': 'noexiste' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza (401) si el dispositivo está inactivo', async () => {
    prisma.dispositivo.findUnique.mockResolvedValue({
      id: 7,
      galpon_id: 3,
      codigo_topic: 'galpon1',
      activo: false,
    });
    const { ctx } = contextoCon({ 'x-device-token': 'abc123' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
