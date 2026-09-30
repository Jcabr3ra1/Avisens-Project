import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IndicadoresService } from './indicadores.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { inicioDelDiaEnZonaGranja } from '../../common/fechas/dias-de-vida';

// Compartido: ninguna de las pruebas de este archivo fija el umbral (esa
// decision sigue pendiente), asi que ConfigService.get siempre devuelve
// undefined salvo que una prueba puntual lo pise con mockReturnValueOnce.
const configSinUmbral = { get: jest.fn().mockReturnValue(undefined) };

describe('IndicadoresService · calcularParaLote', () => {
  let service: IndicadoresService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    pesaje: { findFirst: jest.fn() },
    consumoDiario: { aggregate: jest.fn() },
    registroMortalidad: { findMany: jest.fn() },
    indicadorLote: { upsert: jest.fn(), findFirst: jest.fn() },
    curvaObjetivo: { findFirst: jest.fn() },
  };

  const guardadoDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<
      [{ create: Record<string, unknown> }]
    >;
    return calls[0][0].create;
  };

  const actualizadoDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<
      [{ update: Record<string, unknown> }]
    >;
    return calls[0][0].update;
  };

  // fecha_ingreso/pesaje.fecha/registro_mortalidad.fecha son @db.Date: dias
  // de calendario de la granja, sin hora. Restar N*86400000 a Date.now() y
  // dejarlo asi conserva la hora actual -- cerca de medianoche UTC, cuando
  // la zona de la granja (UTC-5) ya esta en el dia de calendario anterior,
  // eso hace que "ayer" (con hora) quede DESPUES de "hoy" (medianoche pura),
  // y el pesaje se clasifica como pesaje_fecha_futura. Normalizar con
  // inicioDelDiaEnZonaGranja (la misma funcion que usa el servicio para
  // "hoy") lo evita: Bogota no tiene horario de verano, asi que restar horas
  // exactas y normalizar el resultado siempre da el dia de calendario
  // correcto, sin importar la hora real en que corra la prueba.
  const diaRelativo = (deltaDias: number) =>
    inicioDelDiaEnZonaGranja(
      new Date(Date.now() + deltaDias * 24 * 60 * 60 * 1000),
    );
  const hace = (dias: number) => diaRelativo(-dias);
  const enDias = (dias: number) => diaRelativo(dias);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicadoresService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configSinUmbral },
      ],
    }).compile();
    service = module.get<IndicadoresService>(IndicadoresService);
    prisma.indicadorLote.upsert.mockResolvedValue({});
    prisma.registroMortalidad.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  it('calcula el FCR y la mortalidad de un lote con datos', async () => {
    prisma.lote.findUnique.mockResolvedValue({
      id: 1,
      fecha_ingreso: hace(21),
      cantidad_inicial: 1000,
      sexo: 'macho',
    });
    prisma.pesaje.findFirst.mockResolvedValue({
      id: 5,
      fecha: hace(1),
      peso_promedio_g: 1000,
    });
    prisma.consumoDiario.aggregate.mockResolvedValue({
      _sum: { alimento_kg: 1150 },
    });
    prisma.registroMortalidad.findMany.mockResolvedValue([
      { fecha: hace(10), cantidad_aves: 30 },
    ]);

    await service.calcularParaLote(1);

    const guardado = guardadoDe(prisma.indicadorLote.upsert);
    expect(guardado.estado_calculo).toBe('calculado');
    expect(guardado.estado_peso).toBe('disponible');
    expect(guardado.pesaje_id_snapshot).toBe(5);
    // 1150 / (1000g/1000 * 970 aves vivas) = 1.185567... -- sin restar
    // PESO_INICIAL_G, coincide con la curva Italcol
    // (docs/hito-fcr-epef-corte-pesaje.md). Precision 3 (no 1): a
    // precision 1 tanto esta formula como la vieja (restando 42g, que da
    // 1150/929.26=1.237577) caen dentro del margen de 1.19 -- no
    // discriminaba nada.
    expect(guardado.fcr as number).toBeCloseTo(1.1856, 3);
    // Control negativo: si alguien reintrodujera la resta de
    // PESO_INICIAL_G, este valor (1150/((1000-42)/1000*970)) seria el
    // resultado -- y NO debe pasar.
    expect(guardado.fcr as number).not.toBeCloseTo(1.2376, 3);
    expect(guardado.mortalidad_acumulada_pct as number).toBeCloseTo(3, 1);
    expect(guardado.peso_promedio_g).toBe(1000);
  });

  it('desempata el ultimo pesaje por id -- fecha es solo el dia, varios pesajes del mismo dia empatan', async () => {
    prisma.lote.findUnique.mockResolvedValue({
      id: 1,
      fecha_ingreso: hace(21),
      cantidad_inicial: 1000,
      sexo: 'macho',
    });
    prisma.pesaje.findFirst.mockResolvedValue({
      id: 5,
      fecha: hace(1),
      peso_promedio_g: 1000,
    });
    prisma.consumoDiario.aggregate.mockResolvedValue({
      _sum: { alimento_kg: 1150 },
    });
    prisma.registroMortalidad.findMany.mockResolvedValue([
      { fecha: hace(10), cantidad_aves: 30 },
    ]);

    await service.calcularParaLote(1);

    const calls = prisma.pesaje.findFirst.mock.calls as Array<
      [{ orderBy: unknown }]
    >;
    expect(calls[0][0].orderBy).toEqual([{ fecha: 'desc' }, { id: 'desc' }]);
  });

  it('deja el FCR en null y estado_peso en sin_pesaje cuando el lote no tiene pesajes', async () => {
    prisma.lote.findUnique.mockResolvedValue({
      id: 1,
      fecha_ingreso: hace(10),
      cantidad_inicial: 1000,
      sexo: 'macho',
    });
    prisma.pesaje.findFirst.mockResolvedValue(null);
    prisma.consumoDiario.aggregate.mockResolvedValue({
      _sum: { alimento_kg: 500 },
    });

    await service.calcularParaLote(1);

    const guardado = guardadoDe(prisma.indicadorLote.upsert);
    expect(guardado.fcr).toBeNull();
    expect(guardado.estado_peso).toBe('sin_pesaje');
    expect(guardado.pesaje_id_snapshot).toBeNull();
    expect(guardado.pesaje_fecha_snapshot).toBeNull();
  });

  it('lanza NotFound cuando el lote no existe', async () => {
    prisma.lote.findUnique.mockResolvedValue(null);
    await expect(service.calcularParaLote(99)).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('pesaje con fecha futura', () => {
    it('NO se sustituye por uno anterior: peso/fcr/epef en null, pero mortalidad y consumo se calculan igual', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        fecha_ingreso: hace(21),
        cantidad_inicial: 1000,
        sexo: 'macho',
      });
      // El mas reciente por fecha/id es el futuro -- asi lo devolveria
      // Postgres con el orderBy real. No hay "caer" al anterior.
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 9,
        fecha: enDias(5),
        peso_promedio_g: 1200,
      });
      prisma.consumoDiario.aggregate.mockResolvedValue({
        _sum: { alimento_kg: 1150 },
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: hace(10), cantidad_aves: 30 },
      ]);

      await service.calcularParaLote(1);

      const guardado = guardadoDe(prisma.indicadorLote.upsert);
      expect(guardado.estado_calculo).toBe('calculado');
      expect(guardado.estado_peso).toBe('pesaje_fecha_futura');
      expect(guardado.peso_promedio_g).toBeNull();
      expect(guardado.fcr).toBeNull();
      expect(guardado.epef).toBeNull();
      // El snapshot SI apunta al pesaje futuro que bloqueo el calculo --
      // sirve para encontrarlo y corregirlo.
      expect(guardado.pesaje_id_snapshot).toBe(9);
      expect(guardado.mortalidad_acumulada_pct as number).toBeCloseTo(3, 1);
    });
  });

  describe('mortalidad incoherente', () => {
    const prepararLoteBase = () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        fecha_ingreso: hace(21),
        cantidad_inicial: 1000,
        sexo: 'macho',
      });
      prisma.consumoDiario.aggregate.mockResolvedValue({
        _sum: { alimento_kg: 1150 },
      });
    };

    it('mortalidad futura: queda mortalidad_incoherente, sin lanzar, con los derivados en null', async () => {
      prepararLoteBase();
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 5,
        fecha: hace(1),
        peso_promedio_g: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: enDias(5), cantidad_aves: 5 },
      ]);

      await expect(service.calcularParaLote(1)).resolves.not.toThrow();

      const guardado = guardadoDe(prisma.indicadorLote.upsert);
      expect(guardado.estado_calculo).toBe('mortalidad_incoherente');
      expect(guardado.peso_promedio_g).toBeNull();
      expect(guardado.fcr).toBeNull();
      expect(guardado.epef).toBeNull();
      expect(guardado.mortalidad_acumulada_pct).toBeNull();
      expect(guardado.consumo_acumulado_g).toBeNull();
    });

    it('mortalidad que excede cantidad_inicial: tambien mortalidad_incoherente', async () => {
      prepararLoteBase();
      prisma.pesaje.findFirst.mockResolvedValue(null);
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: hace(10), cantidad_aves: 1500 },
      ]);

      await service.calcularParaLote(1);

      expect(guardadoDe(prisma.indicadorLote.upsert).estado_calculo).toBe(
        'mortalidad_incoherente',
      );
    });

    it('mortalidad_incoherente + pesaje disponible: estado_peso disponible, pero el peso NO se publica', async () => {
      prepararLoteBase();
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 5,
        fecha: hace(1),
        peso_promedio_g: 1000,
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: enDias(5), cantidad_aves: 5 },
      ]);

      await service.calcularParaLote(1);

      const guardado = guardadoDe(prisma.indicadorLote.upsert);
      expect(guardado.estado_calculo).toBe('mortalidad_incoherente');
      expect(guardado.estado_peso).toBe('disponible');
      expect(guardado.pesaje_id_snapshot).toBe(5);
      expect(guardado.peso_promedio_g).toBeNull();
    });
  });

  describe('FCR y EPEF al corte del pesaje', () => {
    it('fcr/epef usan SOLO el alimento y las aves vivas hasta el pesaje -- consumo_acumulado_g y mortalidad_acumulada_pct siguen con los de hoy', async () => {
      const fechaIngreso = hace(30);
      const fechaPesaje = hace(9); // dia 22
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        fecha_ingreso: fechaIngreso,
        cantidad_inicial: 1000,
        sexo: 'macho',
      });
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 7,
        fecha: fechaPesaje,
        peso_promedio_g: 1000,
      });
      // Primera llamada (sin filtro, "hoy"): 1500kg. Segunda llamada
      // (fecha <= pesaje): 1000kg -- deben quedar separadas.
      prisma.consumoDiario.aggregate
        .mockResolvedValueOnce({ _sum: { alimento_kg: 1500 } })
        .mockResolvedValueOnce({ _sum: { alimento_kg: 1000 } });
      // Una muerte DESPUES del pesaje (dia 26) pero antes de hoy: cuenta
      // para mortalidad/consumo de hoy, NO para aves vivas al pesaje --
      // es una muerte real, no un dato invalido.
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: hace(5), cantidad_aves: 100 },
      ]);

      await service.calcularParaLote(1);

      const guardado = guardadoDe(prisma.indicadorLote.upsert);
      // fcr = 1000kg / (1000g/1000 * 1000 aves vivas al pesaje) = 1.0
      expect(guardado.fcr as number).toBeCloseTo(1.0, 5);
      // consumo_acumulado_g = 1500kg*1000 / 900 aves vivas HOY = 1666.67
      expect(guardado.consumo_acumulado_g as number).toBeCloseTo(1666.67, 1);
      // mortalidad de HOY (900/1000 vivas -> 10%), no la del pesaje (0%)
      expect(guardado.mortalidad_acumulada_pct as number).toBeCloseTo(10, 5);
      // epef = (100 * 1.0) / (22 * 1.0) * 100
      expect(guardado.epef as number).toBeCloseTo((100 / 22) * 100, 1);

      const llamadas = prisma.consumoDiario.aggregate.mock.calls as Array<
        [{ where: Record<string, unknown> }]
      >;
      expect(llamadas).toHaveLength(2);
      expect(llamadas[0][0].where).toEqual({ lote_id: 1 });
      expect(llamadas[1][0].where).toEqual({
        lote_id: 1,
        fecha: { lte: fechaPesaje },
      });
    });

    it('formula sin restar PESO_INICIAL_G: coincide con la curva Italcol (dia 21 macho)', async () => {
      // consumo 1218g/ave, peso 1035g/ave -> fcr_objetivo publicado 1.18.
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        fecha_ingreso: hace(21),
        cantidad_inicial: 1000,
        sexo: 'macho',
      });
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 8,
        fecha: hace(1),
        peso_promedio_g: 1035,
      });
      prisma.consumoDiario.aggregate
        .mockResolvedValueOnce({ _sum: { alimento_kg: 1218 } })
        .mockResolvedValueOnce({ _sum: { alimento_kg: 1218 } });
      prisma.registroMortalidad.findMany.mockResolvedValue([]);

      await service.calcularParaLote(1);

      const guardado = guardadoDe(prisma.indicadorLote.upsert);
      // 1218/1035 = 1.176812... A precision 1 (margen 0.05), el valor de
      // la formula vieja (1218/993 = 1.226586) tambien queda "cerca" de
      // 1.18 -- no discriminaba nada. Precision 3 (margen 0.0005) si.
      expect(guardado.fcr as number).toBeCloseTo(1.1768, 3);
      // Control negativo: el resultado que daria restando PESO_INICIAL_G.
      expect(guardado.fcr as number).not.toBeCloseTo(1.2266, 3);
    });

    it('sin ningun pesaje: no consulta un segundo alimento acotado', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        fecha_ingreso: hace(10),
        cantidad_inicial: 1000,
        sexo: 'macho',
      });
      prisma.pesaje.findFirst.mockResolvedValue(null);
      prisma.consumoDiario.aggregate.mockResolvedValue({
        _sum: { alimento_kg: 500 },
      });

      await service.calcularParaLote(1);

      expect(prisma.consumoDiario.aggregate).toHaveBeenCalledTimes(1);
    });
  });

  describe('revision_calculo y calculado_en', () => {
    const prepararLoteValido = () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        fecha_ingreso: hace(21),
        cantidad_inicial: 1000,
        sexo: 'macho',
      });
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 5,
        fecha: hace(1),
        peso_promedio_g: 1000,
      });
      prisma.consumoDiario.aggregate.mockResolvedValue({
        _sum: { alimento_kg: 1150 },
      });
      prisma.registroMortalidad.findMany.mockResolvedValue([
        { fecha: hace(10), cantidad_aves: 30 },
      ]);
    };

    it('crea con revision_calculo = 1 y calculado_en presente', async () => {
      prepararLoteValido();
      await service.calcularParaLote(1);

      const guardado = guardadoDe(prisma.indicadorLote.upsert);
      expect(guardado.revision_calculo).toBe(1);
      expect(guardado.calculado_en).toBeInstanceOf(Date);
    });

    it('al actualizar, incrementa revision_calculo y vuelve a escribir calculado_en', async () => {
      prepararLoteValido();
      await service.calcularParaLote(1);

      const actualizado = actualizadoDe(prisma.indicadorLote.upsert);
      expect(actualizado.revision_calculo).toEqual({ increment: 1 });
      expect(actualizado.calculado_en).toBeInstanceOf(Date);
    });
  });

  // El job corre a las 02:00 UTC, que son las 21:00 en la granja: allá
  // todavía es el día anterior. Antes se restaban milisegundos contra la
  // hora del servidor, así que la fila salía estampada con la fecha de
  // mañana y el lote se comparaba contra la curva del día siguiente.
  describe('a la hora en que corre el job', () => {
    const ingreso = new Date('2026-07-30T00:00:00.000Z');

    const prepararLote = () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        fecha_ingreso: ingreso,
        cantidad_inicial: 1000,
        sexo: 'macho',
      });
      // Fecha fija, anterior a los tres "ahora" simulados de estos tests --
      // si el pesaje quedara despues del reloj falso, estado_peso pasaria a
      // pesaje_fecha_futura y confundiria lo que estas pruebas miden.
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 5,
        fecha: new Date('2026-06-01T00:00:00.000Z'),
        peso_promedio_g: 1000,
      });
      prisma.consumoDiario.aggregate.mockResolvedValue({
        _sum: { alimento_kg: 1000 },
      });
    };

    afterEach(() => jest.useRealTimers());

    it('cuenta el día que vive la granja, no el del servidor', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-03T02:00:00.000Z'));
      prepararLote();

      await service.calcularParaLote(1);

      const guardado = guardadoDe(prisma.indicadorLote.upsert);
      // En Colombia son las 21:00 del 2 de septiembre: día 35 de vida.
      expect(guardado.dia_vida).toBe(35);
      expect(guardado.fecha).toEqual(new Date('2026-09-02T00:00:00.000Z'));
    });

    it('cinco horas después ya es el día siguiente', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-03T05:00:00.000Z'));
      prepararLote();

      await service.calcularParaLote(1);

      const guardado = guardadoDe(prisma.indicadorLote.upsert);
      expect(guardado.dia_vida).toBe(36);
      expect(guardado.fecha).toEqual(new Date('2026-09-03T00:00:00.000Z'));
    });

    it('el día de ingreso es el día 1, no el 0', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-07-30T15:00:00.000Z'));
      prepararLote();

      await service.calcularParaLote(1);

      expect(guardadoDe(prisma.indicadorLote.upsert).dia_vida).toBe(1);
    });
  });
});

describe('IndicadoresService · compararConCurva', () => {
  let service: IndicadoresService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    indicadorLote: { findFirst: jest.fn() },
    curvaObjetivo: { findMany: jest.fn() },
  };

  const admin = { id: 1, rol: 'Administrador' };

  const loteConDueno = {
    galpon: { granja: { propietario_id: 1 } },
    sexo: 'macho',
    marca_alimento: 'italcol',
    fecha_ingreso: new Date('2026-08-31T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicadoresService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configSinUmbral },
      ],
    }).compile();
    service = module.get<IndicadoresService>(IndicadoresService);
  });

  afterEach(() => jest.clearAllMocks());

  const filaCalculada = (extra: Record<string, unknown> = {}) => ({
    fecha: new Date('2026-09-20T00:00:00.000Z'),
    estado_calculo: 'calculado',
    estado_peso: 'disponible',
    dia_vida: 21,
    // dia 21 relativo a loteConDueno.fecha_ingreso (2026-08-31): coherente
    // con dia_vida por defecto para no romper implicitamente las pruebas
    // que no les importa la fecha exacta del pesaje.
    pesaje_fecha_snapshot: new Date('2026-09-20T00:00:00.000Z'),
    peso_promedio_g: 1000,
    fcr: 1.2,
    ...extra,
  });

  it('lanza NotFound (sin_indicador) cuando no hay NINGUNA fila de indicador', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.indicadorLote.findFirst.mockResolvedValue(null);
    await expect(service.compararConCurva(1, admin)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('sin_dato_valido cuando hay filas pero ninguna esta calculado -- no retrocede a una vieja', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    // primera llamada: masReciente (sin filtrar) -- existe, pero incoherente
    prisma.indicadorLote.findFirst.mockResolvedValueOnce({
      fecha: new Date('2026-09-20T00:00:00.000Z'),
      estado_calculo: 'mortalidad_incoherente',
      dia_vida: 21,
    });
    // segunda llamada: filtrada por estado_calculo='calculado' -- no hay ninguna
    prisma.indicadorLote.findFirst.mockResolvedValueOnce(null);

    const r = await service.compararConCurva(1, admin);
    expect(r.veredicto).toBe('sin_dato_valido');
    expect(r.estado_actual).toBe('mortalidad_incoherente');
    expect(r.fecha_del_dato_usado).toBeNull();
    expect(r.real).toBeNull();
  });

  it('peso_no_disponible cuando el ultimo calculado no tiene el peso disponible', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    const fila = filaCalculada({ estado_peso: 'pesaje_fecha_futura' });
    prisma.indicadorLote.findFirst.mockResolvedValueOnce(fila); // masReciente
    prisma.indicadorLote.findFirst.mockResolvedValueOnce(fila); // indicador calculado

    const r = await service.compararConCurva(1, admin);
    expect(r.veredicto).toBe('peso_no_disponible');
    expect(r.fecha_del_dato_usado).toEqual(fila.fecha);
    expect(r.real).toBeNull();
    // no debe llegar a consultar la curva -- no hay con que comparar
    expect(prisma.curvaObjetivo.findMany).not.toHaveBeenCalled();
  });

  it.each(['sin_pesaje', 'pesaje_fecha_futura'] as const)(
    'peso_no_disponible informa motivo=%s, el valor exacto de estado_peso',
    async (estadoPeso) => {
      prisma.lote.findUnique.mockResolvedValue(loteConDueno);
      const fila = filaCalculada({
        estado_peso: estadoPeso,
        peso_promedio_g: null,
        fcr: null,
      });
      prisma.indicadorLote.findFirst.mockResolvedValueOnce(fila);
      prisma.indicadorLote.findFirst.mockResolvedValueOnce(fila);

      const r = await service.compararConCurva(1, admin);
      if (r.veredicto !== 'peso_no_disponible') throw new Error('unreachable');
      expect(r.motivo).toBe(estadoPeso);
      expect(prisma.curvaObjetivo.findMany).not.toHaveBeenCalled();
    },
  );

  it('sin_pesaje y pesaje_fecha_futura producen motivos distintos, no uno generico', async () => {
    const motivos: unknown[] = [];
    for (const estadoPeso of ['sin_pesaje', 'pesaje_fecha_futura']) {
      prisma.lote.findUnique.mockResolvedValue(loteConDueno);
      const fila = filaCalculada({ estado_peso: estadoPeso });
      prisma.indicadorLote.findFirst.mockResolvedValueOnce(fila);
      prisma.indicadorLote.findFirst.mockResolvedValueOnce(fila);
      const r = await service.compararConCurva(1, admin);
      if (r.veredicto !== 'peso_no_disponible') throw new Error('unreachable');
      motivos.push(r.motivo);
    }
    expect(motivos).toEqual(['sin_pesaje', 'pesaje_fecha_futura']);
  });

  it('H1: compara contra la curva del dia en que se peso, no el dia de vida de hoy', async () => {
    // dia_vida=21 es el dia de HOY (cuando se calculo la fila). El pesaje
    // usado es del dia 14 -- si se comparara contra el dia 21 (el bug de
    // H1), un peso identico al esperado el dia 14 saldria "por_debajo"
    // porque el dia 21 espera mas.
    prisma.lote.findUnique.mockResolvedValue(loteConDueno); // ingreso 2026-08-31
    prisma.indicadorLote.findFirst.mockResolvedValue(
      filaCalculada({
        dia_vida: 21,
        pesaje_fecha_snapshot: new Date('2026-09-13T00:00:00.000Z'), // dia 14
        peso_promedio_g: 535,
      }),
    );
    prisma.curvaObjetivo.findMany.mockResolvedValue([
      { dia: 7, peso_esperado_g: 211, fcr_objetivo: 1.0 },
      { dia: 14, peso_esperado_g: 535, fcr_objetivo: 1.1 },
      { dia: 21, peso_esperado_g: 1035, fcr_objetivo: 1.18 },
      { dia: 42, peso_esperado_g: 2900, fcr_objetivo: 1.9 },
    ]);

    const r = await service.compararConCurva(1, admin);

    expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);

    // dia_vida en la respuesta conserva su significado anterior: el dia
    // del indicador (hoy), no el dia del pesaje usado para la curva.
    expect(r.dia_vida).toBe(21);
    // fecha_pesaje_usado es la fecha real del pesaje (dia 14) -- distinta
    // de fecha_del_dato_usado, que es el dia del indicador (hoy).
    expect(r.fecha_pesaje_usado).toEqual(new Date('2026-09-13T00:00:00.000Z'));
    expect(r.veredicto).toBe('en_objetivo');
    if (r.veredicto !== 'en_objetivo') throw new Error('unreachable');
    // El punto usado SI corresponde al dia del pesaje (14), no a dia_vida
    // (21): con una sola lectura de toda la curva, la seleccion ocurre en
    // memoria, asi que se verifica en el punto usado (dia_curva), no en
    // el filtro de la consulta.
    expect(r.dia_curva).toBe(14);
    expect(r.desvio_peso_pct as number).toBeCloseTo(0, 5);
  });

  describe('R2: limites de la curva (dia 7 a 42, Italcol/Solla)', () => {
    // fecha_ingreso de loteConDueno: 2026-08-31 (dia 1).
    const fechaDelDia = (dia: number) =>
      new Date(
        new Date('2026-08-31T00:00:00.000Z').getTime() +
          (dia - 1) * 24 * 60 * 60 * 1000,
      );

    // Los 4 puntos publicados: rango y punto salen de la MISMA lectura
    // (findMany), nunca de dos consultas separadas.
    const curvaCompleta = [
      { dia: 7, peso_esperado_g: 211, fcr_objetivo: 1.0 },
      { dia: 14, peso_esperado_g: 535, fcr_objetivo: 1.1 },
      { dia: 21, peso_esperado_g: 1035, fcr_objetivo: 1.18 },
      { dia: 42, peso_esperado_g: 2900, fcr_objetivo: 1.9 },
    ];

    it('dia exactamente en el minimo (7) sigue el camino normal, no sin_curva_para_dia', async () => {
      prisma.lote.findUnique.mockResolvedValue(loteConDueno);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        filaCalculada({ pesaje_fecha_snapshot: fechaDelDia(7) }),
      );
      prisma.curvaObjetivo.findMany.mockResolvedValue(curvaCompleta);

      const r = await service.compararConCurva(1, admin);
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
      expect(r.veredicto).not.toBe('sin_curva_para_dia');
    });

    it('dia exactamente en el maximo (42) sigue el camino normal, no sin_curva_para_dia', async () => {
      prisma.lote.findUnique.mockResolvedValue(loteConDueno);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        filaCalculada({ pesaje_fecha_snapshot: fechaDelDia(42) }),
      );
      prisma.curvaObjetivo.findMany.mockResolvedValue(curvaCompleta);

      const r = await service.compararConCurva(1, admin);
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
      expect(r.veredicto).not.toBe('sin_curva_para_dia');
    });

    it('dia 3 (antes del primer punto): sin_curva_para_dia', async () => {
      prisma.lote.findUnique.mockResolvedValue(loteConDueno);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        filaCalculada({ pesaje_fecha_snapshot: fechaDelDia(3) }),
      );
      prisma.curvaObjetivo.findMany.mockResolvedValue(curvaCompleta);

      const r = await service.compararConCurva(1, admin);
      expect(r.veredicto).toBe('sin_curva_para_dia');
      // la lectura SI ocurre -- rango y punto vienen de ella. Lo que no
      // ocurre es una SEGUNDA consulta para buscar el punto.
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
    });

    it('E9 -- dia 45 (despues del ultimo punto): sin_curva_para_dia, no se extrapola el dia 42', async () => {
      prisma.lote.findUnique.mockResolvedValue(loteConDueno);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        filaCalculada({ pesaje_fecha_snapshot: fechaDelDia(45) }),
      );
      prisma.curvaObjetivo.findMany.mockResolvedValue(curvaCompleta);

      const r = await service.compararConCurva(1, admin);
      expect(r.veredicto).toBe('sin_curva_para_dia');
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
      expect(r.real).not.toBeNull();
      expect(r.objetivo).toBeNull();
    });

    it('consistencia: si el punto que certificaba el maximo no esta en la MISMA lectura, el dia que dependia de el deja de estar en rango', async () => {
      // Con dos consultas (aggregate + findFirst) por separado, borrar el
      // punto 42 justo entre ambas dejaba el aggregate certificando
      // max=42 mientras el findFirst ya no lo encontraba, y el resultado
      // caia de vuelta al dia 21 como si el rango vigente lo cubriera.
      // Con una sola lectura, el maximo SIEMPRE sale del mismo array que
      // se usa para buscar el punto: si el 42 no esta, el maximo real es
      // 21 y el dia 42 queda fuera de rango.
      prisma.lote.findUnique.mockResolvedValue(loteConDueno);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        filaCalculada({ pesaje_fecha_snapshot: fechaDelDia(42) }),
      );
      prisma.curvaObjetivo.findMany.mockResolvedValue([
        { dia: 7, peso_esperado_g: 211, fcr_objetivo: 1.0 },
        { dia: 14, peso_esperado_g: 535, fcr_objetivo: 1.1 },
        { dia: 21, peso_esperado_g: 1035, fcr_objetivo: 1.18 },
        // dia 42 ausente en esta lectura -- no debe caer de vuelta al 21.
      ]);

      const r = await service.compararConCurva(1, admin);
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
      expect(r.veredicto).toBe('sin_curva_para_dia');
      expect(r.objetivo).toBeNull();
    });

    it('el rango solo cuenta puntos CON peso: una fila del dia 45 sin peso no extiende el rango mas alla del dia 42', async () => {
      // El peso valido llega hasta el dia 42. La fila del dia 45 EXISTE en
      // la tabla pero con peso_esperado_g NULL -- no debe contar como
      // limite del rango. Un pesaje del dia 44 (entre 42 y 45) tiene que
      // quedar fuera de rango, no comparado contra el 42 ni extrapolado.
      prisma.lote.findUnique.mockResolvedValue(loteConDueno);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        filaCalculada({ pesaje_fecha_snapshot: fechaDelDia(44) }),
      );
      prisma.curvaObjetivo.findMany.mockResolvedValue([
        ...curvaCompleta,
        { dia: 45, peso_esperado_g: null, fcr_objetivo: null },
      ]);

      const r = await service.compararConCurva(1, admin);
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
      expect(r.veredicto).toBe('sin_curva_para_dia');
      expect(r.objetivo).toBeNull();
    });

    it('una fila sin peso DENTRO del rango valido da sin_datos, sin retroceder a un peso anterior', async () => {
      // Dia 21 existe en la curva pero con peso_esperado_g NULL. El rango
      // (7-42, por los otros puntos) SI cubre el dia 21 -- el problema no
      // es el rango, es que esa fila puntual no tiene con que comparar.
      // No debe retroceder al dia 14 (535g, el anterior con peso).
      prisma.lote.findUnique.mockResolvedValue(loteConDueno);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        filaCalculada({ pesaje_fecha_snapshot: fechaDelDia(21) }),
      );
      prisma.curvaObjetivo.findMany.mockResolvedValue([
        { dia: 7, peso_esperado_g: 211, fcr_objetivo: 1.0 },
        { dia: 14, peso_esperado_g: 535, fcr_objetivo: 1.1 },
        { dia: 21, peso_esperado_g: null, fcr_objetivo: null },
        { dia: 42, peso_esperado_g: 2900, fcr_objetivo: 1.9 },
      ]);

      const r = await service.compararConCurva(1, admin);
      expect(r.veredicto).toBe('sin_datos');
      if (r.veredicto !== 'sin_datos') throw new Error('unreachable');
      expect(r.dia_curva).toBe(21);
      expect(r.objetivo?.peso_esperado_g).toBeNull();
    });

    it('filas existentes para la marca y sexo, pero TODAS sin peso: sin_referencia con mensaje claro, conserva el fcr_objetivo del dia', async () => {
      // Decision de contrato: hay curva (4 filas, dias 7-42), pero ninguna
      // tiene peso_esperado_g -- no es "no hay curva objetivo", es "no hay
      // peso con que comparar". El mensaje debe distinguir ese matiz, y no
      // debe descartar otros datos de la fila del dia (aqui, fcr_objetivo).
      prisma.lote.findUnique.mockResolvedValue(loteConDueno);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        filaCalculada({ pesaje_fecha_snapshot: fechaDelDia(21), fcr: 1.3 }),
      );
      prisma.curvaObjetivo.findMany.mockResolvedValue([
        { dia: 7, peso_esperado_g: null, fcr_objetivo: 1.0 },
        { dia: 14, peso_esperado_g: null, fcr_objetivo: 1.1 },
        { dia: 21, peso_esperado_g: null, fcr_objetivo: 1.18 },
        { dia: 42, peso_esperado_g: null, fcr_objetivo: 1.9 },
      ]);

      const r = await service.compararConCurva(1, admin);
      expect(r.veredicto).toBe('sin_referencia');
      if (r.veredicto !== 'sin_referencia') throw new Error('unreachable');
      expect(r.mensaje).not.toMatch(/no hay curva objetivo/i);
      expect(r.objetivo).toEqual({ peso_esperado_g: null, fcr_objetivo: 1.18 });
      expect(r.desvio_fcr as number).toBeCloseTo(1.3 - 1.18, 5);
      expect(r.dia_curva).toBe(21);
    });
  });

  it('ninguna fila para la marca y sexo del lote: sin_referencia', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.indicadorLote.findFirst.mockResolvedValue(filaCalculada());
    prisma.curvaObjetivo.findMany.mockResolvedValue([]);

    const r = await service.compararConCurva(1, admin);
    expect(r.veredicto).toBe('sin_referencia');
    expect(r.objetivo).toBeNull();
    expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
  });

  it('veredicto por_debajo cuando el peso real esta bajo la curva', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.indicadorLote.findFirst.mockResolvedValue(
      filaCalculada({ peso_promedio_g: 900, fcr: 1.3 }),
    );
    prisma.curvaObjetivo.findMany.mockResolvedValue([
      { dia: 21, peso_esperado_g: 1035, fcr_objetivo: 1.18 },
    ]);

    const r = await service.compararConCurva(1, admin);
    expect(r.veredicto).toBe('por_debajo');
    if (r.veredicto !== 'por_debajo') throw new Error('unreachable');
    expect(r.desvio_peso_pct as number).toBeCloseTo(-13.04, 1);
    expect(r.desvio_fcr as number).toBeCloseTo(0.12, 2);
    expect(r.real).toEqual({ peso_promedio_g: 900, fcr: 1.3 });
    expect(r.objetivo).toEqual({ peso_esperado_g: 1035, fcr_objetivo: 1.18 });
  });

  it('veredicto en_objetivo cuando el peso esta dentro del umbral', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.indicadorLote.findFirst.mockResolvedValue(
      filaCalculada({ peso_promedio_g: 1035, fcr: 1.18 }),
    );
    prisma.curvaObjetivo.findMany.mockResolvedValue([
      { dia: 21, peso_esperado_g: 1035, fcr_objetivo: 1.18 },
    ]);

    const r = await service.compararConCurva(1, admin);
    expect(r.veredicto).toBe('en_objetivo');
    if (r.veredicto !== 'en_objetivo') throw new Error('unreachable');
    expect(r.desvio_peso_pct as number).toBeCloseTo(0, 5);
  });
});

describe('IndicadoresService · generarAlertaDesvio', () => {
  let service: IndicadoresService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    pesaje: { findFirst: jest.fn() },
    indicadorLote: { findFirst: jest.fn() },
    curvaObjetivo: { findMany: jest.fn() },
    alerta: { findFirst: jest.fn(), create: jest.fn() },
  };

  // La fila tiene que ser "de hoy" de verdad -- la parada 2 compara contra
  // inicioDelDiaEnZonaGranja(), no contra una fecha fija del calendario.
  const hoy = inicioDelDiaEnZonaGranja();
  const pesajeSnapshot = { id: 50, fecha: hoy, peso_promedio_g: 900 };

  const lote = {
    galpon: { granja: { propietario_id: 1 } },
    galpon_id: 7,
    sexo: 'macho',
    marca_alimento: 'italcol',
    // ingreso 20 dias antes de "hoy": el pesaje (fecha=hoy) cae en el dia
    // 21, coherente con dia_vida:21 y curvaDia21 de abajo.
    fecha_ingreso: new Date(hoy.getTime() - 20 * 24 * 60 * 60 * 1000),
  };

  // Rango 7-42: rango y punto de estas pruebas salen de la MISMA lectura
  // (findMany), nunca de dos consultas separadas.
  const curvaCompleta = [
    { dia: 7, peso_esperado_g: 211, fcr_objetivo: 1.0 },
    { dia: 14, peso_esperado_g: 535, fcr_objetivo: 1.1 },
    { dia: 21, peso_esperado_g: 1035, fcr_objetivo: 1.18 },
    { dia: 42, peso_esperado_g: 2900, fcr_objetivo: 1.9 },
  ];

  const indicadorPorDebajo = (extra: Record<string, unknown> = {}) => ({
    fecha: hoy,
    estado_calculo: 'calculado',
    estado_peso: 'disponible',
    dia_vida: 21,
    peso_promedio_g: 900,
    fcr: 1.3,
    pesaje_id_snapshot: pesajeSnapshot.id,
    pesaje_fecha_snapshot: pesajeSnapshot.fecha,
    ...extra,
  });

  // La fuente (el pesaje) coincide exactamente con el snapshot -- las
  // pruebas de la parada 3 son las que la cambian a proposito.
  const ponerPorDebajo = () => {
    prisma.lote.findUnique.mockResolvedValue(lote);
    prisma.indicadorLote.findFirst.mockResolvedValue(indicadorPorDebajo());
    prisma.pesaje.findFirst.mockResolvedValue(pesajeSnapshot);
    prisma.curvaObjetivo.findMany.mockResolvedValue(curvaCompleta);
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicadoresService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configSinUmbral },
      ],
    }).compile();
    service = module.get<IndicadoresService>(IndicadoresService);
  });

  afterEach(() => jest.clearAllMocks());

  it('sin ninguna fila de indicador: motivo sin_indicador', async () => {
    prisma.indicadorLote.findFirst.mockResolvedValue(null);

    const r = await service.generarAlertaDesvio(1);
    expect(r).toEqual({ alerta: null, motivo: 'sin_indicador' });
    expect(prisma.alerta.create).not.toHaveBeenCalled();
  });

  it.each(['mortalidad_incoherente', 'legado_sin_verificar'] as const)(
    'parada 1: estado_calculo=%s detiene con ese motivo -- no salta a una fila anterior',
    async (estado) => {
      prisma.indicadorLote.findFirst.mockResolvedValue(
        indicadorPorDebajo({ estado_calculo: estado }),
      );

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: estado });
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    },
  );

  it('parada 2: la fila mas reciente no es de hoy', async () => {
    const ayer = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);
    prisma.indicadorLote.findFirst.mockResolvedValue(
      indicadorPorDebajo({ fecha: ayer }),
    );

    const r = await service.generarAlertaDesvio(1);
    expect(r).toEqual({ alerta: null, motivo: 'no_es_de_hoy' });
  });

  describe('parada 3: la fuente cambio despues de calcular', () => {
    it('el pesaje fue corregido (mismo id/fecha, peso distinto)', async () => {
      prisma.lote.findUnique.mockResolvedValue(lote);
      prisma.indicadorLote.findFirst.mockResolvedValue(indicadorPorDebajo());
      prisma.pesaje.findFirst.mockResolvedValue({
        ...pesajeSnapshot,
        peso_promedio_g: 950,
      });

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: 'fuente_cambiada' });
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    it('el pesaje fue borrado (o movido a otro lote)', async () => {
      prisma.lote.findUnique.mockResolvedValue(lote);
      prisma.indicadorLote.findFirst.mockResolvedValue(indicadorPorDebajo());
      prisma.pesaje.findFirst.mockResolvedValue(null);

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: 'fuente_cambiada' });
    });

    it('se registro un pesaje mas nuevo despues del calculo', async () => {
      prisma.lote.findUnique.mockResolvedValue(lote);
      prisma.indicadorLote.findFirst.mockResolvedValue(indicadorPorDebajo());
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 51,
        fecha: hoy,
        peso_promedio_g: 1200,
      });

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: 'fuente_cambiada' });
    });

    it('control: con la fuente intacta SI se genera la alerta', async () => {
      ponerPorDebajo();
      configSinUmbral.get.mockReturnValueOnce('9999');
      prisma.alerta.findFirst.mockResolvedValue(null);
      prisma.alerta.create.mockResolvedValue({ id: 1 });

      const r = await service.generarAlertaDesvio(1);
      expect(r.motivo).toBeNull();
      expect(r.alerta).not.toBeNull();
    });
  });

  it('parada 4: pesaje con fecha futura detiene -- no se sustituye por uno anterior', async () => {
    prisma.lote.findUnique.mockResolvedValue(lote);
    const futura = new Date(hoy.getTime() + 5 * 24 * 60 * 60 * 1000);
    prisma.indicadorLote.findFirst.mockResolvedValue(
      indicadorPorDebajo({
        estado_peso: 'pesaje_fecha_futura',
        peso_promedio_g: null,
        pesaje_fecha_snapshot: futura,
      }),
    );
    prisma.pesaje.findFirst.mockResolvedValue({
      id: pesajeSnapshot.id,
      fecha: futura,
      peso_promedio_g: null,
    });

    const r = await service.generarAlertaDesvio(1);
    expect(r).toEqual({ alerta: null, motivo: 'pesaje_fecha_futura' });
  });

  describe('parada 5: sin pesaje, sin umbral configurado, o pesaje viejo', () => {
    it('sin_pesaje detiene', async () => {
      prisma.lote.findUnique.mockResolvedValue(lote);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        indicadorPorDebajo({
          estado_peso: 'sin_pesaje',
          peso_promedio_g: null,
          pesaje_id_snapshot: null,
          pesaje_fecha_snapshot: null,
        }),
      );
      prisma.pesaje.findFirst.mockResolvedValue(null);

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: 'sin_pesaje' });
    });

    it('sin UMBRAL_PESAJE_DIAS configurado: detiene, nunca inventa un umbral', async () => {
      ponerPorDebajo();
      configSinUmbral.get.mockReturnValueOnce(undefined);

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: 'umbral_no_configurado' });
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    it('pesaje mas viejo que el umbral (inyectado en la prueba, no fijado en el codigo)', async () => {
      const viejo = new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000);
      prisma.lote.findUnique.mockResolvedValue(lote);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        indicadorPorDebajo({
          pesaje_id_snapshot: 60,
          pesaje_fecha_snapshot: viejo,
        }),
      );
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 60,
        fecha: viejo,
        peso_promedio_g: 900,
      });
      configSinUmbral.get.mockReturnValueOnce('5');

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: 'pesaje_desactualizado' });
    });

    it('pesaje dentro del umbral inyectado: no se detiene aqui, sigue evaluando', async () => {
      ponerPorDebajo();
      prisma.alerta.findFirst.mockResolvedValue(null);
      prisma.alerta.create.mockResolvedValue({ id: 1 });
      configSinUmbral.get.mockReturnValueOnce('5');

      const r = await service.generarAlertaDesvio(1);
      expect(r.motivo).toBeNull();
      expect(r.alerta).not.toBeNull();
    });
  });

  describe('UMBRAL_PESAJE_DIAS=2 (decision de negocio, 2026-09-27): tolerancia operativa de la alerta, no el calendario de pesaje', () => {
    it('pesaje de HOY (0 dias de antiguedad): genera alerta si cumple las demas condiciones', async () => {
      ponerPorDebajo();
      prisma.alerta.findFirst.mockResolvedValue(null);
      prisma.alerta.create.mockResolvedValue({ id: 1 });
      configSinUmbral.get.mockReturnValueOnce('2');

      const r = await service.generarAlertaDesvio(1);
      expect(r.motivo).toBeNull();
      expect(r.alerta).not.toBeNull();
    });

    it('pesaje de HACE 2 DIAS (el limite exacto del umbral): todavia genera alerta, no se detiene', async () => {
      // antiguedadDias=2 no es > 2 (umbral): el limite es inclusive, no se
      // detiene aqui. La antiguedad se mide contra hoy = fecha de la
      // granja (inicioDelDiaEnZonaGranja()), no la hora del servidor.
      const hace2Dias = new Date(hoy.getTime() - 2 * 24 * 60 * 60 * 1000);
      prisma.lote.findUnique.mockResolvedValue(lote);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        indicadorPorDebajo({
          pesaje_id_snapshot: 80,
          pesaje_fecha_snapshot: hace2Dias,
          peso_promedio_g: 900,
        }),
      );
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 80,
        fecha: hace2Dias,
        peso_promedio_g: 900,
      });
      // Punto unico en el dia exacto del pesaje: aisla esta prueba del
      // dia de vida resultante, que no es lo que se quiere probar aqui.
      prisma.curvaObjetivo.findMany.mockResolvedValue([
        { dia: 19, peso_esperado_g: 1000, fcr_objetivo: 1.15 },
      ]);
      configSinUmbral.get.mockReturnValueOnce('2');
      prisma.alerta.findFirst.mockResolvedValue(null);
      prisma.alerta.create.mockResolvedValue({ id: 2 });

      const r = await service.generarAlertaDesvio(1);
      expect(r.motivo).not.toBe('pesaje_desactualizado');
      expect(r.motivo).toBeNull();
      expect(r.alerta).not.toBeNull();
      expect(prisma.alerta.create).toHaveBeenCalledTimes(1);
    });

    it('pesaje de HACE 3 DIAS: excede el umbral, se detiene como pesaje_desactualizado', async () => {
      const hace3Dias = new Date(hoy.getTime() - 3 * 24 * 60 * 60 * 1000);
      prisma.lote.findUnique.mockResolvedValue(lote);
      prisma.indicadorLote.findFirst.mockResolvedValue(
        indicadorPorDebajo({
          pesaje_id_snapshot: 81,
          pesaje_fecha_snapshot: hace3Dias,
          peso_promedio_g: 900,
        }),
      );
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 81,
        fecha: hace3Dias,
        peso_promedio_g: 900,
      });
      configSinUmbral.get.mockReturnValueOnce('2');

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: 'pesaje_desactualizado' });
      expect(prisma.alerta.create).not.toHaveBeenCalled();
      // se detiene ANTES de llegar a la curva -- no hay con que comparar
      // un pesaje que ya se dio por desactualizado.
      expect(prisma.curvaObjetivo.findMany).not.toHaveBeenCalled();
    });
  });

  it('no genera alerta cuando el lote no va por debajo', async () => {
    prisma.lote.findUnique.mockResolvedValue(lote);
    prisma.indicadorLote.findFirst.mockResolvedValue(
      indicadorPorDebajo({ peso_promedio_g: 1035, fcr: 1.18 }),
    );
    prisma.pesaje.findFirst.mockResolvedValue({
      ...pesajeSnapshot,
      peso_promedio_g: 1035,
    });
    prisma.curvaObjetivo.findMany.mockResolvedValue(curvaCompleta);
    configSinUmbral.get.mockReturnValueOnce('9999');

    const r = await service.generarAlertaDesvio(1);
    expect(r).toEqual({ alerta: null, motivo: 'no_por_debajo' });
    expect(prisma.alerta.create).not.toHaveBeenCalled();
  });

  it.each(['abierta', 'en_proceso'] as const)(
    'no duplica si ya existe una alerta de desvio automatica en estado %s',
    async (estado) => {
      // en_proceso es una alerta abierta pero ya aceptada por alguien -- si
      // solo se mirara 'abierta', aceptarla dejaba la puerta abierta para
      // que el siguiente calculo creara otra alerta de desvio duplicada.
      ponerPorDebajo();
      configSinUmbral.get.mockReturnValueOnce('9999');
      prisma.alerta.findFirst.mockResolvedValue({ id: 99, estado });

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: 'ya_existe_alerta' });
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    },
  );

  it('la busqueda de "ya existe" considera abierta y en_proceso como activas', async () => {
    ponerPorDebajo();
    configSinUmbral.get.mockReturnValueOnce('9999');
    prisma.alerta.findFirst.mockResolvedValue(null);
    prisma.alerta.create.mockResolvedValue({ id: 1 });

    await service.generarAlertaDesvio(1);

    const calls = prisma.alerta.findFirst.mock.calls as Array<
      [{ where: Record<string, unknown> }]
    >;
    expect(calls[0][0].where.estado).toEqual({
      in: ['abierta', 'en_proceso'],
    });
  });

  it('crea la alerta cuando va por debajo y no hay una abierta', async () => {
    ponerPorDebajo();
    configSinUmbral.get.mockReturnValueOnce('9999');
    prisma.alerta.findFirst.mockResolvedValue(null);
    prisma.alerta.create.mockResolvedValue({ id: 1 });

    const r = await service.generarAlertaDesvio(1);

    expect(prisma.alerta.create).toHaveBeenCalledTimes(1);
    expect(r.motivo).toBeNull();
    const calls = prisma.alerta.create.mock.calls as Array<
      [{ data: Record<string, unknown> }]
    >;
    expect(calls[0][0].data).toMatchObject({
      galpon_id: 7,
      lote_id: 1,
      tipo: 'desvio_peso',
      origen: 'automatica',
      criticidad: 'media',
    });
  });

  it('H1: compara contra la curva del dia en que se peso, no dia_vida de hoy -- no alerta con un pesaje viejo pero correcto', async () => {
    // dia_vida=21 (hoy), pero el pesaje es de hace 7 dias (dia 14) y su peso
    // (535g) es EXACTO para el dia 14. Si se comparara contra curvaDia21
    // (1035g, el bug de H1), 535g se veria "por_debajo" y crearia una
    // alerta falsa. Con el dia correcto (14), no hay desvio.
    const pesajeDia14Fecha = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
    prisma.lote.findUnique.mockResolvedValue(lote);
    prisma.indicadorLote.findFirst.mockResolvedValue(
      indicadorPorDebajo({
        peso_promedio_g: 535,
        pesaje_id_snapshot: 61,
        pesaje_fecha_snapshot: pesajeDia14Fecha,
      }),
    );
    prisma.pesaje.findFirst.mockResolvedValue({
      id: 61,
      fecha: pesajeDia14Fecha,
      peso_promedio_g: 535,
    });
    prisma.curvaObjetivo.findMany.mockResolvedValue(curvaCompleta);
    configSinUmbral.get.mockReturnValueOnce('9999');

    const r = await service.generarAlertaDesvio(1);

    // El punto usado SI corresponde al dia del pesaje (14): si se hubiera
    // comparado contra dia_vida (21, 1035g) el desvio seria enorme y el
    // motivo saldria 'null' con una alerta creada, no 'no_por_debajo'.
    expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ alerta: null, motivo: 'no_por_debajo' });
    expect(prisma.alerta.create).not.toHaveBeenCalled();
  });

  it('un pesaje viejo pero dentro del umbral SI genera alerta, con el dia del pesaje y el desvio en positivo', async () => {
    // Dia 14, peso 480g contra 535g esperados: -10.28% -> por debajo.
    // El mensaje debe decir "dia de vida 14" (no dia_vida=21, el de hoy) y
    // "10.3%" (positivo), no "-10.3%".
    const pesajeDia14Fecha = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
    prisma.lote.findUnique.mockResolvedValue(lote);
    prisma.indicadorLote.findFirst.mockResolvedValue(
      indicadorPorDebajo({
        peso_promedio_g: 480,
        pesaje_id_snapshot: 62,
        pesaje_fecha_snapshot: pesajeDia14Fecha,
      }),
    );
    prisma.pesaje.findFirst.mockResolvedValue({
      id: 62,
      fecha: pesajeDia14Fecha,
      peso_promedio_g: 480,
    });
    prisma.curvaObjetivo.findMany.mockResolvedValue(curvaCompleta);
    configSinUmbral.get.mockReturnValueOnce('9999');
    prisma.alerta.findFirst.mockResolvedValue(null);
    prisma.alerta.create.mockResolvedValue({ id: 5 });

    const r = await service.generarAlertaDesvio(1);

    expect(r.motivo).toBeNull();
    expect(prisma.alerta.create).toHaveBeenCalledTimes(1);
    const llamadas = prisma.alerta.create.mock.calls as Array<
      [{ data: { mensaje: string } }]
    >;
    expect(llamadas[0][0].data.mensaje).toBe(
      'El pesaje del dia de vida 14 quedo 10.3% por debajo de la curva objetivo',
    );
  });

  describe('R2: limites de la curva (dia 7 a 42, Italcol/Solla)', () => {
    // Cada prueba arma su propio lote: fecha_ingreso corrida para que "hoy"
    // (la fila del indicador siempre es de hoy, Parada 2) caiga justo en
    // el dia que se quiere probar.
    const loteConIngresoEnDia = (diaDeHoy: number) => ({
      galpon: { granja: { propietario_id: 1 } },
      galpon_id: 7,
      sexo: 'macho',
      marca_alimento: 'italcol',
      fecha_ingreso: new Date(
        hoy.getTime() - (diaDeHoy - 1) * 24 * 60 * 60 * 1000,
      ),
    });

    const prepararPesajeDeHoy = (dia: number) => {
      prisma.lote.findUnique.mockResolvedValue(loteConIngresoEnDia(dia));
      prisma.indicadorLote.findFirst.mockResolvedValue(
        indicadorPorDebajo({
          pesaje_id_snapshot: 70,
          pesaje_fecha_snapshot: hoy,
          peso_promedio_g: 900,
        }),
      );
      prisma.pesaje.findFirst.mockResolvedValue({
        id: 70,
        fecha: hoy,
        peso_promedio_g: 900,
      });
      configSinUmbral.get.mockReturnValueOnce('9999');
    };

    it('dia exactamente en el minimo (7) sigue el camino normal', async () => {
      prepararPesajeDeHoy(7);
      // sin desvio: se detiene en no_por_debajo, no en sin_curva_para_dia.
      // Rango de un solo punto (min=max=7): justo el caso limite.
      prisma.curvaObjetivo.findMany.mockResolvedValue([
        { dia: 7, peso_esperado_g: 900, fcr_objetivo: 1.0 },
      ]);

      const r = await service.generarAlertaDesvio(1);
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
      expect(r.motivo).not.toBe('sin_curva_para_dia');
    });

    it('dia exactamente en el maximo (42) sigue el camino normal', async () => {
      prepararPesajeDeHoy(42);
      prisma.curvaObjetivo.findMany.mockResolvedValue([
        { dia: 42, peso_esperado_g: 900, fcr_objetivo: 1.9 },
      ]);

      const r = await service.generarAlertaDesvio(1);
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
      expect(r.motivo).not.toBe('sin_curva_para_dia');
    });

    it('dia 3 (antes del primer punto): motivo sin_curva_para_dia', async () => {
      prepararPesajeDeHoy(3);
      prisma.curvaObjetivo.findMany.mockResolvedValue(curvaCompleta);

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: 'sin_curva_para_dia' });
      // la lectura SI ocurre -- rango y punto vienen de ella. Lo que no
      // ocurre es una SEGUNDA consulta para buscar el punto.
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    it('E9 -- dia 45 (despues del ultimo punto): motivo sin_curva_para_dia, no se extrapola el dia 42', async () => {
      prepararPesajeDeHoy(45);
      prisma.curvaObjetivo.findMany.mockResolvedValue(curvaCompleta);

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: 'sin_curva_para_dia' });
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    it('consistencia: si el punto que certificaba el maximo no esta en la MISMA lectura, el dia que dependia de el deja de estar en rango', async () => {
      // Mismo argumento que en compararConCurva: con dos consultas por
      // separado, borrar el punto 42 entre el aggregate y el findFirst
      // dejaba el rango certificando un dia que el punto ya no cubria, y
      // el resultado caia de vuelta al dia 21 como si siguiera vigente.
      prepararPesajeDeHoy(42);
      prisma.curvaObjetivo.findMany.mockResolvedValue([
        { dia: 7, peso_esperado_g: 211, fcr_objetivo: 1.0 },
        { dia: 14, peso_esperado_g: 535, fcr_objetivo: 1.1 },
        { dia: 21, peso_esperado_g: 1035, fcr_objetivo: 1.18 },
        // dia 42 ausente en esta lectura -- no debe caer de vuelta al 21.
      ]);

      const r = await service.generarAlertaDesvio(1);
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
      expect(r).toEqual({ alerta: null, motivo: 'sin_curva_para_dia' });
    });

    it('el rango solo cuenta puntos CON peso: una fila del dia 45 sin peso no extiende el rango mas alla del dia 42, sin alerta', async () => {
      // El peso valido llega hasta el dia 42. La fila del dia 45 EXISTE
      // pero con peso_esperado_g NULL -- no cuenta como limite del rango.
      // Un pesaje del dia 44 tiene que quedar fuera de rango, no generar
      // alerta.
      prepararPesajeDeHoy(44);
      prisma.curvaObjetivo.findMany.mockResolvedValue([
        ...curvaCompleta,
        { dia: 45, peso_esperado_g: null, fcr_objetivo: null },
      ]);

      const r = await service.generarAlertaDesvio(1);
      expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
      expect(r).toEqual({ alerta: null, motivo: 'sin_curva_para_dia' });
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });

    it('una fila sin peso DENTRO del rango valido da sin_referencia, sin retroceder a un peso anterior ni crear alerta', async () => {
      // Dia 21 existe en la curva pero con peso_esperado_g NULL. El rango
      // (7-42, por los otros puntos) SI cubre el dia 21. No debe
      // retroceder al dia 14 (535g, el anterior con peso).
      prepararPesajeDeHoy(21);
      prisma.curvaObjetivo.findMany.mockResolvedValue([
        { dia: 7, peso_esperado_g: 211, fcr_objetivo: 1.0 },
        { dia: 14, peso_esperado_g: 535, fcr_objetivo: 1.1 },
        { dia: 21, peso_esperado_g: null, fcr_objetivo: null },
        { dia: 42, peso_esperado_g: 2900, fcr_objetivo: 1.9 },
      ]);

      const r = await service.generarAlertaDesvio(1);
      expect(r).toEqual({ alerta: null, motivo: 'sin_referencia' });
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });
  });

  it('ninguna fila para la marca y sexo del lote: motivo sin_referencia', async () => {
    ponerPorDebajo();
    prisma.curvaObjetivo.findMany.mockResolvedValue([]);
    configSinUmbral.get.mockReturnValueOnce('9999');

    const r = await service.generarAlertaDesvio(1);
    expect(r).toEqual({ alerta: null, motivo: 'sin_referencia' });
    expect(prisma.curvaObjetivo.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.alerta.create).not.toHaveBeenCalled();
  });

  it('la busqueda de "ya existe" filtra por origen automatica -- no una manual del mismo tipo', async () => {
    // Antes de este fix, esta busqueda no filtraba por origen: una alerta
    // manual creada con el mismo tipo ('desvio_peso') bloqueaba en silencio
    // la alerta automatica real, sin que nadie lo notara.
    ponerPorDebajo();
    configSinUmbral.get.mockReturnValueOnce('9999');
    prisma.alerta.findFirst.mockResolvedValue(null);
    prisma.alerta.create.mockResolvedValue({ id: 1 });

    await service.generarAlertaDesvio(1);

    const calls = prisma.alerta.findFirst.mock.calls as Array<
      [{ where: Record<string, unknown> }]
    >;
    expect(calls[0][0].where).toMatchObject({
      lote_id: 1,
      tipo: 'desvio_peso',
      origen: 'automatica',
    });
  });
});

describe('IndicadoresService · kpisFinancieros', () => {
  let service: IndicadoresService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    indicadorLote: { findFirst: jest.fn() },
    movimientoFinanciero: { aggregate: jest.fn() },
  };

  const admin = { id: 1, rol: 'Administrador' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicadoresService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configSinUmbral },
      ],
    }).compile();
    service = module.get<IndicadoresService>(IndicadoresService);
    prisma.lote.findUnique.mockResolvedValue({
      galpon: { granja: { propietario_id: 1 } },
      cantidad_inicial: 1000,
    });
  });

  afterEach(() => jest.clearAllMocks());

  const fechaReciente = new Date('2026-09-20T00:00:00.000Z');

  it('calcula costo total, margen, costo por kg y refleja el estado calculado', async () => {
    prisma.indicadorLote.findFirst
      .mockResolvedValueOnce({ estado_calculo: 'calculado', fecha: fechaReciente })
      .mockResolvedValueOnce({
        fecha: fechaReciente,
        estado_peso: 'disponible',
        peso_promedio_g: 2000,
        mortalidad_acumulada_pct: 5,
      });
    prisma.movimientoFinanciero.aggregate
      .mockResolvedValueOnce({ _sum: { valor_cop: new Prisma.Decimal(5000000) } })
      .mockResolvedValueOnce({ _sum: { valor_cop: new Prisma.Decimal(8000000) } });

    const r = await service.kpisFinancieros(1, admin);

    // aves_vivas = 1000 * (1 - 0.05) = 950 ; kg = 2 * 950 = 1900
    // El servicio devuelve Decimal: el interceptor los pasa a numero en la
    // frontera HTTP, pero aqui se llama al servicio directamente.
    expect(r.estado_actual).toBe('calculado');
    expect(r.fecha_estado_actual).toBe(fechaReciente);
    expect(r.fecha_del_dato_usado).toBe(fechaReciente);
    expect(r.estado_peso_del_dato_usado).toBe('disponible');
    expect(r.costo_total_cop.toString()).toBe('5000000');
    expect(r.ingreso_total_cop.toString()).toBe('8000000');
    expect(r.margen_cop.toString()).toBe('3000000');
    expect(r.kg_producidos).toBe(1900);
    expect(r.costo_por_kg_cop as number).toBeCloseTo(2631.58, 1);
    expect(r.roi_pct as number).toBeCloseTo(60, 1);
  });

  it('sin indicador jamas calculado: estado sin_indicador, sin fecha de dato usado, kg y costo_por_kg null', async () => {
    prisma.indicadorLote.findFirst
      .mockResolvedValueOnce(null) // mas reciente: no existe ninguna fila todavia
      .mockResolvedValueOnce(null); // calculado: tampoco
    prisma.movimientoFinanciero.aggregate
      .mockResolvedValueOnce({ _sum: { valor_cop: new Prisma.Decimal(1000000) } })
      .mockResolvedValueOnce({ _sum: { valor_cop: null } });

    const r = await service.kpisFinancieros(1, admin);

    expect(r.estado_actual).toBe('sin_indicador');
    expect(r.fecha_estado_actual).toBeNull();
    expect(r.fecha_del_dato_usado).toBeNull();
    expect(r.estado_peso_del_dato_usado).toBeNull();
    expect(r.costo_total_cop.toString()).toBe('1000000');
    expect(r.ingreso_total_cop.toString()).toBe('0');
    expect(r.kg_producidos).toBeNull();
    expect(r.costo_por_kg_cop).toBeNull();
  });

  it('fila mas reciente incoherente (mortalidad_incoherente): estado_actual la refleja, sin dato usado', async () => {
    prisma.indicadorLote.findFirst
      .mockResolvedValueOnce({ estado_calculo: 'mortalidad_incoherente', fecha: fechaReciente })
      .mockResolvedValueOnce(null); // no hay ninguna fila 'calculado' que usar
    prisma.movimientoFinanciero.aggregate
      .mockResolvedValueOnce({ _sum: { valor_cop: new Prisma.Decimal(1000000) } })
      .mockResolvedValueOnce({ _sum: { valor_cop: new Prisma.Decimal(0) } });

    const r = await service.kpisFinancieros(1, admin);

    expect(r.estado_actual).toBe('mortalidad_incoherente');
    expect(r.fecha_estado_actual).toBe(fechaReciente);
    expect(r.fecha_del_dato_usado).toBeNull();
    expect(r.estado_peso_del_dato_usado).toBeNull();
    expect(r.kg_producidos).toBeNull();
    expect(r.costo_por_kg_cop).toBeNull();
  });

  it.each(['sin_pesaje', 'pesaje_fecha_futura'] as const)(
    'estado_peso_del_dato_usado=%s distingue la causa de kg_producidos null',
    async (estadoPeso) => {
      prisma.indicadorLote.findFirst
        .mockResolvedValueOnce({ estado_calculo: 'calculado', fecha: fechaReciente })
        .mockResolvedValueOnce({
          fecha: fechaReciente,
          estado_peso: estadoPeso,
          peso_promedio_g: null,
          mortalidad_acumulada_pct: 5,
        });
      prisma.movimientoFinanciero.aggregate
        .mockResolvedValueOnce({ _sum: { valor_cop: new Prisma.Decimal(1000000) } })
        .mockResolvedValueOnce({ _sum: { valor_cop: new Prisma.Decimal(0) } });

      const r = await service.kpisFinancieros(1, admin);

      expect(r.estado_peso_del_dato_usado).toBe(estadoPeso);
      expect(r.kg_producidos).toBeNull();
      expect(r.fecha_del_dato_usado).toBe(fechaReciente);
    },
  );

  it('calculado pero con peso no disponible: hay fecha_del_dato_usado, pero kg sigue null (no se inventa produccion)', async () => {
    prisma.indicadorLote.findFirst
      .mockResolvedValueOnce({ estado_calculo: 'calculado', fecha: fechaReciente })
      .mockResolvedValueOnce({
        fecha: fechaReciente,
        estado_peso: 'sin_pesaje',
        peso_promedio_g: null,
        mortalidad_acumulada_pct: 5,
      });
    prisma.movimientoFinanciero.aggregate
      .mockResolvedValueOnce({ _sum: { valor_cop: new Prisma.Decimal(1000000) } })
      .mockResolvedValueOnce({ _sum: { valor_cop: new Prisma.Decimal(0) } });

    const r = await service.kpisFinancieros(1, admin);

    expect(r.estado_actual).toBe('calculado');
    expect(r.fecha_del_dato_usado).toBe(fechaReciente);
    expect(r.kg_producidos).toBeNull();
    expect(r.costo_por_kg_cop).toBeNull();
  });

  it('mortalidad real cero: kg_producidos es un numero real (0 aves muertas), no null -- distinguible de "no se sabe"', async () => {
    prisma.indicadorLote.findFirst
      .mockResolvedValueOnce({ estado_calculo: 'calculado', fecha: fechaReciente })
      .mockResolvedValueOnce({
        fecha: fechaReciente,
        estado_peso: 'disponible',
        peso_promedio_g: 2000,
        mortalidad_acumulada_pct: 0,
      });
    prisma.movimientoFinanciero.aggregate
      .mockResolvedValueOnce({ _sum: { valor_cop: new Prisma.Decimal(1000000) } })
      .mockResolvedValueOnce({ _sum: { valor_cop: new Prisma.Decimal(0) } });

    const r = await service.kpisFinancieros(1, admin);

    // aves_vivas = 1000 * (1 - 0) = 1000 ; kg = 2 * 1000 = 2000
    expect(r.kg_producidos).not.toBeNull();
    expect(r.kg_producidos).toBe(2000);
    expect(r.costo_por_kg_cop as number).toBeCloseTo(500, 1);
  });

});

describe('IndicadoresService · listar', () => {
  let service: IndicadoresService;

  const prisma = {
    lote: { findUnique: jest.fn() },
    indicadorLote: { findMany: jest.fn() },
  };

  const admin = { id: 1, rol: 'Administrador' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicadoresService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configSinUmbral },
      ],
    }).compile();
    service = module.get<IndicadoresService>(IndicadoresService);
    prisma.lote.findUnique.mockResolvedValue({
      galpon: { granja: { propietario_id: 1 } },
    });
    prisma.indicadorLote.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  it('devuelve el historico en orden cronologico (fecha ascendente) -- lote_id+fecha ya es unico, sin necesidad de desempate', async () => {
    await service.listar(1, admin);

    const calls = prisma.indicadorLote.findMany.mock.calls as Array<
      [{ orderBy: unknown }]
    >;
    expect(calls[0][0].orderBy).toEqual({ fecha: 'asc' });
  });
});
