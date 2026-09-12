import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProspectosService } from './prospectos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';

describe('ProspectosService', () => {
  let service: ProspectosService;

  const usuarios = { altaDeUsuario: jest.fn() };

  const prisma = {
    prospecto: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    usuario: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };

  const argsDe = (mock: jest.Mock) =>
    (mock.mock.calls as Array<[Record<string, unknown>]>)[0][0];

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectosService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsuariosService, useValue: usuarios },
      ],
    }).compile();
    service = module.get<ProspectosService>(ProspectosService);

    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  describe('listar', () => {
    it('ordena por puntaje descendente para que los calientes salgan primero', async () => {
      await service.listar({ page: 1, limit: 20 });

      expect(argsDe(prisma.prospecto.findMany).orderBy).toEqual([
        { puntaje_total: 'desc' },
        { fecha_inicio: 'desc' },
      ]);
    });

    it('no filtra cuando no llegan filtros', async () => {
      await service.listar({ page: 1, limit: 20 });
      expect(argsDe(prisma.prospecto.findMany).where).toEqual({});
    });

    it('combina los filtros que si llegan', async () => {
      await service.listar({
        page: 1,
        limit: 20,
        clasificacion: 'caliente',
        estado: 'calificado',
        sin_asignar: true,
      });

      expect(argsDe(prisma.prospecto.findMany).where).toEqual({
        clasificacion: 'caliente',
        estado: 'calificado',
        asesor_asignado_id: null,
      });
    });

    it('sin_asignar en false no filtra por asesor', async () => {
      await service.listar({ page: 1, limit: 20, sin_asignar: false });
      expect(argsDe(prisma.prospecto.findMany).where).toEqual({});
    });

    it('no expone datos personales de mas en la lista', async () => {
      await service.listar({ page: 1, limit: 20 });

      const seleccion = argsDe(prisma.prospecto.findMany).select as Record<
        string,
        boolean
      >;
      expect(seleccion.documento).toBeUndefined();
      expect(seleccion.email).toBeUndefined();
      expect(seleccion.ip_origen).toBeUndefined();
      expect(seleccion.sesion_id).toBeUndefined();
      expect(seleccion.telefono).toBe(true);
    });

    it('pagina con skip y take', async () => {
      await service.listar({ page: 3, limit: 10 });
      const args = argsDe(prisma.prospecto.findMany);
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando no existe', async () => {
      prisma.prospecto.findUnique.mockResolvedValue(null);
      await expect(service.obtener(1)).rejects.toThrow(NotFoundException);
    });

    it('omite el sesion_id, que es la credencial de la conversacion', async () => {
      prisma.prospecto.findUnique.mockResolvedValue({ id: 1, respuestas: [] });

      await service.obtener(1);

      expect(argsDe(prisma.prospecto.findUnique).omit).toEqual({
        sesion_id: true,
      });
    });
  });

  describe('asignar', () => {
    const calificado = {
      id: 5,
      estado: 'calificado',
      clasificacion: 'caliente',
    };
    const asesor = {
      id: 1,
      nombre_completo: 'Ana Gomez',
      rol: { nombre: 'Administrador' },
    };

    it('lanza NotFound cuando el prospecto no existe', async () => {
      prisma.prospecto.findUnique.mockResolvedValue(null);
      await expect(service.asignar(5, 1)).rejects.toThrow(NotFoundException);
    });

    it('rechaza asignar un prospecto que no termino el cuestionario', async () => {
      prisma.prospecto.findUnique.mockResolvedValue({
        ...calificado,
        estado: 'en_proceso',
      });
      await expect(service.asignar(5, 1)).rejects.toThrow(BadRequestException);
      expect(prisma.prospecto.update).not.toHaveBeenCalled();
    });

    it('rechaza un asesor inactivo o inexistente', async () => {
      prisma.prospecto.findUnique.mockResolvedValue(calificado);
      prisma.usuario.findFirst.mockResolvedValue(null);

      await expect(service.asignar(5, 99)).rejects.toThrow(/administrador|asesor/);
      expect(prisma.usuario.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 99, activo: true } }),
      );
    });

    // Un prospecto es alguien que todavia NO es cliente. Un Propietario o un
    // Operario si lo son: asignarles un prospecto pondria a un cliente a
    // llevar las ventas de su proveedor, y le daria visibilidad sobre
    // prospectos que son competencia suya.
    it.each(['Propietario', 'Operario'])(
      'rechaza asignar el prospecto a un %s',
      async (rol) => {
        prisma.prospecto.findUnique.mockResolvedValue(calificado);
        prisma.usuario.findFirst.mockResolvedValue({
          id: 20,
          nombre_completo: 'Maria Lopez',
          rol: { nombre: rol },
        });

        await expect(service.asignar(5, 20)).rejects.toThrow(
          /no es administrador/,
        );
        expect(prisma.prospecto.update).not.toHaveBeenCalled();
      },
    );

    it('el mensaje dice quien es, para que se entienda el rechazo', async () => {
      prisma.prospecto.findUnique.mockResolvedValue(calificado);
      prisma.usuario.findFirst.mockResolvedValue({
        id: 20,
        nombre_completo: 'Maria Lopez',
        rol: { nombre: 'Propietario' },
      });

      await expect(service.asignar(5, 20)).rejects.toThrow(/Maria Lopez/);
    });

    it('pide el rol al buscar al asesor, no solo que exista', async () => {
      prisma.prospecto.findUnique.mockResolvedValue(calificado);
      prisma.usuario.findFirst.mockResolvedValue(asesor);
      prisma.prospecto.update.mockResolvedValue({});

      await service.asignar(5, 1);

      const args = (
        prisma.usuario.findFirst.mock.calls as Array<[{ select: object }]>
      )[0][0];
      expect(args.select).toHaveProperty('rol');
    });

    it('asigna y mueve el prospecto al estado asignado', async () => {
      prisma.prospecto.findUnique.mockResolvedValue(calificado);
      prisma.usuario.findFirst.mockResolvedValue(asesor);
      prisma.prospecto.update.mockResolvedValue({});

      const r = await service.asignar(5, 1);

      expect(argsDe(prisma.prospecto.update)).toEqual({
        where: { id: 5 },
        data: { asesor_asignado_id: 1, estado: 'asignado' },
      });
      expect(r).toEqual({
        prospecto_id: 5,
        clasificacion: 'caliente',
        asesor: 'Ana Gomez',
        admin: 'Ana Gomez',
        estado: 'asignado',
      });
    });
  });
});
