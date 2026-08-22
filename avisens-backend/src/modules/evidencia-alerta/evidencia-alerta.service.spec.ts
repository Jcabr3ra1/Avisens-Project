import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EvidenciaAlertaService } from './evidencia-alerta.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/roles';
import type { Solicitante } from '../../common/acceso';

describe('EvidenciaAlertaService', () => {
  let service: EvidenciaAlertaService;

  const prisma = {
    alerta: {
      findUnique: jest.fn(),
    },
    evidenciaAlerta: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const administrador: Solicitante = {
    id: 1,
    rol: ROLES.ADMINISTRADOR,
  };

  const propietario: Solicitante = {
    id: 5,
    rol: ROLES.PROPIETARIO,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenciaAlertaService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EvidenciaAlertaService>(EvidenciaAlertaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('lanza NotFoundException si la alerta no existe', async () => {
      prisma.alerta.findUnique.mockResolvedValue(null);

      await expect(
        service.crear(
          {
            alerta_id: 99,
            tipo_evidencia: 'foto',
            archivo_url: 'https://ejemplo.com/evidencia.jpg',
          },
          propietario,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si la alerta pertenece a otra granja', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        id: 1,
        galpon: {
          granja: { propietario_id: 999 },
        },
      });

      await expect(
        service.crear(
          {
            alerta_id: 1,
            tipo_evidencia: 'foto',
            archivo_url: 'https://ejemplo.com/evidencia.jpg',
          },
          propietario,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('crea una evidencia cuando el propietario tiene acceso', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        id: 1,
        galpon: {
          granja: { propietario_id: propietario.id },
        },
      });

      prisma.evidenciaAlerta.create.mockResolvedValue({ id: 1 });

      await service.crear(
        {
          alerta_id: 1,
          tipo_evidencia: 'foto',
          archivo_url: 'https://ejemplo.com/evidencia.jpg',
          comentario: 'Se verificó la situación.',
        },
        propietario,
      );

      expect(prisma.evidenciaAlerta.create).toHaveBeenCalled();
    });
  });

  describe('obtener', () => {
    it('deja al administrador ver la evidencia de una granja ajena', async () => {
      prisma.evidenciaAlerta.findUnique.mockResolvedValue({
        id: 7,
        alerta: {
          galpon: {
            granja: { propietario_id: 999 },
          },
        },
      });

      const evidencia = await service.obtener(7, administrador);

      expect(evidencia).toEqual(expect.objectContaining({ id: 7 }));
    });

    it('le niega al propietario la evidencia de una granja ajena', async () => {
      prisma.evidenciaAlerta.findUnique.mockResolvedValue({
        id: 7,
        alerta: {
          galpon: {
            granja: { propietario_id: 999 },
          },
        },
      });

      await expect(service.obtener(7, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('listar', () => {
    it('acota el listado del propietario a sus propias granjas', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.listar(propietario, { page: 1, limit: 10 });

      expect(prisma.evidenciaAlerta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            alerta: {
              galpon: {
                granja: { propietario_id: propietario.id },
              },
            },
          },
        }),
      );
    });

    it('no le pone filtro de granja al administrador', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.listar(administrador, { page: 1, limit: 10 });

      expect(prisma.evidenciaAlerta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('eliminar', () => {
    it('elimina una evidencia existente', async () => {
      prisma.evidenciaAlerta.findUnique.mockResolvedValue({
        id: 1,
        alerta: {
          galpon: {
            granja: { propietario_id: propietario.id },
          },
        },
      });

      prisma.evidenciaAlerta.delete.mockResolvedValue({ id: 1 });

      const resultado = await service.eliminar(1, propietario);

      expect(prisma.evidenciaAlerta.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(resultado).toEqual({
        id: 1,
        eliminado: true,
      });
    });
  });
});