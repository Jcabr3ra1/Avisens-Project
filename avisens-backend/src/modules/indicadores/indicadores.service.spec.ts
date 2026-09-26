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

  const hace = (dias: number) =>
    new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

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
    expect(guardado.fcr as number).toBeCloseTo(1.24, 1);
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
        fecha: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
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
        { fecha: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), cantidad_aves: 5 },
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
        { fecha: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), cantidad_aves: 5 },
      ]);

      await service.calcularParaLote(1);

      const guardado = guardadoDe(prisma.indicadorLote.upsert);
      expect(guardado.estado_calculo).toBe('mortalidad_incoherente');
      expect(guardado.estado_peso).toBe('disponible');
      expect(guardado.pesaje_id_snapshot).toBe(5);
      expect(guardado.peso_promedio_g).toBeNull();
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
    curvaObjetivo: { findFirst: jest.fn() },
  };

  const admin = { id: 1, rol: 'Administrador' };

  const loteConDueno = {
    galpon: { granja: { propietario_id: 1 } },
    sexo: 'macho',
    marca_alimento: 'italcol',
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
    expect(prisma.curvaObjetivo.findFirst).not.toHaveBeenCalled();
  });

  it('devuelve sin_referencia cuando no hay curva para la marca y sexo', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.indicadorLote.findFirst.mockResolvedValue(filaCalculada());
    prisma.curvaObjetivo.findFirst.mockResolvedValue(null);

    const r = await service.compararConCurva(1, admin);
    expect(r.veredicto).toBe('sin_referencia');
    expect(r.objetivo).toBeNull();
  });

  it('veredicto por_debajo cuando el peso real esta bajo la curva', async () => {
    prisma.lote.findUnique.mockResolvedValue(loteConDueno);
    prisma.indicadorLote.findFirst.mockResolvedValue(
      filaCalculada({ peso_promedio_g: 900, fcr: 1.3 }),
    );
    prisma.curvaObjetivo.findFirst.mockResolvedValue({
      dia: 21,
      peso_esperado_g: 1035,
      fcr_objetivo: 1.18,
    });

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
    prisma.curvaObjetivo.findFirst.mockResolvedValue({
      dia: 21,
      peso_esperado_g: 1035,
      fcr_objetivo: 1.18,
    });

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
    curvaObjetivo: { findFirst: jest.fn() },
    alerta: { findFirst: jest.fn(), create: jest.fn() },
  };

  const lote = {
    galpon: { granja: { propietario_id: 1 } },
    galpon_id: 7,
    sexo: 'macho',
    marca_alimento: 'italcol',
  };

  const curvaDia21 = { dia: 21, peso_esperado_g: 1035, fcr_objetivo: 1.18 };

  // La fila tiene que ser "de hoy" de verdad -- la parada 2 compara contra
  // inicioDelDiaEnZonaGranja(), no contra una fecha fija del calendario.
  const hoy = inicioDelDiaEnZonaGranja();
  const pesajeSnapshot = { id: 50, fecha: hoy, peso_promedio_g: 900 };

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
    prisma.curvaObjetivo.findFirst.mockResolvedValue(curvaDia21);
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

  it('no genera alerta cuando el lote no va por debajo', async () => {
    prisma.lote.findUnique.mockResolvedValue(lote);
    prisma.indicadorLote.findFirst.mockResolvedValue(
      indicadorPorDebajo({ peso_promedio_g: 1035, fcr: 1.18 }),
    );
    prisma.pesaje.findFirst.mockResolvedValue({
      ...pesajeSnapshot,
      peso_promedio_g: 1035,
    });
    prisma.curvaObjetivo.findFirst.mockResolvedValue(curvaDia21);
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
    expect(r.kg_producidos).toBeNull();
    expect(r.costo_por_kg_cop).toBeNull();
  });

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
