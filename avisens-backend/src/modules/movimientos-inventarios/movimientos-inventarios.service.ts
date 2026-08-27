// movimientos-inventario.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMovimientoInventarioDto } from './dto/create-movimientos-inventarios.dto';
import { UpdateMovimientoInventarioDto } from './dto/update-movimiento-inventarios.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';

const MOVIMIENTO_SELECT = {
  id: true,
  insumo_id: true,
  lote_id: true,
  tipo_movimiento: true,
  cantidad: true,
  unidad_medida: true,
  motivo: true,
  comprobante_url: true,
  stock_resultante: true,
  usuario_id: true,
  fecha_movimiento: true,
  // Relaciones
  insumo: {
    select: {
      id: true,
      nombre: true,
      stock_actual: true,
      unidad_medida: true,
    },
  },
  lote: {
    select: {
      id: true,
      codigo: true,
      estado: true,
    },
  },
  usuario: {
    select: {
      id: true,
      nombre_completo: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class MovimientosInventarioService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // VALIDACIONES PRIVADAS
  // ============================================================

  /**
   * Validar que el insumo existe y el usuario tiene acceso
   */
  private async validarInsumo(insumoId: number, solicitante: Solicitante) {
    const insumo = await this.prisma.inventarioInsumo.findUnique({
      where: { id: insumoId },
      select: {
        id: true,
        nombre: true,
        stock_actual: true,
        unidad_medida: true,
        activo: true,
        proveedor_habitual_id: true,
      },
    });

    if (!insumo) {
      throw new NotFoundException(`Insumo con ID ${insumoId} no encontrado`);
    }

    if (!insumo.activo) {
      throw new BadRequestException(
        `El insumo "${insumo.nombre}" está inactivo`,
      );
    }

    return insumo;
  }

  /**
   * Validar que el lote existe y el usuario tiene acceso
   */
  private async validarLote(loteId: number, solicitante: Solicitante) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      include: {
        galpon: {
          include: {
            granja: true,
          },
        },
      },
    });

    if (!lote) {
      throw new NotFoundException(`Lote con ID ${loteId} no encontrado`);
    }

    verificarDueno(
      solicitante,
      lote.galpon.granja.propietario_id,
      'No tienes acceso a este lote',
    );

    return lote;
  }

  /**
   * Obtener movimiento con validación de acceso
   */
  private async obtenerMovimientoConValidacion(
    id: number,
    solicitante: Solicitante,
  ) {
    const movimiento = await this.prisma.movimientoInventario.findUnique({
      where: { id },
      select: MOVIMIENTO_SELECT,
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }

    // Verificar que el usuario tiene acceso (a través del insumo)
    // Nota: Como el insumo no tiene relación directa con granja,
    // validamos que el usuario sea admin o que el movimiento sea de su propiedad
    if (solicitante.rol !== 'ADMINISTRADOR') {
      // Si no es admin, solo puede ver movimientos que él creó
      if (movimiento.usuario_id !== solicitante.id) {
        throw new ForbiddenException('No tienes acceso a este movimiento');
      }
    }

    return movimiento;
  }

  /**
   * Calcular y actualizar el stock del insumo
   */
  private async calcularYActualizarStock(
    insumoId: number,
    tipoMovimiento: string,
    cantidad: number,
    transaction: any,
  ) {
    // Obtener el insumo con su stock actual
    const insumo = await transaction.inventarioInsumo.findUnique({
      where: { id: insumoId },
      select: { stock_actual: true },
    });

    let nuevoStock: number;

    if (tipoMovimiento === 'entrada') {
      nuevoStock = insumo.stock_actual + cantidad;
    } else if (tipoMovimiento === 'salida') {
      // Validar que hay suficiente stock
      if (insumo.stock_actual < cantidad) {
        throw new BadRequestException(
          `Stock insuficiente. Stock actual: ${insumo.stock_actual}, Cantidad solicitada: ${cantidad}`,
        );
      }
      nuevoStock = insumo.stock_actual - cantidad;
    } else {
      throw new BadRequestException('Tipo de movimiento inválido');
    }

    // Actualizar el stock del insumo
    await transaction.inventarioInsumo.update({
      where: { id: insumoId },
      data: { stock_actual: nuevoStock },
    });

    return nuevoStock;
  }

  // ============================================================
  // MÉTODOS PÚBLICOS
  // ============================================================

  /**
   * CREAR MOVIMIENTO DE INVENTARIO
   * - Valida que el insumo existe
   * - Valida que el lote existe (si se proporciona)
   * - Calcula el stock_resultante automáticamente
   * - Actualiza el stock del insumo
   */
  async crear(dto: CreateMovimientoInventarioDto, solicitante: Solicitante) {
    // 1. Validar que el insumo existe
    const insumo = await this.validarInsumo(dto.insumo_id, solicitante);

    // 2. Validar lote si se proporciona
    if (dto.lote_id) {
      await this.validarLote(dto.lote_id, solicitante);
    }

    // 3. Usar transacción para garantizar consistencia
    return this.prisma.$transaction(async (tx) => {
      // 4. Calcular el stock resultante y actualizar el insumo
      const stockResultante = await this.calcularYActualizarStock(
        dto.insumo_id,
        dto.tipo_movimiento,
        dto.cantidad,
        tx,
      );

      // 5. Crear el movimiento de inventario
      const movimiento = await tx.movimientoInventario.create({
        data: {
          insumo_id: dto.insumo_id,
          lote_id: dto.lote_id,
          tipo_movimiento: dto.tipo_movimiento,
          cantidad: dto.cantidad,
          unidad_medida: dto.unidad_medida || insumo.unidad_medida,
          motivo: dto.motivo,
          comprobante_url: dto.comprobante_url,
          stock_resultante: stockResultante,
          usuario_id: solicitante.id,
          fecha_movimiento: new Date(),
        },
        select: MOVIMIENTO_SELECT,
      });

      return movimiento;
    });
  }

  /**
   * LISTAR MOVIMIENTOS CON PAGINACIÓN
   */
  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    // Propietario: solo ve sus movimientos
    // Admin: ve todos
    const where = esPropietario(solicitante)
      ? { usuario_id: solicitante.id }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.movimientoInventario.findMany({
        where,
        select: MOVIMIENTO_SELECT,
        orderBy: { fecha_movimiento: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.movimientoInventario.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  /**
   * OBTENER MOVIMIENTO POR ID
   */
  async obtener(id: number, solicitante: Solicitante) {
    return this.obtenerMovimientoConValidacion(id, solicitante);
  }

  /**
   * ACTUALIZAR MOVIMIENTO DE INVENTARIO
   * - Solo permite actualizar campos no críticos
   * - NO permite cambiar insumo_id, cantidad o tipo_movimiento
   */
  async actualizar(
    id: number,
    dto: UpdateMovimientoInventarioDto,
    solicitante: Solicitante,
  ) {
    // Verificar que existe y el usuario tiene acceso
    const movimientoExistente = await this.obtenerMovimientoConValidacion(
      id,
      solicitante,
    );

    // Validar lote si se proporciona
    if (dto.lote_id) {
      await this.validarLote(dto.lote_id, solicitante);
    }

    // Construir objeto con solo los campos permitidos
    const data: any = {};

    if (dto.lote_id !== undefined) {
      data.lote_id = dto.lote_id;
    }

    if (dto.unidad_medida !== undefined) {
      data.unidad_medida = dto.unidad_medida;
    }

    if (dto.motivo !== undefined) {
      data.motivo = dto.motivo;
    }

    if (dto.comprobante_url !== undefined) {
      data.comprobante_url = dto.comprobante_url;
    }

    // Si no hay datos para actualizar, retornar el registro actual
    if (Object.keys(data).length === 0) {
      return this.obtenerMovimientoConValidacion(id, solicitante);
    }

    // Actualizar el movimiento
    return this.prisma.movimientoInventario.update({
      where: { id },
      data,
      select: MOVIMIENTO_SELECT,
    });
  }

  /**
   * ELIMINAR MOVIMIENTO DE INVENTARIO
   * ⚠️ SOLO ADMIN puede eliminar movimientos
   * ⚠️ Y debe revertir el stock
   */
  async eliminar(id: number, solicitante: Solicitante) {
    // Solo ADMIN puede eliminar movimientos
    if (solicitante.rol !== 'ADMINISTRADOR') {
      throw new ForbiddenException(
        'Solo los administradores pueden eliminar movimientos',
      );
    }

    // Obtener el movimiento con validación
    const movimiento = await this.obtenerMovimientoConValidacion(
      id,
      solicitante,
    );

    // Usar transacción para revertir el stock
    await this.prisma.$transaction(async (tx) => {
      // Revertir el stock (operación inversa)
      const cantidadAjustada =
        movimiento.tipo_movimiento === 'entrada'
          ? -movimiento.cantidad // Si era entrada, restar
          : movimiento.cantidad; // Si era salida, sumar

      // Actualizar el stock del insumo
      await tx.inventarioInsumo.update({
        where: { id: movimiento.insumo_id },
        data: {
          stock_actual: {
            increment: cantidadAjustada,
          },
        },
      });

      // Eliminar el movimiento
      await tx.movimientoInventario.delete({
        where: { id },
      });
    });

    return { id, eliminado: true };
  }

  /**
   * OBTENER MOVIMIENTOS POR INSUMO
   */
  async obtenerPorInsumo(
    insumoId: number,
    solicitante: Solicitante,
    paginacion: PaginationQueryDto,
  ) {
    const { page, limit } = paginacion;

    // Validar que el insumo existe
    await this.validarInsumo(insumoId, solicitante);

    const where = { insumo_id: insumoId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.movimientoInventario.findMany({
        where,
        select: MOVIMIENTO_SELECT,
        orderBy: { fecha_movimiento: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.movimientoInventario.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  /**
   * OBTENER MOVIMIENTOS POR LOTE
   */
  async obtenerPorLote(
    loteId: number,
    solicitante: Solicitante,
    paginacion: PaginationQueryDto,
  ) {
    const { page, limit } = paginacion;

    // Validar que el lote existe
    await this.validarLote(loteId, solicitante);

    const where = { lote_id: loteId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.movimientoInventario.findMany({
        where,
        select: MOVIMIENTO_SELECT,
        orderBy: { fecha_movimiento: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.movimientoInventario.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  /**
   * OBTENER ESTADÍSTICAS DE MOVIMIENTOS
   */
  async obtenerEstadisticas(solicitante: Solicitante) {
    const where = esPropietario(solicitante)
      ? { usuario_id: solicitante.id }
      : {};

    const [total, entradas, salidas, totalEntradas, totalSalidas] =
      await Promise.all([
        this.prisma.movimientoInventario.count({ where }),
        this.prisma.movimientoInventario.count({
          where: { ...where, tipo_movimiento: 'entrada' },
        }),
        this.prisma.movimientoInventario.count({
          where: { ...where, tipo_movimiento: 'salida' },
        }),
        this.prisma.movimientoInventario.aggregate({
          where: { ...where, tipo_movimiento: 'entrada' },
          _sum: { cantidad: true },
        }),
        this.prisma.movimientoInventario.aggregate({
          where: { ...where, tipo_movimiento: 'salida' },
          _sum: { cantidad: true },
        }),
      ]);

    return {
      total,
      entradas,
      salidas,
      total_entradas_kg: totalEntradas._sum.cantidad || 0,
      total_salidas_kg: totalSalidas._sum.cantidad || 0,
    };
  }
}
