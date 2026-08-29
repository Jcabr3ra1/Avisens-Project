import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GranjasService } from './granjas.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('GranjasService', () => {
  let service: GranjasService;

  const prisma = {
    granja: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    usuario: { findUnique: jest.fn() },
    usuarioGalpon: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = {
    id: 5,
    rol: 'Propietario',
    organizacion_id: 10,
  };

  const dataDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;
    return calls[0][0].data;
  };
  const whereDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<
      [{ where: Record<string, unknown> }]
    >;
    return calls[0][0].where;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GranjasService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<GranjasService>(GranjasService);

    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('un Propietario no puede crear granjas', async () => {
      await expect(
        service.crear({ nombre: 'La Esperanza' }, propietario),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.granja.create).not.toHaveBeenCalled();
    });

    it('un Admin sin propietario_id recibe 400', async () => {
      await expect(service.crear({ nombre: 'X' }, admin)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.granja.create).not.toHaveBeenCalled();
    });

    it('un Admin con un propietario inexistente recibe 404', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.crear({ nombre: 'X', propietario_id: 99 }, admin),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.granja.create).not.toHaveBeenCalled();
    });

    it('un Admin crea la granja para el propietario indicado', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 7,
        organizacion_id: 20,
        rol: { nombre: 'Propietario' },
      });
      prisma.granja.create.mockResolvedValue({ id: 1 });

      await service.crear({ nombre: 'X', propietario_id: 7 }, admin);

      expect(dataDe(prisma.granja.create).propietario_id).toBe(7);
      expect(dataDe(prisma.granja.create).organizacion_id).toBe(20);
    });

    it('un Admin no puede asignar una granja a un usuario que no sea Propietario', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 7,
        organizacion_id: 20,
        rol: { nombre: 'Operario' },
      });

      await expect(
        service.crear({ nombre: 'X', propietario_id: 7 }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.granja.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve sus granjas', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(whereDe(prisma.granja.findMany)).toEqual({ propietario_id: 5 });
    });

    it('un Admin ve todas las granjas', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.granja.findMany)).toBeUndefined();
    });
  });

  describe('obtener', () => {
    it('rechaza (404) si la granja no existe', async () => {
      prisma.granja.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('un Propietario no puede ver una granja ajena (403)', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario: { id: 999 },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('actualiza cuando la granja es del propietario', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario: { id: 5 },
      });
      prisma.granja.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { nombre: 'Nuevo' }, propietario);

      expect(prisma.granja.update).toHaveBeenCalled();
    });

    it('un Admin que reasigna a un propietario inexistente recibe 404', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario: { id: 5 },
      });
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.actualizar(1, { propietario_id: 99 }, admin),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.granja.update).not.toHaveBeenCalled();
    });

    it('desactiva asignaciones si la granja cambia de organización', async () => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        organizacion_id: 10,
        propietario: { id: 5 },
      });
      prisma.usuario.findUnique.mockResolvedValue({
        id: 7,
        organizacion_id: 20,
        rol: { nombre: 'Propietario' },
      });
      prisma.granja.update.mockResolvedValue({ id: 1, organizacion_id: 20 });
      prisma.$transaction.mockResolvedValue([
        { count: 2 },
        { id: 1, organizacion_id: 20 },
      ]);

      const resultado = await service.actualizar(
        1,
        { propietario_id: 7 },
        admin,
      );

      expect(prisma.usuarioGalpon.updateMany).toHaveBeenCalledWith({
        where: { activa: true, galpon: { granja_id: 1 } },
        data: { activa: false },
      });
      expect(resultado).toEqual({ id: 1, organizacion_id: 20 });
    });
  });

  describe('desactivar / eliminarPermanente', () => {
    beforeEach(() => {
      prisma.granja.findUnique.mockResolvedValue({
        id: 1,
        propietario: { id: 5 },
      });
    });

    it('desactiva (borrado suave) cuando es dueño', async () => {
      prisma.granja.update.mockResolvedValue({ id: 1 });

      const res = await service.desactivar(1, propietario);

      expect(res).toEqual({ id: 1, activa: false });
    });

    it('elimina permanentemente cuando es dueño', async () => {
      prisma.granja.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminarPermanente(1, propietario);

      expect(res).toEqual({ id: 1, eliminado: true });
    });
  });
});
