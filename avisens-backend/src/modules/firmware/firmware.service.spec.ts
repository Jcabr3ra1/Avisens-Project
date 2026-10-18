import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { FirmwareService, TAMANO_MAXIMO_FIRMWARE } from './firmware.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FirmwareService', () => {
  let service: FirmwareService;

  const prisma = {
    firmwareVersion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const imagen = (tamano = 1024) => {
    const binario = Buffer.alloc(tamano, 1);
    binario[0] = 0xe9;
    return binario;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirmwareService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(FirmwareService);
  });

  describe('subir', () => {
    it('guarda la imagen con su huella sha256 y sin publicarla', async () => {
      prisma.firmwareVersion.findUnique.mockResolvedValue(null);
      const binario = imagen();

      await service.subir(binario, '1.2.0', '  arregla el búfer ');

      const [{ data }] = prisma.firmwareVersion.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(data).toMatchObject({
        version: '1.2.0',
        sha256: createHash('sha256').update(binario).digest('hex'),
        tamano: 1024,
        notas: 'arregla el búfer',
      });
      expect(data.vigente).toBeUndefined();
    });

    it.each([
      ['sin archivo', Buffer.alloc(0), '1.2.0', /archivo \.bin/],
      ['versión mal escrita', imagen(), 'v1.2', /formato 1\.2\.3/],
      ['no es imagen de ESP32', Buffer.alloc(64, 0), '1.2.0', /ESP32/],
      [
        'más grande que la partición',
        imagen(TAMANO_MAXIMO_FIRMWARE + 1),
        '1.2.0',
        /1,25 MB/,
      ],
    ])('rechaza %s', async (_caso, binario, version, mensaje) => {
      await expect(service.subir(binario, version, undefined)).rejects.toThrow(
        mensaje,
      );
      expect(prisma.firmwareVersion.create).not.toHaveBeenCalled();
    });

    it('rechaza una versión repetida', async () => {
      prisma.firmwareVersion.findUnique.mockResolvedValue({ id: 1 });

      await expect(service.subir(imagen(), '1.2.0', null)).rejects.toThrow(
        ConflictException,
      );
    });

    it('acepta solo un Buffer como cuerpo', async () => {
      await expect(
        service.subir({ archivo: 'x' }, '1.2.0', null),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('publicar deja una sola versión vigente', async () => {
    prisma.firmwareVersion.findUnique.mockResolvedValue({
      id: 3,
      vigente: false,
    });

    await service.publicar(3);

    expect(prisma.firmwareVersion.updateMany).toHaveBeenCalledWith({
      where: { vigente: true, NOT: { id: 3 } },
      data: { vigente: false },
    });
    expect(prisma.firmwareVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 }, data: { vigente: true } }),
    );
  });

  it('no elimina la versión publicada', async () => {
    prisma.firmwareVersion.findUnique.mockResolvedValue({
      id: 3,
      vigente: true,
    });

    await expect(service.eliminar(3)).rejects.toThrow(ConflictException);
    expect(prisma.firmwareVersion.delete).not.toHaveBeenCalled();
  });

  it('sin firmware publicado la descarga responde 404', async () => {
    prisma.firmwareVersion.findFirst.mockResolvedValue(null);

    await expect(service.binarioVigente()).rejects.toThrow(NotFoundException);
  });
});
