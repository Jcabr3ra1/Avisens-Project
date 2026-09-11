import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CurvasObjetivoService } from './curvas-objetivo.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CurvasObjetivoService', () => {
  let service: CurvasObjetivoService;

  const prisma = {
    curvaObjetivo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurvasObjetivoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<CurvasObjetivoService>(CurvasObjetivoService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea cuando la combinacion marca+sexo+dia no existe', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue(null);
      prisma.curvaObjetivo.create.mockResolvedValue({ id: 1 });
      await service.crear({
        marca: 'italcol',
        sexo: 'macho',
        dia: 21,
        peso_esperado_g: 1035,
      });
      expect(prisma.curvaObjetivo.create).toHaveBeenCalled();
    });

    it('lanza Conflict cuando ya existe marca+sexo+dia', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue({
        id: 9,
        marca: 'italcol',
        sexo: 'macho',
        dia: 21,
      });
      await expect(
        service.crear({ marca: 'italcol', sexo: 'macho', dia: 21 }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.curvaObjetivo.create).not.toHaveBeenCalled();
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando el punto no existe', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue(null);
      await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('actualizar', () => {
    it('actualiza el mismo punto sin verificar unica', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue({
        id: 1,
        marca: 'italcol',
        sexo: 'macho',
        dia: 21,
        origen: 'manual',
      });
      prisma.curvaObjetivo.update.mockResolvedValue({ id: 1 });
      await service.actualizar(1, { peso_esperado_g: 1040 });
      expect(prisma.curvaObjetivo.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.curvaObjetivo.update).toHaveBeenCalled();
    });
  });

  // Las curvas sembradas son el manual del fabricante, no configuracion de la
  // granja. Cambiarle el peso objetivo del dia 21 a Italcol mueve la referencia
  // contra la que se comparan los indicadores durante todo el ciclo, y nadie
  // nota que la comparacion dejo de significar lo que decia.
  describe('las curvas del manual no se tocan', () => {
    const delManual = {
      id: 1,
      marca: 'italcol',
      sexo: 'macho',
      dia: 21,
      origen: 'seed',
    };

    it('no deja editar una curva sembrada', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue(delManual);

      await expect(
        service.actualizar(1, { peso_esperado_g: 9999 }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.curvaObjetivo.update).not.toHaveBeenCalled();
    });

    it('no deja borrar una curva sembrada', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue(delManual);

      await expect(service.eliminar(1)).rejects.toThrow(ForbiddenException);
      expect(prisma.curvaObjetivo.delete).not.toHaveBeenCalled();
    });

    it('el mensaje dice de qué marca es y qué sí se puede hacer', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue(delManual);

      await expect(service.actualizar(1, {})).rejects.toThrow(
        /italcol.*manual del fabricante/s,
      );
      await expect(service.actualizar(1, {})).rejects.toThrow(/crear la curva/);
    });

    // Lo que sí hace falta: añadir marcas que no tenemos. Contegral y finca no
    // tienen curva, y un lote con esas marcas sale sin referencia.
    it('una curva añadida a mano sí se edita', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue({
        ...delManual,
        marca: 'contegral',
        origen: 'manual',
      });
      prisma.curvaObjetivo.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { peso_esperado_g: 1040 });

      expect(prisma.curvaObjetivo.update).toHaveBeenCalled();
    });

    it('una curva añadida a mano sí se borra', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue({
        ...delManual,
        marca: 'contegral',
        origen: 'manual',
      });
      prisma.curvaObjetivo.delete.mockResolvedValue({ id: 1 });

      await expect(service.eliminar(1)).resolves.toBeDefined();
    });

    // El origen lo pone el seed o el valor por defecto de la columna: si el
    // servicio lo escribiera, bastaria con mandarlo para saltarse el candado.
    it('crear no decide el origen', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue(null);
      prisma.curvaObjetivo.create.mockResolvedValue({ id: 2 });

      await service.crear({ marca: 'contegral', sexo: 'macho', dia: 7 });

      const datos = (
        prisma.curvaObjetivo.create.mock.calls as Array<
          [{ data: Record<string, unknown> }]
        >
      )[0][0].data;
      expect(datos).not.toHaveProperty('origen');
    });
  });

  describe('eliminar', () => {
    it('borra fisicamente el punto', async () => {
      prisma.curvaObjetivo.findUnique.mockResolvedValue({
        id: 1,
        marca: 'italcol',
        sexo: 'macho',
        dia: 21,
        origen: 'manual',
      });
      prisma.curvaObjetivo.delete.mockResolvedValue({ id: 1 });
      const r = await service.eliminar(1);
      expect(prisma.curvaObjetivo.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(r).toEqual({ id: 1, eliminado: true });
    });
  });
});
