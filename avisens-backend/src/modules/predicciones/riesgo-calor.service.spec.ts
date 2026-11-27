import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RiesgoCalorService } from './riesgo-calor.service';
import { ClienteMlService } from './cliente-ml.service';
import { PronosticoClimaService } from './pronostico-clima.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';

describe('RiesgoCalorService', () => {
  let service: RiesgoCalorService;

  type ConsultaPromedio = {
    where: {
      sensor: { galpon_id: number; tipo: string };
      calidad: string;
      fecha_hora: { gte: Date };
    };
  };

  const prisma = {
    galpon: { findUnique: jest.fn() },
    lote: { findFirst: jest.fn() },
    medicion: {
      aggregate: jest.fn<
        Promise<{ _avg: { valor: number | null } }>,
        [ConsultaPromedio]
      >(),
    },
  };
  const clienteMl = { llamar: jest.fn(), leerJson: jest.fn() };
  const pronostico = { coordenadas: jest.fn(), proximasHoras: jest.fn() };

  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };
  const horas = [
    { hora: '2026-10-18T13:00', temperatura: 30, humedad: 60 },
    { hora: '2026-10-18T14:00', temperatura: 33, humedad: 70 },
  ];
  const respuestaMl = {
    serie: [{ hora: '2026-10-18T14:00', thi: 34.8, nivel: 'alerta' }],
    pico: { hora: '2026-10-18T14:00', thi: 34.8, nivel: 'alerta' },
    nivel_maximo: 'alerta',
    modelo: { nombre: 'estres_calor_thi', version: '1.0.0' },
  };

  const promedios = (temperatura: number | null, humedad: number | null) => {
    prisma.medicion.aggregate.mockImplementation(({ where }) =>
      Promise.resolve({
        _avg: {
          valor: where.sensor.tipo === 'temperatura' ? temperatura : humedad,
        },
      }),
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.galpon.findUnique.mockResolvedValue({
      nombre: 'Galpón 1',
      granja: {
        propietario_id: 5,
        latitud: null,
        longitud: null,
        municipio: 'Rionegro',
        departamento: 'Antioquia',
      },
    });
    prisma.lote.findFirst.mockResolvedValue({
      codigo: 'LOT-1',
      fecha_ingreso: new Date('2026-10-10T00:00:00.000Z'),
    });
    promedios(32.5, 75);
    pronostico.coordenadas.mockResolvedValue({
      latitud: 6.15,
      longitud: -75.37,
      origen: 'municipio',
    });
    pronostico.proximasHoras.mockResolvedValue(horas);
    clienteMl.llamar.mockResolvedValue({ ok: true });
    clienteMl.leerJson.mockResolvedValue(respuestaMl);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiesgoCalorService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClienteMlService, useValue: clienteMl },
        { provide: PronosticoClimaService, useValue: pronostico },
      ],
    }).compile();
    service = module.get(RiesgoCalorService);
  });

  it('ajusta el pronostico con los sensores del galpon y pasa el dia de vida', async () => {
    const r = await service.calcular(1, propietario);

    const [ruta, cuerpo] = clienteMl.llamar.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(ruta).toBe('/riesgo-calor');
    expect(cuerpo.horas).toEqual(horas);
    expect(cuerpo.ajuste_temperatura).toBe(2.5);
    expect(cuerpo.ajuste_humedad).toBe(15);
    expect(typeof cuerpo.dia_vida).toBe('number');
    expect(r).toMatchObject({
      galpon_id: 1,
      galpon: 'Galpón 1',
      lote: { codigo: 'LOT-1' },
      ubicacion: { origen: 'municipio' },
      interior: { temperatura: 32.5, humedad: 75 },
      nivel_maximo: 'alerta',
      pico: { thi: 34.8 },
    });
  });

  it('solo promedia lecturas recientes y validas de los sensores del galpon', async () => {
    await service.calcular(1, propietario);

    const { where } = prisma.medicion.aggregate.mock.calls[0][0];
    expect(where.sensor.galpon_id).toBe(1);
    expect(where.calidad).toBe('ok');
    const antiguedad = Date.now() - where.fecha_hora.gte.getTime();
    expect(antiguedad).toBeGreaterThanOrEqual(60 * 60 * 1000);
    expect(antiguedad).toBeLessThan(61 * 60 * 1000);
  });

  it('sin lecturas recientes no ajusta y sin lote no envia dia de vida', async () => {
    promedios(null, null);
    prisma.lote.findFirst.mockResolvedValue(null);

    const r = await service.calcular(1, propietario);

    expect(clienteMl.llamar).toHaveBeenCalledWith('/riesgo-calor', {
      horas,
      ajuste_temperatura: 0,
      ajuste_humedad: 0,
      dia_vida: null,
    });
    expect(r.lote).toBeNull();
  });

  it('404 si el galpon no existe', async () => {
    prisma.galpon.findUnique.mockResolvedValue(null);

    await expect(service.calcular(9, propietario)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('403 si el galpon es de otro propietario', async () => {
    await expect(
      service.calcular(1, { id: 6, rol: ROLES.PROPIETARIO }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(pronostico.coordenadas).not.toHaveBeenCalled();
  });

  it('422 sin_ubicacion si la granja no tiene municipio ni coordenadas', async () => {
    pronostico.coordenadas.mockResolvedValue(null);

    const error = await service
      .calcular(1, propietario)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toMatchObject(
      {
        codigo: 'sin_ubicacion',
      },
    );
  });

  it('400 si el pronostico no responde', async () => {
    pronostico.proximasHoras.mockResolvedValue(null);

    await expect(service.calcular(1, propietario)).rejects.toThrow(
      'El pronóstico del clima no respondió',
    );
    expect(clienteMl.llamar).not.toHaveBeenCalled();
  });

  it('distingue cuando el ML no responde, rechaza o devuelve basura', async () => {
    clienteMl.llamar.mockResolvedValueOnce(null);
    await expect(service.calcular(1, propietario)).rejects.toThrow(
      'no respondió',
    );

    clienteMl.llamar.mockResolvedValueOnce({ ok: false });
    await expect(service.calcular(1, propietario)).rejects.toThrow(
      'rechazó los datos del galpón',
    );

    clienteMl.leerJson.mockResolvedValueOnce({ serie: [] });
    await expect(service.calcular(1, propietario)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
