import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CotizacionesService } from './cotizaciones.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CotizacionesService', () => {
  let service: CotizacionesService;

  const prisma = {
    prospecto: { findUnique: jest.fn() },
    catalogoSensor: { findMany: jest.fn() },
    cotizacion: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const CATALOGO = [
    {
      tipo_sensor: 'temperatura_humedad',
      nombre: 'Sensor de temperatura y humedad',
      precio_unitario_cop: 180000,
      cobertura_m2: 120,
      obligatorio: true,
    },
    {
      tipo_sensor: 'nodo_esp32',
      nombre: 'Nodo de control ESP32',
      precio_unitario_cop: 250000,
      cobertura_m2: null,
      obligatorio: true,
    },
  ];

  const calificado = {
    id: 14,
    estado: 'calificado',
    area_galpon_m2: 1200,
    area_granja_m2: 4800,
    respuestas: [{ respuesta_texto: '>10000' }],
  };

  const lineaDe = (
    c: { lineas: Array<{ tipo_sensor: string; cantidad: number }> },
    tipo: string,
  ) => c.lineas.find((l) => l.tipo_sensor === tipo)!;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CotizacionesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<CotizacionesService>(CotizacionesService);

    prisma.prospecto.findUnique.mockResolvedValue(calificado);
    prisma.catalogoSensor.findMany.mockResolvedValue(CATALOGO);
    prisma.$transaction.mockResolvedValue({ id: 1, codigo: 'COT-14-XYZ' });
  });

  it('lanza NotFound cuando el prospecto no existe', async () => {
    prisma.prospecto.findUnique.mockResolvedValue(null);
    await expect(service.generar(14, {})).rejects.toThrow(NotFoundException);
  });

  it.each(['nuevo', 'en_proceso'])(
    'rechaza cotizar un prospecto en estado %s',
    async (estado) => {
      prisma.prospecto.findUnique.mockResolvedValue({ ...calificado, estado });
      await expect(service.generar(14, {})).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('estima los galpones dividiendo el area de la granja entre la del galpon', async () => {
    const c = await service.generar(14, {});
    expect(c.numero_galpones).toBe(4);
  });

  it('respeta el numero de galpones cuando viene en el dto', async () => {
    const c = await service.generar(14, { numero_galpones: 7 });
    expect(c.numero_galpones).toBe(7);
  });

  it('nunca estima menos de un galpon', async () => {
    prisma.prospecto.findUnique.mockResolvedValue({
      ...calificado,
      area_granja_m2: 100,
    });
    const c = await service.generar(14, {});
    expect(c.numero_galpones).toBe(1);
  });

  it('usa el area por defecto cuando el prospecto no la dio', async () => {
    prisma.prospecto.findUnique.mockResolvedValue({
      ...calificado,
      area_galpon_m2: null,
      area_granja_m2: null,
    });
    const c = await service.generar(14, {});
    expect(c.area_galpon_m2).toBe(500);
    expect(c.numero_galpones).toBe(1);
  });

  it('las aves son las de toda la operacion, no por galpon', async () => {
    const c = await service.generar(14, { numero_galpones: 4 });
    expect(c.numero_aves_estimado).toBe(15000);
    expect(c.plan_recomendado).toBe('Profesional');
  });

  it.each([
    ['<1000', 'Basico'],
    ['1000-5000', 'Basico'],
    ['5000-10000', 'Profesional'],
    ['>10000', 'Profesional'],
  ])('con el rango %s recomienda el plan %s', async (rango, plan) => {
    prisma.prospecto.findUnique.mockResolvedValue({
      ...calificado,
      respuestas: [{ respuesta_texto: rango }],
    });
    const c = await service.generar(14, {});
    expect(c.plan_recomendado).toBe(plan);
  });

  it('los sensores con cobertura escalan con el area del galpon', async () => {
    const c = await service.generar(14, { numero_galpones: 2 });
    expect(lineaDe(c, 'temperatura_humedad').cantidad).toBe(20);
  });

  it('los sensores sin cobertura van uno por galpon', async () => {
    const c = await service.generar(14, { numero_galpones: 3 });
    expect(lineaDe(c, 'nodo_esp32').cantidad).toBe(3);
  });

  it('no cobra un sensor extra por un excedente menor al 5%', async () => {
    prisma.prospecto.findUnique.mockResolvedValue({
      ...calificado,
      area_galpon_m2: 1200.5,
    });
    const c = await service.generar(14, { numero_galpones: 1 });
    expect(lineaDe(c, 'temperatura_humedad').cantidad).toBe(10);
  });

  it('si cobra el sensor extra cuando el excedente es real', async () => {
    prisma.prospecto.findUnique.mockResolvedValue({
      ...calificado,
      area_galpon_m2: 1320,
    });
    const c = await service.generar(14, { numero_galpones: 1 });
    expect(lineaDe(c, 'temperatura_humedad').cantidad).toBe(11);
  });

  it('excluye los opcionales salvo que se pidan', async () => {
    await service.generar(14, {});
    expect(prisma.catalogoSensor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { activo: true, obligatorio: true } }),
    );

    jest.clearAllMocks();
    prisma.prospecto.findUnique.mockResolvedValue(calificado);
    prisma.catalogoSensor.findMany.mockResolvedValue(CATALOGO);
    prisma.$transaction.mockResolvedValue({ id: 1, codigo: 'COT-14-XYZ' });

    await service.generar(14, { incluir_opcionales: true });
    expect(prisma.catalogoSensor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { activo: true } }),
    );
  });

  it('el total suma los sensores mas la instalacion por galpon', async () => {
    const c = await service.generar(14, { numero_galpones: 2 });

    const sensores = c.lineas.reduce((s, l) => s + l.subtotal_cop, 0);
    expect(c.instalacion_cop).toBe(800000);
    expect(c.valor_total_cop).toBe(sensores + 800000);
  });

  it('advierte que los valores son de referencia', async () => {
    const c = await service.generar(14, {});
    expect(c.nota).toMatch(/asesor/);
  });
});
