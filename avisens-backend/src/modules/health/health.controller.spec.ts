import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { COLA_WHATSAPP } from '../whatsapp/whatsapp.tipos';

describe('HealthController', () => {
  let controller: HealthController;

  const prisma = {
    $queryRaw: jest.fn(),
  };
  const queue = { waitUntilReady: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(COLA_WHATSAPP), useValue: queue },
      ],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('devuelve status ok cuando la DB responde', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      queue.waitUntilReady.mockResolvedValue(undefined);

      const r = await controller.check();

      expect(r.status).toBe('ok');
      expect(r.db).toBe('up');
      expect(r.redis).toBe('up');
      expect(r.timestamp).toBeDefined();
    });

    it('lanza 503 cuando la DB no responde', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
      queue.waitUntilReady.mockResolvedValue(undefined);

      await expect(controller.check()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('lanza 503 cuando Redis no responde', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      queue.waitUntilReady.mockRejectedValue(new Error('redis down'));

      await expect(controller.check()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
