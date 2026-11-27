import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SolicitudesPqrsService } from './solicitudes-pqrs.service';

describe('SolicitudesPqrsService', () => {
  let service: SolicitudesPqrsService;

  const prisma = {
    solicitudPqrs: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitudesPqrsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<SolicitudesPqrsService>(SolicitudesPqrsService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  const HORA = 3_600_000;

  function plazoCreado(): number | null {
    const [[argumentos]] = prisma.solicitudPqrs.create.mock.calls as [
      [{ data: { fecha_limite: Date | null } }],
    ];
    const limite = argumentos.data.fecha_limite;
    return limite === null ? null : Math.round((limite.getTime() - Date.now()) / HORA);
  }

  describe('crear', () => {
    it('crea una solicitud abierta con su radicado', async () => {
      prisma.solicitudPqrs.create.mockResolvedValue({ id: 7, estado: 'abierta' });
      const r = await service.crear({ prospecto_id: 1, categoria: 'Queja' });
      expect(r).toEqual(expect.objectContaining({ id: 7, radicado: 'PQRS-000007' }));
    });

    it('un reclamo vence en 24 horas', async () => {
      prisma.solicitudPqrs.create.mockResolvedValue({ id: 1 });
      await service.crear({ prospecto_id: 1, categoria: 'Reclamo' });
      expect(plazoCreado()).toBe(24);
    });

    it('una petición vence en 48 horas', async () => {
      prisma.solicitudPqrs.create.mockResolvedValue({ id: 1 });
      await service.crear({ prospecto_id: 1, categoria: 'Petición' });
      expect(plazoCreado()).toBe(48);
    });

    it('una sugerencia no tiene plazo', async () => {
      prisma.solicitudPqrs.create.mockResolvedValue({ id: 1 });
      await service.crear({ prospecto_id: 1, categoria: 'Sugerencia' });
      expect(plazoCreado()).toBeNull();
    });
  });

  describe('listar', () => {
    it('ordena por fecha_creacion descendente', async () => {
      await service.listar({ page: 1, limit: 20 });
      expect(prisma.solicitudPqrs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { fecha_creacion: 'desc' } }),
      );
    });

    it('filtra por estado y categoria', async () => {
      await service.listar({ page: 1, limit: 20, estado: 'abierta', categoria: 'Reclamo' });
      expect(prisma.solicitudPqrs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: 'abierta', categoria: 'Reclamo' } }),
      );
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando no existe', async () => {
      prisma.solicitudPqrs.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('responder', () => {
    function existente(estado: string, respuesta: string | null = null) {
      prisma.solicitudPqrs.findUnique.mockResolvedValue({ id: 1, estado, respuesta });
      prisma.solicitudPqrs.update.mockImplementation(
        ({ data }: { data: { estado: string } }) => Promise.resolve({ id: 1, ...data }),
      );
    }

    function datosActualizados() {
      const [[argumentos]] = prisma.solicitudPqrs.update.mock.calls as [
        [{ data: Record<string, unknown> }],
      ];
      return argumentos.data;
    }

    it('resuelve con respuesta y fija la fecha de cierre', async () => {
      existente('en_proceso');
      await service.responder(1, { estado: 'resuelta', respuesta: ' Contactado ' });
      const data = datosActualizados();
      expect(data.estado).toBe('resuelta');
      expect(data.respuesta).toBe('Contactado');
      expect(data.fecha_cierre).toBeInstanceOf(Date);
    });

    it('no resuelve sin respuesta (400)', async () => {
      existente('en_proceso');
      await expect(service.responder(1, { estado: 'resuelta', respuesta: '   ' })).rejects.toThrow(BadRequestException);
      expect(prisma.solicitudPqrs.update).not.toHaveBeenCalled();
    });

    it('resuelve usando la respuesta ya guardada', async () => {
      existente('en_proceso', 'Se llamó al cliente');
      await service.responder(1, { estado: 'resuelta' });
      expect(datosActualizados().estado).toBe('resuelta');
    });

    it('una cerrada no admite cambios (409)', async () => {
      existente('cerrada', 'Listo');
      await expect(service.responder(1, { respuesta: 'Otra' })).rejects.toThrow(ConflictException);
    });

    it('no cierra una solicitud que no se ha resuelto (409)', async () => {
      existente('abierta');
      await expect(service.responder(1, { estado: 'cerrada' })).rejects.toThrow(ConflictException);
    });

    it('reabrir una resuelta borra la fecha de cierre', async () => {
      existente('resuelta', 'Listo');
      await service.responder(1, { estado: 'en_proceso' });
      expect(datosActualizados()).toEqual(expect.objectContaining({ estado: 'en_proceso', fecha_cierre: null }));
    });

    it('cerrar una resuelta conserva la fecha de cierre original', async () => {
      existente('resuelta', 'Listo');
      await service.responder(1, { estado: 'cerrada' });
      expect(datosActualizados()).not.toHaveProperty('fecha_cierre');
    });
  });

  describe('tomar', () => {
    it('asigna a quien la toma y la pasa a en proceso', async () => {
      prisma.solicitudPqrs.findUnique.mockResolvedValue({ id: 1, estado: 'abierta' });
      prisma.solicitudPqrs.update.mockResolvedValue({ id: 1, estado: 'en_proceso' });
      await service.tomar(1, 5);
      expect(prisma.solicitudPqrs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { estado: 'en_proceso', responsable: { connect: { id: 5 } } },
        }),
      );
    });

    it('no toma una solicitud resuelta (409)', async () => {
      prisma.solicitudPqrs.findUnique.mockResolvedValue({ id: 1, estado: 'resuelta' });
      await expect(service.tomar(1, 5)).rejects.toThrow(ConflictException);
    });
  });

  describe('eliminar', () => {
    it('elimina una solicitud existente', async () => {
      prisma.solicitudPqrs.findUnique.mockResolvedValue({ id: 1 });
      prisma.solicitudPqrs.delete.mockResolvedValue({ id: 1 });

      const r = await service.eliminar(1);
      expect(r).toEqual({ id: 1, eliminado: true });
    });
  });
});
