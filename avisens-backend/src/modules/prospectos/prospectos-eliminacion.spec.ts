import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ProspectosService } from './prospectos.service';

describe('eliminación de prospectos', () => {
  const tx = {
    prospecto: { findUnique: jest.fn(), delete: jest.fn() },
    cotizacionSensor: { deleteMany: jest.fn() },
    cotizacion: { deleteMany: jest.fn() },
    respuestaChatbot: { deleteMany: jest.fn() },
    interaccionChatbot: { deleteMany: jest.fn() },
    solicitudPqrs: { deleteMany: jest.fn() },
    usuario: { delete: jest.fn(), deleteMany: jest.fn() },
    organizacion: { delete: jest.fn() },
    granja: { deleteMany: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const service = new ProspectosService(
    prisma as unknown as PrismaService,
    {} as UsuariosService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    tx.prospecto.findUnique.mockResolvedValue({
      id: 7,
      usuario_convertido_id: 42,
    });
    prisma.$transaction.mockImplementation(
      (operacion: (cliente: typeof tx) => unknown) => operacion(tx),
    );
  });

  it('exige confirmación antes de abrir la transacción', async () => {
    await expect(service.eliminar(7, 'eliminar')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('no borra nada si el prospecto no existe', async () => {
    tx.prospecto.findUnique.mockResolvedValue(null);
    await expect(service.eliminar(7, 'ELIMINAR')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.cotizacionSensor.deleteMany).not.toHaveBeenCalled();
    expect(tx.prospecto.delete).not.toHaveBeenCalled();
  });

  it('borra solo el historial solicitado, de hijos a padre, conservando el cliente', async () => {
    await expect(service.eliminar(7, 'ELIMINAR')).resolves.toEqual({
      id: 7,
      eliminado: true,
    });
    expect(tx.prospecto.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { id: true },
    });
    expect(tx.cotizacionSensor.deleteMany).toHaveBeenCalledWith({
      where: { cotizacion: { prospecto_id: 7 } },
    });
    for (const modelo of [
      tx.cotizacion,
      tx.respuestaChatbot,
      tx.interaccionChatbot,
      tx.solicitudPqrs,
    ]) {
      expect(modelo.deleteMany).toHaveBeenCalledWith({
        where: { prospecto_id: 7 },
      });
    }
    expect(tx.prospecto.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    const orden = [
      tx.cotizacionSensor.deleteMany,
      tx.cotizacion.deleteMany,
      tx.respuestaChatbot.deleteMany,
      tx.interaccionChatbot.deleteMany,
      tx.solicitudPqrs.deleteMany,
      tx.prospecto.delete,
    ].map((fn) => fn.mock.invocationCallOrder[0]);
    expect(orden).toEqual([...orden].sort((a, b) => a - b));
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(tx.usuario.delete).not.toHaveBeenCalled();
    expect(tx.usuario.deleteMany).not.toHaveBeenCalled();
    expect(tx.organizacion.delete).not.toHaveBeenCalled();
    expect(tx.granja.deleteMany).not.toHaveBeenCalled();
  });

  it('propaga el fallo al límite transaccional y no continúa borrando', async () => {
    const error = new Error('falló una operación');
    tx.interaccionChatbot.deleteMany.mockRejectedValue(error);
    await expect(service.eliminar(7, 'ELIMINAR')).rejects.toBe(error);
    expect(tx.solicitudPqrs.deleteMany).not.toHaveBeenCalled();
    expect(tx.prospecto.delete).not.toHaveBeenCalled();
  });

  it.each(['P2003', 'P2014', 'P2034'])(
    'convierte %s en un conflicto recuperable',
    async (code) => {
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('conflicto', {
          code,
          clientVersion: 'test',
        }),
      );
      await expect(service.eliminar(7, 'ELIMINAR')).rejects.toBeInstanceOf(
        ConflictException,
      );
    },
  );
});
