import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AnomaliasService } from './anomalias.service';
import { ClienteMlService } from './cliente-ml.service';
import { CurvaCrecimientoService } from './curva-crecimiento.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';

describe('AnomaliasService', () => {
  let service: AnomaliasService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    consumoDiario: { findMany: jest.fn() },
    registroMortalidad: { findMany: jest.fn() },
  };
  const clienteMl = { llamar: jest.fn(), leerJson: jest.fn() };
  const curva = { pesajesPorDia: jest.fn(), curvaGenetica: jest.fn() };

  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };
  const ingreso = new Date('2026-10-01T00:00:00.000Z');
  const lote = {
    codigo: 'LOT-1',
    fecha_ingreso: ingreso,
    cantidad_inicial: 1000,
    sexo: 'mixto',
    linea_genetica_id: 1,
    galpon: { granja: { propietario_id: 5 } },
  };
  const respuestaMl = {
    anomalias: [
      {
        tipo: 'caida_consumo',
        severidad: 'alta',
        dia: 28,
        mensaje: 'El consumo bajó',
      },
    ],
    resumen: { total: 1, severidad_maxima: 'alta' },
    modelo: { nombre: 'anomalias_lote', version: '1.0.0' },
  };

  const enviado = () =>
    (clienteMl.llamar.mock.calls[0] as [string, Record<string, unknown>])[1];

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomaliasService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClienteMlService, useValue: clienteMl },
        { provide: CurvaCrecimientoService, useValue: curva },
      ],
    }).compile();
    service = module.get(AnomaliasService);

    prisma.lote.findUnique.mockResolvedValue(lote);
    curva.pesajesPorDia.mockResolvedValue([{ dia: 7, peso: 180 }]);
    curva.curvaGenetica.mockResolvedValue({
      puntos: [{ dia: 7, peso: 190 }],
    });
    prisma.consumoDiario.findMany.mockResolvedValue([]);
    prisma.registroMortalidad.findMany.mockResolvedValue([]);
    clienteMl.llamar.mockResolvedValue({ ok: true });
    clienteMl.leerJson.mockResolvedValue(respuestaMl);
  });

  it('arma las series del lote, llama al ML y devuelve las alertas', async () => {
    prisma.consumoDiario.findMany.mockResolvedValue([
      { fecha: new Date('2026-10-02T00:00:00.000Z'), alimento_kg: 10 },
      { fecha: new Date('2026-10-03T00:00:00.000Z'), alimento_kg: 15 },
    ]);
    prisma.registroMortalidad.findMany.mockResolvedValue([
      { fecha: new Date('2026-10-02T00:00:00.000Z'), cantidad_aves: 5 },
      { fecha: new Date('2026-10-03T00:00:00.000Z'), cantidad_aves: 5 },
    ]);

    const resultado = await service.calcular(1, propietario);

    expect(clienteMl.llamar).toHaveBeenCalledWith(
      '/anomalias',
      expect.any(Object),
    );
    expect(enviado()).toMatchObject({
      pesajes: [{ dia: 7, peso: 180 }],
      consumos: [
        { dia: 2, consumo_acum_kg: 10 },
        { dia: 3, consumo_acum_kg: 25 },
      ],
      mortalidades: [
        { dia: 2, mortalidad_pct: 0.5 },
        { dia: 3, mortalidad_pct: 1 },
      ],
      curva_referencia: [{ dia: 7, peso: 190 }],
    });
    expect(resultado).toMatchObject({
      lote_id: 1,
      codigo: 'LOT-1',
      resumen: { total: 1, severidad_maxima: 'alta' },
    });
    expect(resultado.anomalias).toHaveLength(1);
  });

  it('no envía pesajes imposibles al ML', async () => {
    curva.pesajesPorDia.mockResolvedValue([
      { dia: 7, peso: 180 },
      { dia: 14, peso: 99999 },
    ]);

    await service.calcular(1, propietario);

    expect(enviado().pesajes).toEqual([{ dia: 7, peso: 180 }]);
  });

  it('404 si el lote no existe y 403 si es de otro propietario', async () => {
    prisma.lote.findUnique.mockResolvedValueOnce(null);
    await expect(service.calcular(1, propietario)).rejects.toThrow(
      NotFoundException,
    );

    prisma.lote.findUnique.mockResolvedValueOnce({
      ...lote,
      galpon: { granja: { propietario_id: 99 } },
    });
    await expect(service.calcular(1, propietario)).rejects.toThrow(
      ForbiddenException,
    );
    expect(clienteMl.llamar).not.toHaveBeenCalled();
  });

  it('422 si el lote no tiene ningún registro que revisar', async () => {
    curva.pesajesPorDia.mockResolvedValue([]);

    await expect(service.calcular(1, propietario)).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(clienteMl.llamar).not.toHaveBeenCalled();
  });

  it('400 si el ML no responde, rechaza los datos o devuelve algo inválido', async () => {
    clienteMl.llamar.mockResolvedValueOnce(null);
    await expect(service.calcular(1, propietario)).rejects.toThrow(
      BadRequestException,
    );

    clienteMl.llamar.mockResolvedValueOnce({ ok: false });
    await expect(service.calcular(1, propietario)).rejects.toThrow(/rechazó/);

    clienteMl.leerJson.mockResolvedValueOnce({
      anomalias: [{ tipo: 'x', severidad: 'extrema', dia: 1, mensaje: 'm' }],
      resumen: { total: 1, severidad_maxima: 'alta' },
      modelo: { nombre: 'a', version: '1' },
    });
    await expect(service.calcular(1, propietario)).rejects.toThrow(/inválida/);
  });
});
