import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoMovimientoInventario } from '@prisma/client';
import { EventosSanitariosService } from './eventos-sanitarios.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('EventosSanitariosService', () => {
  let service: EventosSanitariosService;

  const prisma = {
    eventoSanitario: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lote: { findUnique: jest.fn() },
    inventarioInsumo: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    movimientoInventario: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };

  const dtoCrear = {
    lote_id: 3,
    tipo: 'vacunacion',
    fecha: '2026-08-09',
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
      providers: [
        EventosSanitariosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<EventosSanitariosService>(EventosSanitariosService);

    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prisma) => unknown)(prisma);
      }
      return Promise.resolve([[], 0]);
    });
    // Por defecto el lote 3 es del propietario 5.
    prisma.lote.findUnique.mockResolvedValue({
      id: 3,
      galpon: { granja: { id: 7, propietario_id: 5 } },
    });
    prisma.inventarioInsumo.findFirst.mockResolvedValue({
      id: 2,
      nombre: 'Vacuna Newcastle',
      unidad_medida: 'frascos',
    });
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el evento y toma el usuario_id del token, no del DTO', async () => {
      prisma.eventoSanitario.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, propietario);

      expect(prisma.eventoSanitario.create).toHaveBeenCalled();
      const data = dataDe(prisma.eventoSanitario.create);
      expect(data.usuario_id).toBe(propietario.id);
      expect(data.fecha).toBeInstanceOf(Date);
    });

    it('valida el insumo cuando viene insumo_id (404 si no existe)', async () => {
      prisma.inventarioInsumo.findFirst.mockResolvedValue(null);

      await expect(
        service.crear({ ...dtoCrear, insumo_id: 99 }, propietario),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.eventoSanitario.create).not.toHaveBeenCalled();
    });

    it('no consulta el insumo cuando insumo_id viene vacio', async () => {
      prisma.eventoSanitario.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, propietario);

      expect(prisma.inventarioInsumo.findFirst).not.toHaveBeenCalled();
    });

    it('rechaza (400) si envian cantidad_insumo sin insumo_id', async () => {
      await expect(
        service.crear({ ...dtoCrear, cantidad_insumo: 2 }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.eventoSanitario.create).not.toHaveBeenCalled();
    });

    it('descuenta automaticamente del stock de bodega y registra movimiento de salida', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { stock_actual: new Prisma.Decimal(10) },
      ]);
      prisma.movimientoInventario.create.mockResolvedValue({ id: 77 });
      prisma.eventoSanitario.create.mockResolvedValue({
        id: 12,
        movimiento_inventario_id: 77,
      });

      await service.crear(
        {
          ...dtoCrear,
          insumo_id: 2,
          cantidad_insumo: 2.5,
          producto: 'La Sota',
        },
        propietario,
      );

      expect(prisma.inventarioInsumo.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { stock_actual: new Prisma.Decimal(7.5) },
      });
      const mov = dataDe(prisma.movimientoInventario.create);
      expect(mov.tipo_movimiento).toBe(TipoMovimientoInventario.salida);
      expect(mov.lote_id).toBe(3);
      expect(mov.motivo).toBe('Evento sanitario (vacunacion): La Sota');
      const evento = dataDe(prisma.eventoSanitario.create);
      expect(evento.movimiento_inventario_id).toBe(77);
      expect(evento.cantidad_insumo).toEqual(new Prisma.Decimal(2.5));
    });

    it('rechaza (400) cuando no hay stock suficiente en bodega', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { stock_actual: new Prisma.Decimal(1) },
      ]);

      await expect(
        service.crear(
          { ...dtoCrear, insumo_id: 2, cantidad_insumo: 5 },
          propietario,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.inventarioInsumo.update).not.toHaveBeenCalled();
      expect(prisma.eventoSanitario.create).not.toHaveBeenCalled();
    });

    it('relaciona un seguimiento con un caso sanitario activo del mismo lote', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 10,
        lote_id: 3,
        evento_padre_id: null,
        estado: 'activo',
      });
      prisma.eventoSanitario.create.mockResolvedValue({
        id: 11,
        evento_padre_id: 10,
      });

      await service.crear(
        { ...dtoCrear, tipo: 'seguimiento', evento_padre_id: 10 },
        propietario,
      );

      const data = dataDe(prisma.eventoSanitario.create);
      expect(data.evento_padre_id).toBe(10);
    });

    it('rechaza (400) seguimiento sobre un caso ya finalizado', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 10,
        lote_id: 3,
        evento_padre_id: null,
        estado: 'finalizado',
      });

      await expect(
        service.crear(
          { ...dtoCrear, tipo: 'seguimiento', evento_padre_id: 10 },
          propietario,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza (400) seguimiento anidado dentro de otro seguimiento', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 11,
        lote_id: 3,
        evento_padre_id: 10,
        estado: 'activo',
      });

      await expect(
        service.crear(
          { ...dtoCrear, tipo: 'seguimiento', evento_padre_id: 11 },
          propietario,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza (400) seguimiento en un lote distinto al caso principal', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 10,
        lote_id: 99,
        evento_padre_id: null,
        estado: 'activo',
      });

      await expect(
        service.crear(
          { ...dtoCrear, tipo: 'seguimiento', evento_padre_id: 10 },
          propietario,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('un Propietario no puede registrar en un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 3,
        galpon: { granja: { id: 7, propietario_id: 999 } },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.eventoSanitario.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el lote no existe', async () => {
      prisma.lote.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.eventoSanitario.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve eventos de sus lotes', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(whereDe(prisma.eventoSanitario.findMany).lote).toEqual({
        galpon: { granja: { propietario_id: 5 } },
      });
    });

    it('un Admin sin filtros no aplica where', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.eventoSanitario.findMany)).toBeUndefined();
    });

    it('aplica filtros opcionales de lote, estado y solo_casos', async () => {
      await service.listar(admin, {
        page: 1,
        limit: 10,
        lote_id: 3,
        estado: 'activo',
        solo_casos: true,
      });

      expect(whereDe(prisma.eventoSanitario.findMany)).toEqual({
        lote_id: 3,
        estado: 'activo',
        evento_padre_id: null,
      });
    });
  });

  describe('listarSeguimientos', () => {
    it('devuelve los seguimientos del caso principal ordenado cronologicamente', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 10,
        lote_id: 3,
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.eventoSanitario.findMany.mockResolvedValue([{ id: 11 }]);

      const res = await service.listarSeguimientos(10, propietario);

      expect(res).toEqual([{ id: 11 }]);
      expect(whereDe(prisma.eventoSanitario.findMany)).toEqual({
        evento_padre_id: 10,
      });
    });
  });

  describe('finalizar', () => {
    it('finaliza un caso sanitario activo con fecha y observaciones de cierre', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 10,
        lote_id: 3,
        evento_padre_id: null,
        estado: 'activo',
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.eventoSanitario.update.mockResolvedValue({
        id: 10,
        estado: 'finalizado',
      });

      const res = await service.finalizar(
        10,
        { observaciones_cierre: 'Lote recuperado' },
        propietario,
      );

      expect(res.estado).toBe('finalizado');
      const data = dataDe(prisma.eventoSanitario.update);
      expect(data.estado).toBe('finalizado');
      expect(data.fecha_cierre).toBeInstanceOf(Date);
      expect(data.observaciones_cierre).toBe('Lote recuperado');
    });

    it('rechaza (409) si el caso ya esta finalizado', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 10,
        lote_id: 3,
        evento_padre_id: null,
        estado: 'finalizado',
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });

      await expect(service.finalizar(10, {}, propietario)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rechaza (400) si intentan finalizar un seguimiento', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 11,
        lote_id: 3,
        evento_padre_id: 10,
        estado: 'activo',
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });

      await expect(service.finalizar(11, {}, propietario)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('obtener', () => {
    it('un Propietario no puede ver un evento ajeno (403)', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 1,
        lote: { galpon: { granja: { propietario_id: 999 } } },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza (404) si el evento no existe', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('actualizar', () => {
    it('actualiza cuando el evento es del solicitante', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 1,
        lote_id: 3,
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.eventoSanitario.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { dosis: '1 ml' }, propietario);

      expect(prisma.eventoSanitario.update).toHaveBeenCalled();
    });

    it('al mover a otro lote, re-valida que el nuevo sea suyo (403)', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 1,
        lote_id: 3,
        lote: { galpon: { granja: { propietario_id: 5 } } },
      });
      prisma.lote.findUnique.mockResolvedValue({
        id: 9,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(
        service.actualizar(1, { lote_id: 9 }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.eventoSanitario.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('elimina (borrado físico) cuando es dueño', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 1,
        lote_id: 3,
        lote: { galpon: { granja: { propietario_id: 5 } } },
        _count: { seguimientos: 0 },
      });
      prisma.eventoSanitario.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminar(1, propietario);

      expect(res).toEqual({ id: 1, eliminado: true });
    });

    it('revierte el stock en bodega si el evento tenia descuento asociado', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 12,
        lote_id: 3,
        insumo_id: 2,
        cantidad_insumo: new Prisma.Decimal(2.5),
        movimiento_inventario_id: 77,
        insumo: { id: 2, nombre: 'Vacuna', unidad_medida: 'frascos' },
        lote: { galpon: { granja: { propietario_id: 5 } } },
        _count: { seguimientos: 0 },
      });
      prisma.$queryRaw.mockResolvedValue([
        { stock_actual: new Prisma.Decimal(7.5) },
      ]);
      prisma.eventoSanitario.delete.mockResolvedValue({ id: 12 });

      const res = await service.eliminar(12, propietario);

      expect(res).toEqual({ id: 12, eliminado: true, stock_revertido: true });
      expect(prisma.inventarioInsumo.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { stock_actual: new Prisma.Decimal(10) },
      });
      const mov = dataDe(prisma.movimientoInventario.create);
      expect(mov.tipo_movimiento).toBe(TipoMovimientoInventario.entrada);
      expect(mov.motivo).toBe('Reversión evento sanitario #12');
    });

    it('rechaza (409) eliminar un caso que aun tiene seguimientos', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 10,
        lote_id: 3,
        lote: { galpon: { granja: { propietario_id: 5 } } },
        _count: { seguimientos: 2 },
      });

      await expect(service.eliminar(10, propietario)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.eventoSanitario.delete).not.toHaveBeenCalled();
    });

    it('un Propietario no puede eliminar un evento ajeno (403)', async () => {
      prisma.eventoSanitario.findUnique.mockResolvedValue({
        id: 1,
        lote_id: 3,
        lote: { galpon: { granja: { propietario_id: 999 } } },
      });

      await expect(service.eliminar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.eventoSanitario.delete).not.toHaveBeenCalled();
    });
  });
});
