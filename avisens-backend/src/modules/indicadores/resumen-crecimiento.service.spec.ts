import { ConfigService } from '@nestjs/config';
import { ROLES } from '../../common/auth/roles';
import { PrismaService } from '../../prisma/prisma.service';
import { ResumenCrecimientoService } from './resumen-crecimiento.service';

describe('ResumenCrecimientoService', () => {
  const prisma = {
    lote: { findMany: jest.fn() },
    indicadorLote: { findMany: jest.fn() },
    curvaGeneticaVersion: { findMany: jest.fn() },
  };
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const comparacion = { compararConCurva: jest.fn() };

  let service: ResumenCrecimientoService;

  beforeEach(() => {
    service = new ResumenCrecimientoService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
      comparacion as unknown as never,
    );
    prisma.lote.findMany.mockResolvedValue([]);
    jest.clearAllMocks();
  });

  it('devuelve un estado vacío sin inventar lotes ni consultar indicadores', async () => {
    prisma.lote.findMany.mockResolvedValue([]);

    const resumen = await service.obtener({ id: 5, rol: ROLES.PROPIETARIO });

    expect(resumen.lotes).toEqual([]);
    expect(resumen.riesgos).toEqual([]);
    expect(prisma.indicadorLote.findMany).not.toHaveBeenCalled();
    expect(prisma.curvaGeneticaVersion.findMany).not.toHaveBeenCalled();
  });

  it('limita la consulta del propietario a sus granjas y lotes activos', async () => {
    prisma.lote.findMany.mockResolvedValue([]);

    await service.obtener({ id: 17, rol: ROLES.PROPIETARIO });

    const [consulta] = prisma.lote.findMany.mock.calls[0] as [{ where: { AND: unknown[] } }];
    expect(consulta.where.AND).toEqual(expect.arrayContaining([
      { estado: 'activo' },
      { galpon: { granja: { propietario_id: 17 } } },
    ]));
  });

  it('no aplica un filtro de propietario al administrador', async () => {
    prisma.lote.findMany.mockResolvedValue([]);

    await service.obtener({ id: 1, rol: ROLES.ADMINISTRADOR });

    const [consulta] = prisma.lote.findMany.mock.calls[0] as [{ where: { AND: unknown[] } }];
    expect(consulta.where.AND).toEqual([{ estado: 'activo' }]);
  });
});
