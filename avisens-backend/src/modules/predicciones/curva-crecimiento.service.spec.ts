import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CurvaCrecimientoService,
  estandarEnDia,
} from './curva-crecimiento.service';
import { ClienteMlService } from './cliente-ml.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';

type CuerpoMl = Record<string, unknown>;

describe('CurvaCrecimientoService', () => {
  let service: CurvaCrecimientoService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    pesaje: { findMany: jest.fn() },
    curvaGeneticaVersion: { findFirst: jest.fn() },
    curvaObjetivo: { findMany: jest.fn() },
    planLote: { findFirst: jest.fn() },
  };
  const clienteMl = { llamar: jest.fn(), leerJson: jest.fn() };

  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };
  const ingreso = new Date('2026-10-01T00:00:00.000Z');

  const lote = (cambios: Record<string, unknown> = {}) => ({
    codigo: 'LOT-1',
    fecha_ingreso: ingreso,
    sexo: 'mixto',
    marca_alimento: 'italcol',
    linea_genetica_id: 1,
    galpon: { granja: { propietario_id: 5 } },
    ...cambios,
  });

  const pesaje = (fecha: string, peso: number) => ({
    fecha: new Date(`${fecha}T00:00:00.000Z`),
    peso_promedio_g: peso,
  });

  const respuestaMl = (
    diaFinal: number,
    diaAlObjetivo: number | null = 40.2,
  ) => ({
    serie: Array.from({ length: diaFinal }, (_, i) => ({
      dia: i + 1,
      peso_g: 100 + i,
      min_g: 90 + i,
      max_g: 110 + i,
    })),
    peso_final_g: 100 + diaFinal - 1,
    dia_al_objetivo: diaAlObjetivo,
    punto_inflexion: { dia: 31, peso_g: 2000, ganancia_max_g_dia: 100 },
    modelo: {
      nombre: 'crecimiento_gompertz',
      version: '2.0.0',
      confianza: 0.87,
      puntos_usados: 2,
    },
  });

  const cuerpoEnviado = (): CuerpoMl =>
    (clienteMl.llamar.mock.calls[0] as [string, CuerpoMl])[1];

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurvaCrecimientoService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClienteMlService, useValue: clienteMl },
      ],
    }).compile();
    service = module.get(CurvaCrecimientoService);

    prisma.lote.findUnique.mockResolvedValue(lote());
    prisma.pesaje.findMany.mockResolvedValue([
      pesaje('2026-10-07', 200),
      pesaje('2026-10-07', 220),
      pesaje('2026-10-14', 510),
    ]);
    prisma.curvaGeneticaVersion.findFirst.mockResolvedValue({
      version: 1,
      fuente: 'aviagen-ross308-po-2022',
      linea_genetica: { nombre: 'Ross 308' },
      puntos: [
        { dia: 7, peso_esperado_g: new Prisma.Decimal(213) },
        { dia: 14, peso_esperado_g: new Prisma.Decimal(533) },
      ],
    });
    prisma.curvaObjetivo.findMany.mockResolvedValue([
      { dia: 7, peso_esperado_g: 211 },
    ]);
    prisma.planLote.findFirst.mockResolvedValue({
      dia_objetivo: 40,
      peso_objetivo_g: new Prisma.Decimal(2800),
    });
    clienteMl.llamar.mockResolvedValue({ ok: true });
    clienteMl.leerJson.mockImplementation(() =>
      Promise.resolve(respuestaMl(40)),
    );
  });

  it('responde 404 si el lote no existe, sin llamar al ML', async () => {
    prisma.lote.findUnique.mockResolvedValue(null);

    await expect(service.calcular(99, propietario)).rejects.toThrow(
      NotFoundException,
    );
    expect(clienteMl.llamar).not.toHaveBeenCalled();
  });

  it('impide que un propietario consulte el lote de otro', async () => {
    prisma.lote.findUnique.mockResolvedValue(
      lote({ galpon: { granja: { propietario_id: 8 } } }),
    );

    await expect(service.calcular(1, propietario)).rejects.toThrow(
      ForbiddenException,
    );
    expect(clienteMl.llamar).not.toHaveBeenCalled();
  });

  it('responde 422 sin_pesajes cuando el lote no tiene pesajes validos', async () => {
    prisma.pesaje.findMany.mockResolvedValue([pesaje('2026-09-30', 40)]);

    const error: unknown = await service
      .calcular(1, propietario)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toMatchObject(
      { codigo: 'sin_pesajes' },
    );
    expect(clienteMl.llamar).not.toHaveBeenCalled();
  });

  it('envia al ML los pesajes por dia, el ancla genetica y el objetivo del plan', async () => {
    await service.calcular(1, propietario);

    expect(clienteMl.llamar).toHaveBeenCalledWith(
      '/curva-crecimiento',
      expect.any(Object),
    );
    expect(cuerpoEnviado()).toEqual({
      pesajes: [
        { dia: 7, peso: 210 },
        { dia: 14, peso: 510 },
      ],
      dia_final: 40,
      curva_referencia: [
        { dia: 7, peso: 213 },
        { dia: 14, peso: 533 },
      ],
      peso_objetivo_g: 2800,
    });
  });

  it('busca la curva genetica vigente de la linea y el sexo del lote', async () => {
    prisma.lote.findUnique.mockResolvedValue(lote({ sexo: null }));

    await service.calcular(1, propietario);

    expect(prisma.curvaGeneticaVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { linea_genetica_id: 1, sexo: 'mixto', vigente: true },
      }),
    );
  });

  it('sin plan proyecta hasta el dia 42 y sin objetivo', async () => {
    prisma.planLote.findFirst.mockResolvedValue(null);
    clienteMl.leerJson.mockResolvedValue(respuestaMl(42, null));

    const r = await service.calcular(1, propietario);

    expect(cuerpoEnviado()).toMatchObject({
      dia_final: 42,
      peso_objetivo_g: null,
    });
    expect(r.resumen.fecha_al_objetivo).toBeNull();
  });

  it('siempre proyecta al menos un dia despues del ultimo pesaje', async () => {
    prisma.planLote.findFirst.mockResolvedValue({
      dia_objetivo: 10,
      peso_objetivo_g: new Prisma.Decimal(2800),
    });
    clienteMl.leerJson.mockResolvedValue(respuestaMl(15));

    await service.calcular(1, propietario);

    expect(cuerpoEnviado()).toMatchObject({ dia_final: 15 });
  });

  it('sin linea genetica no envia ancla y lo informa en las referencias', async () => {
    prisma.lote.findUnique.mockResolvedValue(lote({ linea_genetica_id: null }));

    const r = await service.calcular(1, propietario);

    expect(prisma.curvaGeneticaVersion.findFirst).not.toHaveBeenCalled();
    expect(cuerpoEnviado()).toMatchObject({ curva_referencia: [] });
    expect(r.referencias.genetica).toBeNull();
    expect(r.resumen.desvio_vs_estandar_pct).toBeNull();
  });

  it('une en una sola serie el real, la proyeccion, el estandar y la marca', async () => {
    const r = await service.calcular(1, propietario);

    expect(r.serie).toHaveLength(40);
    expect(r.serie[6]).toEqual({
      dia: 7,
      real_g: 210,
      proyectado_g: 106,
      min_g: 96,
      max_g: 116,
      estandar_g: 213,
      marca_g: 211,
    });
    expect(r.serie[7]).toMatchObject({
      real_g: null,
      estandar_g: null,
      marca_g: null,
    });
    expect(r.referencias).toEqual({
      genetica: {
        linea: 'Ross 308',
        sexo: 'mixto',
        version: 1,
        fuente: 'aviagen-ross308-po-2022',
      },
      marca: { marca: 'italcol' },
    });
  });

  it('resume el desvio frente al estandar y la fecha de llegada al objetivo', async () => {
    const r = await service.calcular(1, propietario);

    expect(r.resumen).toEqual({
      ultimo_pesaje: { dia: 14, peso_g: 510 },
      desvio_vs_estandar_pct: -4.3,
      peso_final_g: 139,
      dia_al_objetivo: 40.2,
      fecha_al_objetivo: new Date('2026-11-10T00:00:00.000Z'),
      punto_inflexion: { dia: 31, peso_g: 2000, ganancia_max_g_dia: 100 },
    });
    expect(r.modelo.nombre).toBe('crecimiento_gompertz');
  });

  it('responde 422 con el pesaje imposible, sin llamar al ML', async () => {
    prisma.pesaje.findMany.mockResolvedValue([pesaje('2026-10-02', 21000)]);

    await expect(service.calcular(1, propietario)).rejects.toThrow(
      'El pesaje del día 2 de vida marca 21.000 g por ave, que no es posible. Corrígelo en la Bitácora para ver la curva.',
    );
    expect(clienteMl.llamar).not.toHaveBeenCalled();
  });

  it('rechaza un pesaje imposible para la edad, comparado con la curva genética', async () => {
    prisma.pesaje.findMany.mockResolvedValue([pesaje('2026-10-07', 2100)]);

    await expect(service.calcular(1, propietario)).rejects.toThrow(
      'El pesaje del día 7 de vida marca 2.100 g por ave, pero a esa edad un Ross 308 pesa cerca de 213 g. Revísalo en la Bitácora para ver la curva.',
    );
    expect(clienteMl.llamar).not.toHaveBeenCalled();
  });

  it('acepta lotes atrasados o adelantados dentro de un margen realista', async () => {
    prisma.pesaje.findMany.mockResolvedValue([
      pesaje('2026-10-07', 140),
      pesaje('2026-10-14', 800),
    ]);

    await expect(service.calcular(1, propietario)).resolves.toBeDefined();
  });

  it('interpola el estándar entre dos días de la curva', () => {
    const puntos = [
      { dia: 7, peso: 200 },
      { dia: 14, peso: 550 },
    ];
    expect(estandarEnDia(puntos, 7)).toBe(200);
    expect(estandarEnDia(puntos, 10)).toBe(350);
    expect(estandarEnDia(puntos, 2)).toBeNull();
    expect(estandarEnDia(puntos, 20)).toBeNull();
  });

  it('distingue un ML que rechaza los datos de uno que no contesta', async () => {
    clienteMl.llamar.mockResolvedValue({ ok: false });

    await expect(service.calcular(1, propietario)).rejects.toThrow(
      'El servicio de predicción rechazó los datos del lote',
    );
  });

  it('responde 400 si el ML no contesta', async () => {
    clienteMl.llamar.mockResolvedValue(null);

    await expect(service.calcular(1, propietario)).rejects.toThrow(
      new BadRequestException('El servicio de predicción no respondió'),
    );
  });

  it('responde 400 si el ML devuelve una serie incompleta o invalida', async () => {
    const incompleta = respuestaMl(39);
    const conNaN = respuestaMl(40);
    conNaN.serie[3].peso_g = Number.NaN;

    for (const cuerpo of [incompleta, conNaN, null, { serie: 'x' }]) {
      clienteMl.leerJson.mockResolvedValue(cuerpo);
      await expect(service.calcular(1, propietario)).rejects.toThrow(
        'El servicio de predicción devolvió una respuesta inválida',
      );
    }
  });
});
