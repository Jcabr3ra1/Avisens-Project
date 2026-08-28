import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuariosGalponesService } from './usuarios-galpones.service';

describe('UsuariosGalponesService', () => {
  let service: UsuariosGalponesService;
  const prisma = {
    usuarioGalpon: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsuariosGalponesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<UsuariosGalponesService>(UsuariosGalponesService);
  });

  it('crea una asignación', async () => {
    prisma.usuarioGalpon.create.mockResolvedValue({ id: 1 });
    expect((await service.crear({ usuario_id: 1, galpon_id: 1 })).id).toBe(1);
  });

  it('lanza ConflictException si ya existe', async () => {
    const err = Object.assign(new Error('dup'), { code: 'P2002' });
    prisma.usuarioGalpon.create.mockRejectedValue(err);
    await expect(service.crear({ usuario_id: 1, galpon_id: 1 })).rejects.toThrow(ConflictException);
  });

  it('lanza NotFound al obtener inexistente', async () => {
    prisma.usuarioGalpon.findUnique.mockResolvedValue(null);
    await expect(service.obtener(99)).rejects.toThrow(NotFoundException);
  });

  it('elimina una asignación', async () => {
    prisma.usuarioGalpon.findUnique.mockResolvedValue({ id: 1 });
    prisma.usuarioGalpon.delete.mockResolvedValue({ id: 1 });
    expect(await service.eliminar(1)).toEqual({ id: 1, eliminado: true });
  });
});
