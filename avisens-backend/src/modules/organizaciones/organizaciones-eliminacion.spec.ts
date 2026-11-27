import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizacionesService } from './organizaciones.service';

type Llamada = { modelo: string; metodo: string; args: unknown };

function clienteRegistrador(llamadas: Llamada[], fallo?: Error) {
  return new Proxy(
    {},
    {
      get: (_objetivo, modelo: string) =>
        new Proxy(
          {},
          {
            get: (_m, metodo: string) => (args: unknown) => {
              llamadas.push({ modelo, metodo, args });
              if (fallo && modelo === 'usuario' && metodo === 'deleteMany') {
                return Promise.reject(fallo);
              }
              return Promise.resolve({ count: 0 });
            },
          },
        ),
    },
  );
}

describe('OrganizacionesService · eliminación definitiva', () => {
  let service: OrganizacionesService;
  let llamadas: Llamada[];
  let fallo: Error | undefined;

  const prisma = {
    organizacion: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn(), count: jest.fn() },
    granja: { count: jest.fn() },
    galpon: { count: jest.fn() },
    lote: { count: jest.fn() },
    dispositivo: { count: jest.fn() },
    sensor: { count: jest.fn() },
    medicion: { count: jest.fn() },
    pesaje: { count: jest.fn() },
    registroMortalidad: { count: jest.fn() },
    consumoDiario: { count: jest.fn() },
    eventoSanitario: { count: jest.fn() },
    registroPlaga: { count: jest.fn() },
    alerta: { count: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    llamadas = [];
    fallo = undefined;
    prisma.organizacion.findUnique.mockResolvedValue({
      id: 7,
      nombre: 'Avícola Sur',
      activa: true,
    });
    prisma.usuario.findUnique.mockResolvedValue({ organizacion_id: null });
    prisma.$transaction.mockImplementation((operaciones: unknown) =>
      typeof operaciones === 'function'
        ? (operaciones as (tx: unknown) => Promise<unknown>)(
            clienteRegistrador(llamadas, fallo),
          )
        : Promise.resolve([2, 1, 3, 2, 1, 4, 900, 10, 5, 20, 1, 0, 6]),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizacionesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(OrganizacionesService);
  });

  afterEach(() => jest.clearAllMocks());

  const posicion = (modelo: string, metodo = 'deleteMany') =>
    llamadas.findIndex(
      (llamada) => llamada.modelo === modelo && llamada.metodo === metodo,
    );

  it('resume lo que se borraría, sumando los registros de bitácora', async () => {
    await expect(service.impactoEliminacion(7)).resolves.toEqual({
      organizacion: { id: 7, nombre: 'Avícola Sur' },
      usuarios: 2,
      granjas: 1,
      galpones: 3,
      lotes: 2,
      dispositivos: 1,
      sensores: 4,
      mediciones: 900,
      registros: 36,
      alertas: 6,
    });
  });

  it('no borra nada si la confirmación no es el nombre exacto', async () => {
    await expect(
      service.eliminarDefinitivo(7, 'avicola sur', 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(llamadas).toHaveLength(0);
  });

  it('acepta el nombre con espacios alrededor', async () => {
    await expect(
      service.eliminarDefinitivo(7, '  Avícola Sur ', 1),
    ).resolves.toMatchObject({ eliminada: true });
  });

  it('impide borrar la organización de quien lo pide', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ organizacion_id: 7 });
    await expect(
      service.eliminarDefinitivo(7, 'Avícola Sur', 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(llamadas).toHaveLength(0);
  });

  it('borra de las hojas a la raíz y termina con la organización', async () => {
    await service.eliminarDefinitivo(7, 'Avícola Sur', 1);

    expect(posicion('medicion')).toBeLessThan(posicion('sensor'));
    expect(posicion('sensor')).toBeLessThan(posicion('dispositivo'));
    expect(posicion('pesaje')).toBeLessThan(posicion('lote'));
    expect(posicion('alerta')).toBeLessThan(posicion('sensor'));
    expect(posicion('mantenimientoRepuesto')).toBeLessThan(
      posicion('movimientoInventario'),
    );
    expect(posicion('lote')).toBeLessThan(posicion('galpon'));
    expect(posicion('galpon')).toBeLessThan(posicion('granja'));
    expect(posicion('granja')).toBeLessThan(posicion('usuario'));
    expect(llamadas.at(-1)).toMatchObject({
      modelo: 'organizacion',
      metodo: 'delete',
      args: { where: { id: 7 } },
    });
  });

  it('conserva auditoría, prospectos, PQRS y curvas: solo les quita la referencia', async () => {
    await service.eliminarDefinitivo(7, 'Avícola Sur', 1);

    for (const modelo of [
      'bitacoraAuditoria',
      'prospecto',
      'solicitudPqrs',
      'curvaGeneticaVersion',
    ]) {
      expect(posicion(modelo)).toBe(-1);
      expect(posicion(modelo, 'updateMany')).toBeGreaterThanOrEqual(0);
    }
    expect(llamadas[0]).toMatchObject({
      modelo: 'bitacoraAuditoria',
      metodo: 'updateMany',
      args: { data: { usuario_id: null } },
    });
  });

  it('si un usuario tiene registros en otra organización, falla sin borrar y lo explica', async () => {
    fallo = new Prisma.PrismaClientKnownRequestError('fk', {
      code: 'P2003',
      clientVersion: 'test',
    });
    await expect(
      service.eliminarDefinitivo(7, 'Avícola Sur', 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
