import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LotesService } from './lotes.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('LotesService', () => {
  let service: LotesService;

  const prisma = {
    lote: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    galpon: { findUnique: jest.fn() },
    consumoDiario: { findMany: jest.fn() },
    registroMortalidad: { findMany: jest.fn() },
    categoriaFinanciera: { findFirst: jest.fn(), create: jest.fn() },
    movimientoFinanciero: { create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const admin = { id: 1, rol: 'Administrador' };
  const propietario = { id: 5, rol: 'Propietario' };
  type TransaccionPrueba = (cliente: typeof prisma) => Promise<unknown>;

  const esTransaccionPrueba = (
    operacion: unknown,
  ): operacion is TransaccionPrueba => typeof operacion === 'function';

  const dtoCrear = {
    galpon_id: 3,
    fecha_ingreso: '2026-08-06',
    cantidad_inicial: 5000,
    raza: 'Ross 308',
  };

  const dataDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<[{ data: Record<string, unknown> }]>;
    return calls[0][0].data;
  };
  const whereDe = (mock: jest.Mock): Record<string, unknown> => {
    const calls = mock.mock.calls as Array<
      [{ where: Record<string, unknown> }]
    >;
    return calls[0][0].where;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LotesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<LotesService>(LotesService);

    prisma.$transaction.mockImplementation((operacion: unknown) => {
      if (esTransaccionPrueba(operacion)) return operacion(prisma);
      return Promise.resolve([[], 0]);
    });
    prisma.galpon.findUnique.mockResolvedValue({
      id: 3,
      granja: { propietario_id: 5 },
    });
    prisma.$queryRaw.mockResolvedValue([{ id: 2, activo: true }]);
    prisma.lote.findFirst.mockResolvedValue(null);
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('crea el lote cuando el galpón es del solicitante', async () => {
      prisma.lote.create.mockResolvedValue({ id: 25 });
      prisma.lote.update.mockResolvedValue({
        id: 25,
        codigo: 'LOT-2026-000025',
      });

      const resultado = await service.crear(dtoCrear, propietario);

      expect(prisma.lote.create).toHaveBeenCalled();
      expect(dataDe(prisma.lote.create).fecha_ingreso).toBeInstanceOf(Date);
      expect(dataDe(prisma.lote.create).codigo).toMatch(/^TEMP-/);
      expect(dataDe(prisma.lote.update).codigo).toBe('LOT-2026-000025');
      expect(resultado.codigo).toBe('LOT-2026-000025');
    });

    it('un Propietario no puede crear en un galpón ajeno (403)', async () => {
      prisma.galpon.findUnique.mockResolvedValue({
        id: 3,
        granja: { propietario_id: 999 },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    it('rechaza (404) si el galpón no existe', async () => {
      prisma.galpon.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    it('rechaza (409) si el galpón ya tiene un lote activo', async () => {
      prisma.lote.findFirst.mockResolvedValue({ id: 99 });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    it('crea el lote con la linea genetica indicada, decidido con la lectura bloqueada (FOR UPDATE) dentro de la transaccion', async () => {
      prisma.lote.create.mockResolvedValue({ id: 27 });
      prisma.lote.update.mockResolvedValue({
        id: 27,
        codigo: 'LOT-2026-000027',
      });

      await service.crear({ ...dtoCrear, linea_genetica_id: 2 }, admin);

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(dataDe(prisma.lote.create).linea_genetica_id).toBe(2);
    });

    it('rechaza (404) si la linea genetica no existe (leido dentro de la transaccion)', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(
        service.crear({ ...dtoCrear, linea_genetica_id: 2 }, admin),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    it('rechaza (400) si la linea genetica esta inactiva (leido dentro de la transaccion)', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 2, activo: false }]);

      await expect(
        service.crear({ ...dtoCrear, linea_genetica_id: 2 }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.lote.create).not.toHaveBeenCalled();
    });

    it('crea el lote sin linea genetica cuando no se indica (undefined no consulta ni bloquea)', async () => {
      prisma.lote.create.mockResolvedValue({ id: 28 });
      prisma.lote.update.mockResolvedValue({
        id: 28,
        codigo: 'LOT-2026-000028',
      });

      await service.crear(dtoCrear, admin);

      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(dataDe(prisma.lote.create).linea_genetica_id).toBeNull();
    });

    it('crea el lote con linea_genetica_id null sin consultar ni bloquear ninguna linea', async () => {
      prisma.lote.create.mockResolvedValue({ id: 29 });
      prisma.lote.update.mockResolvedValue({
        id: 29,
        codigo: 'LOT-2026-000029',
      });

      await service.crear({ ...dtoCrear, linea_genetica_id: null }, admin);

      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(dataDe(prisma.lote.create).linea_genetica_id).toBeNull();
    });
  });

  describe('listar', () => {
    it('un Propietario solo ve lotes de sus galpones', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(whereDe(prisma.lote.findMany).galpon).toEqual({
        granja: { propietario_id: 5 },
      });
    });

    it('un Admin no filtra por dueño', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(whereDe(prisma.lote.findMany)).toBeUndefined();
    });
  });

  describe('obtener', () => {
    it('un Propietario no puede ver un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza (404) si el lote no existe', async () => {
      prisma.lote.findUnique.mockResolvedValue(null);

      await expect(service.obtener(1, admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('actualizar', () => {
    it('actualiza cuando el lote es del solicitante', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { raza: 'Cobb 500' }, propietario);

      expect(prisma.lote.update).toHaveBeenCalled();
      expect(dataDe(prisma.lote.update)).not.toHaveProperty('codigo');
    });

    it('impide trasladar un lote a otro galpón para no romper su historial', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });

      await expect(
        service.actualizar(1, { galpon_id: 9 }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('rechaza (409) poner estado activo si el galpón ya tiene otro lote activo', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.findFirst.mockResolvedValue({ id: 42 });

      await expect(
        service.actualizar(1, { estado: 'activo' }, propietario),
      ).rejects.toThrow(ConflictException);
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('no verifica exclusividad si el PATCH no cambia el estado', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { raza: 'Cobb 500' }, propietario);

      expect(prisma.lote.findFirst).not.toHaveBeenCalled();
    });

    it('asigna la linea genetica indicada, decidido con la lectura bloqueada (FOR UPDATE) dentro de la misma transaccion del update', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { linea_genetica_id: 2 }, propietario);

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(dataDe(prisma.lote.update).linea_genetica_id).toBe(2);
    });

    it('rechaza (404) si la linea genetica no existe (leido dentro de la transaccion)', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(
        service.actualizar(1, { linea_genetica_id: 2 }, propietario),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('rechaza (400) asignar una linea genetica inactiva (leido dentro de la transaccion)', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.$queryRaw.mockResolvedValue([{ id: 2, activo: false }]);

      await expect(
        service.actualizar(1, { linea_genetica_id: 2 }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('permite desvincular la linea genetica con null, sin consultar ni bloquear ninguna linea', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { linea_genetica_id: null }, propietario);

      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(dataDe(prisma.lote.update).linea_genetica_id).toBeNull();
    });

    it('un PATCH que no toca linea_genetica_id (undefined) no consulta ni bloquea ninguna linea', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1 });

      await service.actualizar(1, { raza: 'Cobb 500' }, propietario);

      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(dataDe(prisma.lote.update).linea_genetica_id).toBeUndefined();
    });
  });

  describe('activar', () => {
    it('activa el lote cuando el galpón no tiene otro activo', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1, estado: 'activo' });

      const res = await service.activar(1, propietario);

      expect(dataDe(prisma.lote.update)).toEqual({ estado: 'activo' });
      expect(res.estado).toBe('activo');
    });

    it('rechaza (409) si el galpón ya tiene otro lote activo', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.findFirst.mockResolvedValue({ id: 42 });

      await expect(service.activar(1, propietario)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('excluye al propio lote de la búsqueda de otro activo', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { id: 3, granja: { propietario_id: 5 } },
      });
      prisma.lote.update.mockResolvedValue({ id: 1, estado: 'activo' });

      await service.activar(1, propietario);

      expect(whereDe(prisma.lote.findFirst)).toMatchObject({
        galpon_id: 3,
        estado: 'activo',
        id: { not: 1 },
      });
    });
  });

  describe('desactivar / eliminarPermanente', () => {
    beforeEach(() => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 5 } },
      });
    });

    it('desactiva (borrado suave) marcando estado inactivo', async () => {
      prisma.lote.update.mockResolvedValue({ id: 1, estado: 'inactivo' });

      const res = await service.desactivar(1, propietario);

      expect(dataDe(prisma.lote.update)).toEqual({ estado: 'inactivo' });
      expect(res.estado).toBe('inactivo');
    });

    it('un Propietario no puede desactivar un lote ajeno (403)', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { propietario_id: 999 } },
      });

      await expect(service.desactivar(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('elimina permanentemente cuando es dueño', async () => {
      prisma.lote.delete.mockResolvedValue({ id: 1 });

      const res = await service.eliminarPermanente(1, propietario);

      expect(res).toEqual({ id: 1, eliminado: true });
    });
  });

  describe('cerrar', () => {
    const loteActivo = {
      id: 10,
      codigo: 'LOT-2026-000010',
      estado: 'activo',
      fecha_ingreso: new Date('2026-08-01T00:00:00.000Z'),
      cantidad_inicial: 1000,
      galpon: {
        id: 3,
        nombre: 'Galpón 1',
        granja: { id: 2, nombre: 'La Palma', propietario_id: 5 },
      },
    };

    const dtoCierre = {
      fecha_salida_real: '2026-08-03',
      cantidad_aves_vendidas: 950,
      peso_promedio_final_g: 2000,
      valor_venta_total_cop: 9500000,
    };

    const consumosCompletos = [
      { fecha: new Date('2026-08-01T00:00:00.000Z'), alimento_kg: 1000 },
      { fecha: new Date('2026-08-02T00:00:00.000Z'), alimento_kg: 1000 },
      { fecha: new Date('2026-08-03T00:00:00.000Z'), alimento_kg: 1040 },
    ];

    const mortalidadEjemplo = [
      { fecha: new Date('2026-08-02T00:00:00.000Z'), cantidad_aves: 50 },
    ];

    beforeEach(() => {
      prisma.lote.findUnique.mockResolvedValue(loteActivo);
      prisma.consumoDiario.findMany.mockResolvedValue(consumosCompletos);
      prisma.registroMortalidad.findMany.mockResolvedValue(mortalidadEjemplo);
      prisma.$queryRaw.mockResolvedValue([{ id: 10, estado: 'activo' }]);
      prisma.categoriaFinanciera.findFirst.mockResolvedValue({
        id: 1,
        nombre: 'Venta de aves',
        tipo: 'ingreso',
      });
      prisma.movimientoFinanciero.create.mockResolvedValue({
        id: 77,
        valor_cop: 9500000,
        tipo: 'ingreso',
      });
      prisma.lote.update.mockResolvedValue({
        ...loteActivo,
        estado: 'finalizado',
        fecha_salida_real: new Date('2026-08-03T00:00:00.000Z'),
        cantidad_aves_vendidas: 950,
        peso_promedio_final_g: 2000,
        valor_venta_total_cop: 9500000,
        precio_venta_kg_cop: 5000,
        mortalidad_acumulada_final_pct: 5,
        fcr_final: 1.6,
        cerrado_por_id: 5,
      });
    });

    it('rechaza (404) si el lote no existe', async () => {
      prisma.lote.findUnique.mockResolvedValue(null);

      await expect(service.cerrar(10, dtoCierre, propietario)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza (403) si el Propietario intenta cerrar un lote de otra granja', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        ...loteActivo,
        galpon: {
          ...loteActivo.galpon,
          granja: { id: 9, nombre: 'Ajena', propietario_id: 999 },
        },
      });

      await expect(service.cerrar(10, dtoCierre, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('rechaza (409) si el lote no está activo', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        ...loteActivo,
        estado: 'finalizado',
      });

      await expect(service.cerrar(10, dtoCierre, propietario)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.lote.update).not.toHaveBeenCalled();
    });

    it('rechaza (400) si la fecha de salida es anterior a la fecha de ingreso', async () => {
      await expect(
        service.cerrar(
          10,
          { ...dtoCierre, fecha_salida_real: '2026-07-31' },
          propietario,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza (400) si las aves vendidas superan la cantidad inicial', async () => {
      await expect(
        service.cerrar(
          10,
          { ...dtoCierre, cantidad_aves_vendidas: 1001 },
          propietario,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('no cierra y devuelve aviso con días faltantes si falta alimento y no viene confirmación', async () => {
      prisma.consumoDiario.findMany.mockResolvedValue([
        { fecha: new Date('2026-08-01T00:00:00.000Z'), alimento_kg: 1000 },
      ]);

      const resultado = await service.cerrar(10, dtoCierre, propietario);

      expect(resultado.cerrado).toBe(false);
      expect(resultado.requiere_confirmacion).toBe(true);
      if (!resultado.cerrado) {
        expect(resultado.dias_sin_alimento).toEqual([
          { dia: 2, fecha: '2026-08-02' },
          { dia: 3, fecha: '2026-08-03' },
        ]);
        expect(resultado.dias_sin_mortalidad).toEqual([
          { dia: 1, fecha: '2026-08-01' },
          { dia: 3, fecha: '2026-08-03' },
        ]);
      }
      expect(prisma.lote.update).not.toHaveBeenCalled();
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });

    it('cierra el lote aunque falten días cuando confirmar_cierre es true', async () => {
      prisma.consumoDiario.findMany.mockResolvedValue([
        { fecha: new Date('2026-08-01T00:00:00.000Z'), alimento_kg: 3040 },
      ]);

      const resultado = await service.cerrar(
        10,
        { ...dtoCierre, confirmar_cierre: true },
        propietario,
      );

      expect(resultado.cerrado).toBe(true);
      expect(prisma.lote.update).toHaveBeenCalledTimes(1);
    });

    it('cierra el lote, guarda datos de liquidación, calcula mortalidad/FCR y registra ingreso en Venta de aves', async () => {
      const resultado = await service.cerrar(10, dtoCierre, propietario);

      expect(resultado.cerrado).toBe(true);
      expect(resultado.requiere_confirmacion).toBe(false);

      const datosLote = dataDe(prisma.lote.update);
      expect(datosLote.estado).toBe('finalizado');
      expect(datosLote.cantidad_aves_vendidas).toBe(950);
      expect(datosLote.peso_promedio_final_g).toBe(2000);
      expect(datosLote.valor_venta_total_cop).toBe(9500000);
      // 950 aves * 2 kg = 1900 kg -> 9,500,000 / 1900 = 5000 COP/kg
      expect(datosLote.precio_venta_kg_cop).toBe(5000);
      // 50 / 1000 * 100 = 5%
      expect(datosLote.mortalidad_acumulada_final_pct).toBe(5);
      // 3040 kg alimento / 1900 kg peso vivo = 1.6
      expect(datosLote.fcr_final).toBe(1.6);
      expect(datosLote.cerrado_por_id).toBe(propietario.id);
      expect(datosLote.fecha_cierre).toBeInstanceOf(Date);

      const datosMov = dataDe(prisma.movimientoFinanciero.create);
      expect(datosMov).toMatchObject({
        granja_id: 2,
        lote_id: 10,
        categoria_id: 1,
        tipo: 'ingreso',
        valor_cop: 9500000,
        usuario_id: propietario.id,
      });
    });

    it('crea la categoría Venta de aves si no existía y respeta precio_venta_kg_cop manual', async () => {
      prisma.categoriaFinanciera.findFirst.mockResolvedValue(null);
      prisma.categoriaFinanciera.create.mockResolvedValue({
        id: 88,
        nombre: 'Venta de aves',
        tipo: 'ingreso',
      });

      await service.cerrar(
        10,
        { ...dtoCierre, precio_venta_kg_cop: 5200 },
        admin,
      );

      expect(prisma.categoriaFinanciera.create).toHaveBeenCalledWith({
        data: { nombre: 'Venta de aves', tipo: 'ingreso' },
        select: { id: true },
      });
      expect(dataDe(prisma.lote.update).precio_venta_kg_cop).toBe(5200);
      expect(dataDe(prisma.movimientoFinanciero.create).categoria_id).toBe(88);
    });

    it('no crea movimiento financiero si no se informó dinero de venta', async () => {
      const { valor_venta_total_cop: _omitido, ...sinVenta } = dtoCierre;
      void _omitido;

      const resultado = await service.cerrar(10, sinVenta, propietario);

      expect(resultado.cerrado).toBe(true);
      if (resultado.cerrado) {
        expect(resultado.movimiento_financiero).toBeNull();
      }
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });
  });
});
