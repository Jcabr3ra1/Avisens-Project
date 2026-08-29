import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CaptacionProspectosService } from './captacion-prospectos.service';

describe('CaptacionProspectosService', () => {
  const prisma = {
    prospecto: {
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new CaptacionProspectosService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('guarda una solicitud web como un prospecto nuevo', async () => {
    prisma.prospecto.create.mockResolvedValue({ id: 4, estado: 'nuevo' });

    await service.crearDesdeWeb({
      nombre: '  Ana Rojas  ',
      telefono: '300 123 4567',
      municipio: '  Lebrija ',
      tipo_produccion: ' Pollo de engorde ',
      email: ' ana@granja.co ',
      consentimiento_habeas_data: true,
    });

    expect(prisma.prospecto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nombre: 'Ana Rojas',
          municipio: 'Lebrija',
          tipo_produccion: 'Pollo de engorde',
          email: 'ana@granja.co',
          canal_origen: 'web',
          estado: 'nuevo',
          consentimiento_habeas_data: true,
        }),
      }),
    );
  });

  it('rechaza una solicitud sin autorización de datos', async () => {
    await expect(
      service.crearDesdeWeb({
        nombre: 'Ana Rojas',
        telefono: '3001234567',
        municipio: 'Lebrija',
        tipo_produccion: 'Pollo de engorde',
        consentimiento_habeas_data: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.prospecto.create).not.toHaveBeenCalled();
  });
});
