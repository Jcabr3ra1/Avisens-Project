import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PoliticasAlertaService } from './politicas-alerta.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';

describe('PoliticasAlertaService', () => {
  let service: PoliticasAlertaService;

  const prisma = {
    granja: {
      findUnique: jest.fn(),
    },
    politicaAlerta: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliticasAlertaService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<PoliticasAlertaService>(PoliticasAlertaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('rechaza un canal no valido', async () => {
      await expect(
        service.crear(
          { granja_id: 1, criticidad: 'Alta', canal: 'Telegram' },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.politicaAlerta.create).not.toHaveBeenCalled();
    });

    it('acepta el canal WhatsApp (con la mayuscula correcta)', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario_id: admin.id,
      });
      prisma.politicaAlerta.findFirst.mockResolvedValue(null);
      prisma.politicaAlerta.create.mockResolvedValue({ id: 1 });
      await service.crear(
        { granja_id: 1, criticidad: 'Alta', canal: 'WhatsApp' },
        admin,
      );
      expect(prisma.politicaAlerta.create).toHaveBeenCalled();
    });

    it('lanza Conflict cuando ya existe una politica activa con esa criticidad', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario_id: admin.id,
      });
      prisma.politicaAlerta.findFirst.mockResolvedValue({ id: 9 });
      await expect(
        service.crear({ granja_id: 1, criticidad: 'Alta' }, admin),
      ).rejects.toThrow(ConflictException);
      expect(prisma.politicaAlerta.create).not.toHaveBeenCalled();
    });

    it('lanza Forbidden cuando el propietario no es dueno de la granja', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario_id: 999,
      });
      await expect(
        service.crear({ granja_id: 1, criticidad: 'Alta' }, propietario),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando la politica no existe', async () => {
      prisma.politicaAlerta.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99, admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
