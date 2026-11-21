import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MovimientosFinancierosService } from './movimientos-financieros.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ROLES } from '../../common/auth/roles';
import type { Solicitante } from '../../common/auth/acceso';

describe('MovimientosFinancierosService', () => {
  let service: MovimientosFinancierosService;

  const auditoria = { registrar: jest.fn() };

  const prisma = {
    movimientoFinanciero: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    granja: { findUnique: jest.fn() },
    categoriaFinanciera: { findUnique: jest.fn() },
    lote: { findUnique: jest.fn(), findMany: jest.fn() },
    registroMortalidad: { groupBy: jest.fn() },
    $transaction: jest.fn(),
  };

  const admin: Solicitante = { id: 1, rol: ROLES.ADMINISTRADOR };
  const propietario: Solicitante = { id: 5, rol: ROLES.PROPIETARIO };

  const dtoCrear = {
    categoria_id: 3,
    tipo: 'egreso',
    valor_cop: 1500000,
    fecha: '2026-08-18',
    lote_id: 1,
  };

  const movimientoExistente = {
    id: 1,
    granja_id: 10,
    lote_id: 1,
    granja: { id: 10, nombre: 'Granja Norte', propietario_id: 5 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientosFinancierosService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditoriaService, useValue: auditoria },
      ],
    }).compile();
    service = module.get<MovimientosFinancierosService>(
      MovimientosFinancierosService,
    );

    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.categoriaFinanciera.findUnique.mockResolvedValue({ id: 3 });
    prisma.granja.findUnique.mockResolvedValue({
      id: 10,
      propietario_id: 5,
    });
    prisma.lote.findUnique.mockResolvedValue({
      id: 1,
      galpon: { granja: { id: 10, propietario_id: 5 } },
    });
    prisma.movimientoFinanciero.findUnique.mockResolvedValue(
      movimientoExistente,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('crear', () => {
    it('infiere la granja desde el lote', async () => {
      prisma.movimientoFinanciero.create.mockResolvedValue({ id: 1 });

      await service.crear(dtoCrear, propietario);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.movimientoFinanciero.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(llamada.data).toEqual(
        expect.objectContaining({ granja_id: 10, lote_id: 1 }),
      );
    });

    it('permite un movimiento sin lote cuando se indica una granja propia', async () => {
      prisma.movimientoFinanciero.create.mockResolvedValue({ id: 1 });

      await service.crear(
        { ...dtoCrear, lote_id: undefined, granja_id: 10 },
        propietario,
      );

      expect(prisma.granja.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 10 } }),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.movimientoFinanciero.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(llamada.data).toEqual(expect.objectContaining({ granja_id: 10 }));
    });

    it('rechaza un movimiento sin lote ni granja', async () => {
      await expect(
        service.crear({ ...dtoCrear, lote_id: undefined }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });

    it('rechaza cuando lote y granja no coinciden', async () => {
      await expect(
        service.crear({ ...dtoCrear, granja_id: 99 }, propietario),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });

    it('lanza NotFound si la categoria no existe', async () => {
      prisma.categoriaFinanciera.findUnique.mockResolvedValue(null);

      await expect(service.crear(dtoCrear, admin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });

    it('lanza Forbidden si el lote no es del propietario', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { id: 10, propietario_id: 999 } },
      });

      await expect(service.crear(dtoCrear, propietario)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('filtra por las granjas del propietario', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(prisma.movimientoFinanciero.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { granja: { propietario_id: propietario.id } },
        }),
      );
    });
  });

  // El administrador ve los movimientos de todos los propietarios, y eso es a
  // propósito: en un servicio gestionado a veces tiene que mirar las cuentas de
  // un cliente para ayudarlo. Lo que protege al cliente no es esconderlo, sino
  // que quede rastro. La bitácora sólo guardaba escrituras —el interceptor deja
  // fuera el GET— así que estas consultas se registran a mano.
  describe('mirar las cuentas de otro deja rastro', () => {
    it('el administrador que lista queda registrado', async () => {
      await service.listar(admin, { page: 1, limit: 10 });

      expect(auditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuario_id: admin.id,
          accion: 'consultar',
          entidad_afectada: 'movimientos_financieros',
        }),
      );
    });

    it('el propietario mirando lo suyo no se registra', async () => {
      await service.listar(propietario, { page: 1, limit: 10 });

      expect(auditoria.registrar).not.toHaveBeenCalled();
    });

    it('el administrador que abre un movimiento queda registrado, con el id', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue(
        movimientoExistente,
      );

      await service.obtener(movimientoExistente.id, admin);

      expect(auditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'consultar',
          registro_id: movimientoExistente.id,
        }),
      );
    });

    // Si registrar fallara y tumbara la consulta, la auditoría dejaría de ser
    // un rastro para convertirse en un punto de caída.
    it('un fallo al registrar no tumba la consulta', async () => {
      auditoria.registrar.mockRejectedValueOnce(new Error('bitácora caída'));

      await expect(
        service.listar(admin, { page: 1, limit: 10 }),
      ).resolves.toBeDefined();
    });
  });

  describe('obtener', () => {
    it('lanza NotFound cuando el movimiento no existe', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue(null);

      await expect(service.obtener(99, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza Forbidden aunque el movimiento ajeno no tenga lote', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue({
        ...movimientoExistente,
        lote_id: null,
        granja: { id: 10, nombre: 'Ajena', propietario_id: 999 },
      });

      await expect(service.obtener(1, propietario)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('actualizar', () => {
    it('conserva la granja coherente con el lote existente', async () => {
      prisma.movimientoFinanciero.update.mockResolvedValue({ id: 1 });

      await service.actualizar(
        1,
        { descripcion: 'Factura ajustada' },
        propietario,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.movimientoFinanciero.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(llamada.data).toEqual(expect.objectContaining({ granja_id: 10 }));
    });
  });

  describe('eliminar', () => {
    it('borra un movimiento de una granja propia', async () => {
      prisma.movimientoFinanciero.delete.mockResolvedValue({ id: 1 });

      await expect(service.eliminar(1, propietario)).resolves.toEqual({
        id: 1,
        eliminado: true,
      });
    });
  });

  /**
   * La categoría clasifica el movimiento, así que tiene que estar del mismo
   * lado del balance. Antes sólo se comprobaba que existiera: un ingreso con
   * la categoría «Compra de alimento» se guardaba en silencio y el balance de
   * la granja salía mal sin que nadie lo notara.
   */
  describe('la categoría tiene que encajar con el tipo', () => {
    const conCategoria = (tipo: string | null, nombre = 'Compra de alimento') =>
      prisma.categoriaFinanciera.findUnique.mockResolvedValue({
        id: 3,
        nombre,
        tipo,
      });

    it('deja crear cuando concuerdan', async () => {
      conCategoria('egreso');
      prisma.movimientoFinanciero.create.mockResolvedValue({ id: 1 });

      await expect(
        service.crear({ ...dtoCrear, tipo: 'egreso' }, propietario),
      ).resolves.toBeDefined();
    });

    it('rechaza un ingreso con categoría de egreso', async () => {
      conCategoria('egreso');

      await expect(
        service.crear({ ...dtoCrear, tipo: 'ingreso' }, propietario),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.movimientoFinanciero.create).not.toHaveBeenCalled();
    });

    it('el mensaje nombra la categoría y los dos lados', async () => {
      conCategoria('egreso', 'Compra de alimento');

      await expect(
        service.crear({ ...dtoCrear, tipo: 'ingreso' }, propietario),
      ).rejects.toThrow(/Compra de alimento.*egreso.*ingreso/);
    });

    // La columna es opcional a propósito: sin tipo, la categoría sirve para
    // las dos cosas y no se debe rechazar nada.
    it('una categoría sin tipo vale para los dos', async () => {
      conCategoria(null, 'Otros');
      prisma.movimientoFinanciero.create.mockResolvedValue({ id: 1 });

      await expect(
        service.crear({ ...dtoCrear, tipo: 'ingreso' }, propietario),
      ).resolves.toBeDefined();
    });

    // El caso que un arreglo ingenuo se salta: no llega categoria_id, así que
    // parece que no hay nada que validar, pero el tipo nuevo choca con la
    // categoría que ya tenía.
    it('rechaza cambiar sólo el tipo si la categoría de antes ya no encaja', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue({
        ...movimientoExistente,
        tipo: 'egreso',
        categoria_id: 3,
      });
      conCategoria('egreso');

      await expect(
        service.actualizar(1, { tipo: 'ingreso' }, propietario),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.movimientoFinanciero.update).not.toHaveBeenCalled();
    });

    it('rechaza cambiar sólo la categoría si no encaja con el tipo de antes', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue({
        ...movimientoExistente,
        tipo: 'ingreso',
        categoria_id: 1,
      });
      conCategoria('egreso');

      await expect(
        service.actualizar(1, { categoria_id: 3 }, propietario),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deja actualizar cuando el resultado concuerda', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue({
        ...movimientoExistente,
        tipo: 'egreso',
        categoria_id: 3,
      });
      conCategoria('ingreso', 'Venta de aves');
      prisma.movimientoFinanciero.update.mockResolvedValue({ id: 1 });

      await expect(
        service.actualizar(1, { tipo: 'ingreso', categoria_id: 1 }, propietario),
      ).resolves.toBeDefined();
    });

    it('una actualización que no toca ni tipo ni categoría no se estorba', async () => {
      prisma.movimientoFinanciero.findUnique.mockResolvedValue({
        ...movimientoExistente,
        tipo: 'egreso',
        categoria_id: 3,
      });
      prisma.movimientoFinanciero.update.mockResolvedValue({ id: 1 });

      await expect(
        service.actualizar(1, { descripcion: 'otra nota' }, propietario),
      ).resolves.toBeDefined();
      expect(prisma.categoriaFinanciera.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('reporte', () => {
    const loteBd = {
      id: 1,
      codigo: 'L-001',
      estado: 'finalizado',
      fecha_ingreso: new Date('2026-09-01T00:00:00.000Z'),
      fecha_salida_real: new Date('2026-10-12T00:00:00.000Z'),
      cantidad_inicial: 100,
      presupuesto_total_cop: null,
      galpon: { granja: { nombre: 'Granja Norte' } },
      pesajes: [{ peso_promedio_g: 2400, peso_objetivo_g: 2600 }],
      planes: [{ peso_objetivo_g: '2500.00' }],
    };

    beforeEach(() => {
      prisma.movimientoFinanciero.findMany.mockResolvedValue([
        {
          lote_id: 1,
          tipo: 'egreso',
          valor_cop: '900000.00',
          fecha: new Date('2026-09-01T00:00:00.000Z'),
          categoria: { id: 3, nombre: 'Compra de alimento', tipo: 'egreso' },
        },
        {
          lote_id: 1,
          tipo: 'ingreso',
          valor_cop: '1200000.00',
          fecha: new Date('2026-10-12T00:00:00.000Z'),
          categoria: { id: 1, nombre: 'Venta de aves', tipo: 'ingreso' },
        },
      ]);
      prisma.lote.findMany.mockResolvedValue([loteBd]);
      prisma.registroMortalidad.groupBy.mockResolvedValue([
        { lote_id: 1, _sum: { cantidad_aves: 10 } },
      ]);
    });

    it('arma el reporte del ciclo de un lote propio', async () => {
      const reporte = await service.reporte({ lote_id: 1 }, propietario);

      expect(prisma.movimientoFinanciero.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { lote_id: 1 } }),
      );
      const [lote] = reporte.lotes;
      expect(lote.aves_vivas).toBe(90);
      expect(lote.costo_por_ave).toBe(10000);
      expect(lote.margen_neto_pct).toBe(25);
      // El plan vigente gana sobre el objetivo del último pesaje.
      expect(lote.peso_objetivo_kg).toBe(2.5);
      expect(auditoria.registrar).not.toHaveBeenCalled();
    });

    it('rechaza el lote de otro propietario', async () => {
      prisma.lote.findUnique.mockResolvedValue({
        id: 1,
        galpon: { granja: { id: 10, propietario_id: 99 } },
      });

      await expect(
        service.reporte({ lote_id: 1 }, propietario),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.movimientoFinanciero.findMany).not.toHaveBeenCalled();
    });

    it('acota el periodo a las granjas del propietario', async () => {
      await service.reporte(
        { fecha_desde: '2026-09-01', fecha_hasta: '2026-10-31' },
        propietario,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const llamada = prisma.movimientoFinanciero.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(llamada.where).toEqual({
        fecha: {
          gte: new Date('2026-09-01T00:00:00.000Z'),
          lte: new Date('2026-10-31T00:00:00.000Z'),
        },
        granja: { propietario_id: 5 },
      });
    });

    it('deja rastro cuando el administrador consulta un reporte', async () => {
      await service.reporte({ lote_id: 1 }, admin);
      expect(auditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'consultar' }),
      );
    });

    it.each([
      [{}, 'Indica un lote'],
      [{ fecha_desde: '2026-09-01' }, 'Indica un lote'],
      [{ lote_id: 1, fecha_desde: '2026-09-01' }, 'no ambos'],
      [{ fecha_desde: '2026-10-01', fecha_hasta: '2026-09-01' }, 'posterior'],
      [{ fecha_desde: '2024-01-01', fecha_hasta: '2026-09-01' }, 'dos años'],
    ])('valida el filtro %j', async (filtro, mensaje) => {
      await expect(service.reporte(filtro, propietario)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reporte(filtro, propietario)).rejects.toThrow(
        mensaje,
      );
    });
  });
});
