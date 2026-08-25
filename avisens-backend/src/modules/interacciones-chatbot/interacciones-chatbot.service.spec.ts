import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { InteraccionesChatbotService } from './interacciones-chatbot.service';

describe('InteraccionesChatbotService', () => {
  let service: InteraccionesChatbotService;

  const prisma = {
    interaccionChatbot: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteraccionesChatbotService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<InteraccionesChatbotService>(InteraccionesChatbotService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  describe('crear', () => {
    it('registra una interacción', async () => {
      prisma.interaccionChatbot.create.mockResolvedValue({ id: 1 });
      const r = await service.crear({ prospecto_id: 1, tipo: 'mensaje_entrante', mensaje: 'hola' });
      expect(r.id).toBe(1);
    });
  });

  describe('listar', () => {
    it('ordena por fecha_hora descendente', async () => {
      await service.listar({ page: 1, limit: 20 });
      expect(prisma.interaccionChatbot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { fecha_hora: 'desc' } }),
      );
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando no existe', async () => {
      prisma.interaccionChatbot.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('estadisticas', () => {
    it('devuelve total, por_tipo y confianza_promedio', async () => {
      prisma.interaccionChatbot.count.mockResolvedValue(100);
      prisma.interaccionChatbot.groupBy.mockResolvedValue([
        { tipo: 'mensaje_entrante', _count: { id: 60 } },
        { tipo: 'respuesta_bot', _count: { id: 40 } },
      ]);
      prisma.interaccionChatbot.aggregate.mockResolvedValue({ _avg: { confianza_nlu: 0.87 } });

      const r = await service.estadisticas();
      expect(r.total).toBe(100);
      expect(r.confianza_promedio).toBe(0.87);
      expect(r.por_tipo).toHaveLength(2);
    });
  });
});
