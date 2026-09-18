import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurvasGeneticasService } from './curvas-geneticas.service';
import { PrismaService } from '../../prisma/prisma.service';

const solicitante = { id: 9, rol: 'Administrador' };

const dataDe = (mock: jest.Mock): Record<string, unknown> => {
  const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;
  return calls[0][0].data;
};

describe('CurvasGeneticasService', () => {
  let service: CurvasGeneticasService;

  const tx = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    puntoCurvaGenetica: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    curvaGeneticaVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const prisma = {
    lineaGenetica: { findUnique: jest.fn() },
    curvaGeneticaVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const conCallback = () => {
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurvasGeneticasService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<CurvasGeneticasService>(CurvasGeneticasService);
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  describe('crear', () => {
    // El chequeo de existencia/activo de la linea vive DENTRO de la
    // transaccion (SELECT ... FOR UPDATE via tx.$queryRaw), no en una
    // consulta previa: por eso estos tests configuran tx.$queryRaw, no
    // prisma.lineaGenetica.findUnique -- esa consulta ya no existe en
    // crear(). Demuestra que la decision se toma con la lectura bloqueada.
    it('rechaza (404) si la linea genetica no existe (leida dentro de la transaccion)', async () => {
      conCallback();
      tx.$executeRaw.mockResolvedValue(undefined);
      tx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.crear({ linea_genetica_id: 1, sexo: 'macho', fuente: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(tx.curvaGeneticaVersion.create).not.toHaveBeenCalled();
    });

    it('rechaza (409) si la linea genetica esta inactiva (leida dentro de la transaccion)', async () => {
      conCallback();
      tx.$executeRaw.mockResolvedValue(undefined);
      tx.$queryRaw.mockResolvedValue([{ id: 1, activo: false }]);

      await expect(
        service.crear({ linea_genetica_id: 1, sexo: 'macho', fuente: 'x' }),
      ).rejects.toThrow(ConflictException);
      expect(tx.curvaGeneticaVersion.create).not.toHaveBeenCalled();
    });

    it('usa version 1 cuando no hay historial para esa linea+sexo', async () => {
      conCallback();
      tx.$executeRaw.mockResolvedValue(undefined);
      tx.$queryRaw.mockResolvedValue([{ id: 1, activo: true }]);
      tx.curvaGeneticaVersion.findFirst.mockResolvedValue(null);
      tx.curvaGeneticaVersion.create.mockResolvedValue({ id: 10 });

      await service.crear({ linea_genetica_id: 1, sexo: 'macho', fuente: 'x' });

      expect(dataDe(tx.curvaGeneticaVersion.create)).toMatchObject({
        version: 1,
      });
    });

    it('usa la version siguiente al maximo historico, nunca 1 fijo', async () => {
      conCallback();
      tx.$executeRaw.mockResolvedValue(undefined);
      tx.$queryRaw.mockResolvedValue([{ id: 1, activo: true }]);
      tx.curvaGeneticaVersion.findFirst.mockResolvedValue({ version: 3 });
      tx.curvaGeneticaVersion.create.mockResolvedValue({ id: 10 });

      await service.crear({ linea_genetica_id: 1, sexo: 'macho', fuente: 'x' });

      expect(dataDe(tx.curvaGeneticaVersion.create)).toMatchObject({
        version: 4,
      });
    });

    it('traduce un choque de version unica (P2002, carrera dentro del lock) a un 409 de dominio', async () => {
      conCallback();
      tx.$executeRaw.mockResolvedValue(undefined);
      tx.$queryRaw.mockResolvedValue([{ id: 1, activo: true }]);
      tx.curvaGeneticaVersion.findFirst.mockResolvedValue(null);
      tx.curvaGeneticaVersion.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.crear({ linea_genetica_id: 1, sexo: 'macho', fuente: 'x' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('reemplazarPuntos', () => {
    const puntos = [
      { dia: 7, peso_esperado_g: 211 },
      { dia: 14, peso_esperado_g: 535 },
    ];

    it('rechaza (400) dias repetidos en el array de entrada, antes de tocar la base', async () => {
      await expect(
        service.reemplazarPuntos(1, {
          puntos: [
            { dia: 7, peso_esperado_g: 100 },
            { dia: 7, peso_esperado_g: 200 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza (404) si la curva no existe', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([]);

      await expect(service.reemplazarPuntos(1, { puntos })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza (409) si el estado no es borrador (verificado tras el lock)', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([{ id: 1, estado: 'publicada' }]);

      await expect(service.reemplazarPuntos(1, { puntos })).rejects.toThrow(
        ConflictException,
      );
      expect(tx.puntoCurvaGenetica.deleteMany).not.toHaveBeenCalled();
    });

    it('reemplaza el conjunto completo cuando esta en borrador', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([{ id: 1, estado: 'borrador' }]);
      tx.curvaGeneticaVersion.findUniqueOrThrow.mockResolvedValue({ id: 1 });

      await service.reemplazarPuntos(1, { puntos });

      expect(tx.puntoCurvaGenetica.deleteMany).toHaveBeenCalledWith({
        where: { curva_version_id: 1 },
      });
      expect(tx.puntoCurvaGenetica.createMany).toHaveBeenCalledWith({
        data: [
          {
            curva_version_id: 1,
            dia: 7,
            peso_esperado_g: 211,
            consumo_diario_g: undefined,
            consumo_acumulado_g: undefined,
            fcr_objetivo: undefined,
          },
          {
            curva_version_id: 1,
            dia: 14,
            peso_esperado_g: 535,
            consumo_diario_g: undefined,
            consumo_acumulado_g: undefined,
            fcr_objetivo: undefined,
          },
        ],
      });
    });

    it('un array vacio borra todos los puntos sin crear ninguno', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([{ id: 1, estado: 'borrador' }]);
      tx.curvaGeneticaVersion.findUniqueOrThrow.mockResolvedValue({ id: 1 });

      await service.reemplazarPuntos(1, { puntos: [] });

      expect(tx.puntoCurvaGenetica.deleteMany).toHaveBeenCalled();
      expect(tx.puntoCurvaGenetica.createMany).not.toHaveBeenCalled();
    });
  });

  describe('publicar', () => {
    const puntoCon = (dia: number, peso: number, consumo: number | null) => ({
      dia,
      peso_esperado_g: new Prisma.Decimal(peso),
      consumo_acumulado_g:
        consumo === null ? null : new Prisma.Decimal(consumo),
    });

    it('rechaza (404) si la curva no existe', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([]);

      await expect(service.publicar(1, solicitante)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza (409) si el estado no es borrador', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([{ id: 1, estado: 'publicada' }]);

      await expect(service.publicar(1, solicitante)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rechaza (400) con menos de 2 puntos', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([{ id: 1, estado: 'borrador' }]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue([puntoCon(7, 211, 164)]);

      await expect(service.publicar(1, solicitante)).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.curvaGeneticaVersion.update).not.toHaveBeenCalled();
    });

    it('rechaza (400) si el peso decrece entre dias consecutivos', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([{ id: 1, estado: 'borrador' }]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue([
        puntoCon(7, 211, 164),
        puntoCon(14, 180, 400),
      ]);

      await expect(service.publicar(1, solicitante)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza (400) si el consumo acumulado decrece entre los valores presentes', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([{ id: 1, estado: 'borrador' }]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue([
        puntoCon(7, 211, 164),
        puntoCon(14, 535, 100),
      ]);

      await expect(service.publicar(1, solicitante)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('acepta un consumo_acumulado_g nulo intermedio sin romper la validacion', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([{ id: 1, estado: 'borrador' }]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue([
        puntoCon(7, 211, 164),
        puntoCon(14, 535, null),
        puntoCon(21, 1035, 1218),
      ]);
      tx.curvaGeneticaVersion.update.mockResolvedValue({ id: 1 });

      await service.publicar(1, solicitante);

      expect(tx.curvaGeneticaVersion.update).toHaveBeenCalled();
    });

    it('publica: estado, fecha_publicacion y publicada_por_id', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([{ id: 1, estado: 'borrador' }]);
      tx.puntoCurvaGenetica.findMany.mockResolvedValue([
        puntoCon(7, 211, 164),
        puntoCon(14, 535, 551),
      ]);
      tx.curvaGeneticaVersion.update.mockResolvedValue({ id: 1 });

      await service.publicar(1, solicitante);

      const llamadas = tx.curvaGeneticaVersion.update.mock.calls as Array<
        [{ where: Record<string, unknown>; data: Record<string, unknown> }]
      >;
      const llamada = llamadas[0][0];
      expect(llamada.where).toEqual({ id: 1 });
      expect(llamada.data).toMatchObject({
        estado: 'publicada',
        publicada_por_id: solicitante.id,
      });
      expect(llamada.data.fecha_publicacion).toBeInstanceOf(Date);
    });
  });

  describe('activar', () => {
    it('rechaza (404) si la curva no existe', async () => {
      prisma.curvaGeneticaVersion.findUnique.mockResolvedValue(null);

      await expect(service.activar(1)).rejects.toThrow(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    // La consulta previa (findUnique, fuera de la transaccion) solo sirve
    // para conocer linea_genetica_id/sexo y armar la clave del advisory
    // lock -- por eso aqui NO trae linea_genetica.activo. La decision sobre
    // "activa" se demuestra con la lectura BLOQUEADA (tx.$queryRaw) dentro
    // de la transaccion: el primer valor de la secuencia decide.
    it('rechaza (409) si la linea genetica esta inactiva (leida dentro de la transaccion, no en la consulta previa)', async () => {
      prisma.curvaGeneticaVersion.findUnique.mockResolvedValue({
        id: 1,
        linea_genetica_id: 5,
        sexo: 'macho',
      });
      conCallback();
      tx.$executeRaw.mockResolvedValue(undefined);
      tx.$queryRaw.mockResolvedValueOnce([{ activo: false }]);

      await expect(service.activar(1)).rejects.toThrow(ConflictException);
      expect(tx.curvaGeneticaVersion.updateMany).not.toHaveBeenCalled();
    });

    it('rechaza (409) si el estado no es publicada, aun con la linea activa', async () => {
      prisma.curvaGeneticaVersion.findUnique.mockResolvedValue({
        id: 1,
        linea_genetica_id: 5,
        sexo: 'macho',
      });
      conCallback();
      tx.$executeRaw.mockResolvedValue(undefined);
      tx.$queryRaw
        .mockResolvedValueOnce([{ activo: true }])
        .mockResolvedValueOnce([{ estado: 'borrador' }]);

      await expect(service.activar(1)).rejects.toThrow(ConflictException);
      expect(tx.curvaGeneticaVersion.updateMany).not.toHaveBeenCalled();
    });

    it('retira la vigente anterior y activa la nueva, dentro de la misma transaccion', async () => {
      prisma.curvaGeneticaVersion.findUnique.mockResolvedValue({
        id: 1,
        linea_genetica_id: 5,
        sexo: 'macho',
      });
      conCallback();
      tx.$executeRaw.mockResolvedValue(undefined);
      tx.$queryRaw
        .mockResolvedValueOnce([{ activo: true }])
        .mockResolvedValueOnce([{ estado: 'publicada' }]);
      tx.curvaGeneticaVersion.update.mockResolvedValue({
        id: 1,
        vigente: true,
      });

      await service.activar(1);

      expect(tx.curvaGeneticaVersion.updateMany).toHaveBeenCalledWith({
        where: { linea_genetica_id: 5, sexo: 'macho', vigente: true },
        data: { vigente: false },
      });
      expect(tx.curvaGeneticaVersion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { vigente: true },
        }),
      );
    });
  });

  describe('eliminar', () => {
    it('rechaza (404) si la curva no existe', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([]);

      await expect(service.eliminar(1)).rejects.toThrow(NotFoundException);
    });

    it('rechaza (409) si el estado no es borrador', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([{ estado: 'publicada' }]);

      await expect(service.eliminar(1)).rejects.toThrow(ConflictException);
      expect(tx.curvaGeneticaVersion.delete).not.toHaveBeenCalled();
    });

    it('elimina (dentro de la transaccion, no fuera) cuando esta en borrador', async () => {
      conCallback();
      tx.$queryRaw.mockResolvedValue([{ estado: 'borrador' }]);
      tx.curvaGeneticaVersion.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminar(1);

      expect(tx.curvaGeneticaVersion.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(res).toEqual({ id: 1, eliminado: true });
    });
  });
});
