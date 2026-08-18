import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/roles';
import type { Solicitante } from '../../common/acceso';

describe('AlertasService', () => {
  let service: AlertasService;

  const prisma = {
    galpon: { findUnique: jest.fn() },
    lote: { findUnique: jest.fn() },
    sensor: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn() },
    alerta: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  const galponDeOtro = { id: 1, granja: { propietario_id: 999 } };
  const galponPropio = { id: 1, granja: { propietario_id: propietario.id } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertasService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<AlertasService>(AlertasService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('lanza Forbidden cuando el galpon no es del propietario', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponDeOtro);
      await expect(
        service.crear(
          { galpon_id: 1, tipo: 'temperatura_alta', criticidad: 'critica' },
          propietario,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    it('crea la alerta cuando el galpon es del propietario', async () => {
      prisma.galpon.findUnique.mockResolvedValue(galponPropio);
      prisma.alerta.create.mockResolvedValue({ id: 1 });
      await service.crear(
        { galpon_id: 1, tipo: 'temperatura_alta', criticidad: 'critica' },
        propietario,
      );
      expect(prisma.alerta.create).toHaveBeenCalled();
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando la alerta no existe', async () => {
      prisma.alerta.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza Forbidden cuando la alerta es de otra granja', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 999 } },
      });
      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('lanza NotFound cuando el responsable asignado no existe', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: propietario.id } },
      });
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(
        service.actualizar(1, { responsable_id: 777 }, propietario),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.alerta.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('borra fisicamente la alerta del propietario', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: propietario.id } },
      });
      prisma.alerta.delete.mockResolvedValue({ id: 1 });
      const r = await service.eliminar(1, propietario);
      expect(prisma.alerta.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(r).toEqual({ id: 1, eliminado: true });
    });
  });
});
