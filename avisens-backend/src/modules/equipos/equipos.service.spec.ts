import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';
import { EquiposService } from './equipos.service';

const ADMIN = { id: 1, rol: ROLES.ADMINISTRADOR };
const DUENO = { id: 7, rol: ROLES.PROPIETARIO };
const OTRO_DUENO = { id: 8, rol: ROLES.PROPIETARIO };

const equipoDe = (propietarioId: number) => ({
  id: 1,
  galpon: { id: 3, granja: { id: 2, propietario_id: propietarioId } },
});

describe('EquiposService', () => {
  let service: EquiposService;

  const prisma = {
    equipo: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    galpon: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [EquiposService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<EquiposService>(EquiposService);
    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.galpon.findUnique.mockResolvedValue({
      id: 3,
      granja: { propietario_id: DUENO.id },
    });
  });

  describe('crear', () => {
    it('crea un equipo con es_actuador por defecto false', async () => {
      prisma.equipo.create.mockResolvedValue({ id: 1, es_actuador: false });
      const r = await service.crear(
        { galpon_id: 3, codigo: 'EQ-01', nombre: 'Ventilador' },
        ADMIN,
      );
      expect(r.id).toBe(1);
    });

    it('lanza ConflictException si el codigo ya existe', async () => {
      const err = Object.assign(new Error('dup'), { code: 'P2002' });
      prisma.equipo.create.mockRejectedValue(err);
      await expect(
        service.crear(
          { galpon_id: 3, codigo: 'EQ-01', nombre: 'Ventilador' },
          ADMIN,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza NotFound si el galpon no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(null);
      await expect(
        service.crear(
          { galpon_id: 99, codigo: 'EQ-01', nombre: 'Ventilador' },
          ADMIN,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.equipo.create).not.toHaveBeenCalled();
    });

    it('impide al propietario crear equipos en galpones ajenos', async () => {
      await expect(
        service.crear(
          { galpon_id: 3, codigo: 'EQ-01', nombre: 'Ventilador' },
          OTRO_DUENO,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.equipo.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('el administrador ve todos los equipos', async () => {
      await service.listar(ADMIN, { page: 1, limit: 10 });
      expect(prisma.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });

    it('el propietario solo ve los equipos de sus granjas', async () => {
      await service.listar(DUENO, { page: 1, limit: 10 });
      expect(prisma.equipo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { galpon: { granja: { propietario_id: DUENO.id } } },
        }),
      );
      expect(prisma.equipo.count).toHaveBeenCalledWith({
        where: { galpon: { granja: { propietario_id: DUENO.id } } },
      });
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando no existe', async () => {
      prisma.equipo.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99, ADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('le devuelve al propietario un equipo suyo', async () => {
      prisma.equipo.findUnique.mockResolvedValue(equipoDe(DUENO.id));
      const r = await service.obtener(1, DUENO);
      expect(r.id).toBe(1);
    });

    it('impide al propietario ver un equipo ajeno', async () => {
      prisma.equipo.findUnique.mockResolvedValue(equipoDe(DUENO.id));
      await expect(service.obtener(1, OTRO_DUENO)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('impide al propietario mover un equipo suyo a un galpon ajeno', async () => {
      prisma.equipo.findUnique.mockResolvedValue(equipoDe(DUENO.id));
      prisma.galpon.findUnique.mockResolvedValue({
        id: 9,
        granja: { propietario_id: OTRO_DUENO.id },
      });
      await expect(
        service.actualizar(1, { galpon_id: 9 }, DUENO),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.equipo.update).not.toHaveBeenCalled();
    });

    it('no valida el galpon cuando el dto no lo trae', async () => {
      prisma.equipo.findUnique.mockResolvedValue(equipoDe(DUENO.id));
      prisma.equipo.update.mockResolvedValue({ id: 1, nombre: 'Nuevo' });
      await service.actualizar(1, { nombre: 'Nuevo' }, DUENO);
      expect(prisma.galpon.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('elimina un equipo existente', async () => {
      prisma.equipo.findUnique.mockResolvedValue(equipoDe(DUENO.id));
      prisma.equipo.delete.mockResolvedValue({ id: 1 });
      const r = await service.eliminar(1, ADMIN);
      expect(r).toEqual({ id: 1, eliminado: true });
    });

    it('impide al propietario eliminar un equipo ajeno', async () => {
      prisma.equipo.findUnique.mockResolvedValue(equipoDe(DUENO.id));
      await expect(service.eliminar(1, OTRO_DUENO)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.equipo.delete).not.toHaveBeenCalled();
    });
  });
});
