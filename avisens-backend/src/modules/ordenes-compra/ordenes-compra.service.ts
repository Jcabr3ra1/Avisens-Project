import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoOrdenCompra,
  Prisma,
  TipoMovimientoInventario,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { CreateOrdenesCompraDto } from './dto/create-ordenes-compra.dto';
import { UpdateOrdenesCompraDto } from './dto/update-ordenes-compra.dto';
import { esPropietario, verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';
import { CreateDetalleOrdenDto } from './dto/create-detalle-orden.dto';
import { RecibirOrdenDto } from './dto/recibir-orden.dto';

const SIN_ACCESO = 'No tienes acceso a órdenes de esta granja';

const ORDEN_INCLUDE = {
  granja: {
    select: { id: true, nombre: true, propietario_id: true },
  },
  proveedor: true,
  lote: true,
  usuario: {
    select: {
      id: true,
      nombre_completo: true,
      email: true,
    },
  },
  detalles: {
    include: {
      insumo: {
        select: { id: true, nombre: true, unidad_medida: true, activo: true },
      },
    },
    orderBy: { id: 'asc' as const },
  },
} as const;

type DetalleBloqueado = {
  id: number;
  insumo_id: number;
  cantidad: Prisma.Decimal;
  cantidad_recibida: Prisma.Decimal;
  unidad_medida: string;
};

type InsumoBloqueado = {
  id: number;
  stock_actual: Prisma.Decimal;
};

@Injectable()
export class OrdenesCompraService {
  constructor(private prisma: PrismaService) {}

  private async validarProveedor(proveedorId?: number) {
    if (proveedorId === undefined) return;

    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
      select: { id: true },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }
  }

  private async validarUsuario(usuarioId?: number) {
    if (usuarioId === undefined) return;

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  private async resolverGranja(
    granjaId: number | undefined,
    loteId: number | undefined,
    solicitante: Solicitante,
  ): Promise<number> {
    if (loteId !== undefined) {
      const lote = await this.prisma.lote.findUnique({
        where: { id: loteId },
        select: {
          id: true,
          galpon: {
            select: {
              granja: {
                select: { id: true, propietario_id: true },
              },
            },
          },
        },
      });

      if (!lote) {
        throw new NotFoundException('Lote no encontrado');
      }

      const granjaDelLote = lote.galpon.granja;
      verificarDueno(solicitante, granjaDelLote.propietario_id, SIN_ACCESO);

      if (granjaId !== undefined && granjaId !== granjaDelLote.id) {
        throw new BadRequestException(
          'El lote seleccionado no pertenece a la granja indicada',
        );
      }

      return granjaDelLote.id;
    }

    if (granjaId === undefined) {
      throw new BadRequestException(
        'Debes indicar granja_id cuando la orden no tiene lote',
      );
    }

    const granja = await this.prisma.granja.findUnique({
      where: { id: granjaId },
      select: { id: true, propietario_id: true },
    });

    if (!granja) {
      throw new NotFoundException('Granja no encontrada');
    }

    verificarDueno(solicitante, granja.propietario_id, SIN_ACCESO);
    return granja.id;
  }

  async crear(dto: CreateOrdenesCompraDto, solicitante: Solicitante) {
    if (dto.estado && dto.estado !== EstadoOrdenCompra.pendiente) {
      throw new BadRequestException(
        'Las órdenes nuevas deben iniciar pendientes',
      );
    }
    if (dto.fecha_entrega_real) {
      throw new BadRequestException(
        'La fecha real se registra al recibir la orden',
      );
    }
    const granjaId = await this.resolverGranja(
      dto.granja_id,
      dto.lote_id,
      solicitante,
    );
    await this.validarProveedor(dto.proveedor_id);
    await this.validarUsuario(dto.usuario_id);

    if (esPropietario(solicitante) && dto.usuario_id !== solicitante.id) {
      verificarDueno(
        solicitante,
        dto.usuario_id,
        'Solo puedes crear órdenes a tu nombre',
      );
    }

    try {
      return await this.prisma.ordenCompra.create({
        data: {
          granja_id: granjaId,
          proveedor_id: dto.proveedor_id,
          lote_id: dto.lote_id,
          codigo: dto.codigo,
          fecha_pedido: dto.fecha_pedido
            ? new Date(dto.fecha_pedido)
            : undefined,
          fecha_entrega_estimada: dto.fecha_entrega_estimada
            ? new Date(dto.fecha_entrega_estimada)
            : undefined,
          fecha_entrega_real: dto.fecha_entrega_real
            ? new Date(dto.fecha_entrega_real)
            : undefined,
          valor_total_cop: dto.valor_total_cop,
          estado: dto.estado,
          calificacion_cumplimiento: dto.calificacion_cumplimiento,
          calificacion_calidad: dto.calificacion_calidad,
          calificacion_tiempo: dto.calificacion_tiempo,
          usuario_id: dto.usuario_id,
        },
        include: ORDEN_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(
          'Ya existe una orden con ese código en la granja',
        );
      }

      throw error;
    }
  }

  async listar({ page, limit }: PaginationQueryDto, solicitante: Solicitante) {
    const where = esPropietario(solicitante)
      ? { granja: { propietario_id: solicitante.id } }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ordenCompra.findMany({
        where,
        include: ORDEN_INCLUDE,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ordenCompra.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: ORDEN_INCLUDE,
    });

    if (!orden) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    verificarDueno(solicitante, orden.granja.propietario_id, SIN_ACCESO);
    return orden;
  }

  async actualizar(
    id: number,
    dto: UpdateOrdenesCompraDto,
    solicitante: Solicitante,
  ) {
    const orden = await this.obtener(id, solicitante);
    if (
      dto.estado === EstadoOrdenCompra.en_proceso ||
      dto.estado === EstadoOrdenCompra.entregada
    ) {
      throw new BadRequestException(
        'El estado de recepción solo cambia al ingresar inventario',
      );
    }
    if (dto.fecha_entrega_real) {
      throw new BadRequestException(
        'La fecha real se registra al recibir la orden',
      );
    }
    if (orden.detalles.length > 0 && dto.valor_total_cop !== undefined) {
      throw new BadRequestException('El total se calcula desde los detalles');
    }
    await this.validarProveedor(dto.proveedor_id);
    await this.validarUsuario(dto.usuario_id);

    if (
      esPropietario(solicitante) &&
      dto.usuario_id !== undefined &&
      dto.usuario_id !== solicitante.id
    ) {
      verificarDueno(
        solicitante,
        dto.usuario_id,
        'Solo puedes registrar órdenes a tu nombre',
      );
    }

    const loteId =
      dto.lote_id !== undefined ? dto.lote_id : (orden.lote_id ?? undefined);
    const granjaSolicitada =
      dto.granja_id !== undefined
        ? dto.granja_id
        : dto.lote_id !== undefined
          ? undefined
          : orden.granja_id;
    const granjaId = await this.resolverGranja(
      granjaSolicitada,
      loteId,
      solicitante,
    );
    if (orden.detalles.length > 0 && granjaId !== orden.granja_id) {
      throw new BadRequestException(
        'No se puede cambiar de granja una orden que ya tiene detalles',
      );
    }

    try {
      return await this.prisma.ordenCompra.update({
        where: { id },
        data: {
          granja_id: granjaId,
          proveedor_id: dto.proveedor_id,
          lote_id: dto.lote_id,
          codigo: dto.codigo,
          fecha_pedido: dto.fecha_pedido
            ? new Date(dto.fecha_pedido)
            : undefined,
          fecha_entrega_estimada: dto.fecha_entrega_estimada
            ? new Date(dto.fecha_entrega_estimada)
            : undefined,
          fecha_entrega_real: dto.fecha_entrega_real
            ? new Date(dto.fecha_entrega_real)
            : undefined,
          valor_total_cop: dto.valor_total_cop,
          estado: dto.estado,
          calificacion_cumplimiento: dto.calificacion_cumplimiento,
          calificacion_calidad: dto.calificacion_calidad,
          calificacion_tiempo: dto.calificacion_tiempo,
          usuario_id: dto.usuario_id,
        },
        include: ORDEN_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(
          'Ya existe una orden con ese código en la granja',
        );
      }

      throw error;
    }
  }

  async agregarDetalle(
    id: number,
    dto: CreateDetalleOrdenDto,
    solicitante: Solicitante,
  ) {
    const orden = await this.obtener(id, solicitante);
    if (
      orden.estado === EstadoOrdenCompra.cancelada ||
      orden.estado === EstadoOrdenCompra.entregada
    ) {
      throw new BadRequestException(
        'No se pueden modificar los detalles de esta orden',
      );
    }

    const insumo = await this.prisma.inventarioInsumo.findUnique({
      where: { id: dto.insumo_id },
      select: { id: true, granja_id: true, unidad_medida: true, activo: true },
    });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    if (!insumo.activo)
      throw new BadRequestException('El insumo está inactivo');
    if (insumo.granja_id !== orden.granja_id) {
      throw new BadRequestException(
        'El insumo no pertenece a la granja de la orden',
      );
    }

    const cantidad = new Prisma.Decimal(dto.cantidad);
    const precio = new Prisma.Decimal(dto.precio_unitario_cop);
    const subtotal = cantidad.mul(precio).toDecimalPlaces(2);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const detalle = await tx.detalleOrdenCompra.create({
          data: {
            orden_compra_id: id,
            insumo_id: dto.insumo_id,
            cantidad,
            unidad_medida: insumo.unidad_medida,
            precio_unitario_cop: precio,
            subtotal_cop: subtotal,
          },
          include: { insumo: true },
        });
        const total = await tx.detalleOrdenCompra.aggregate({
          where: { orden_compra_id: id },
          _sum: { subtotal_cop: true },
        });
        await tx.ordenCompra.update({
          where: { id },
          data: { valor_total_cop: total._sum.subtotal_cop ?? 0 },
        });
        return detalle;
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('El insumo ya está incluido en la orden');
      }
      throw error;
    }
  }

  async eliminarDetalle(
    id: number,
    detalleId: number,
    solicitante: Solicitante,
  ) {
    await this.obtener(id, solicitante);
    const detalle = await this.prisma.detalleOrdenCompra.findFirst({
      where: { id: detalleId, orden_compra_id: id },
      select: { id: true, cantidad_recibida: true },
    });
    if (!detalle) throw new NotFoundException('Detalle de orden no encontrado');
    if (!detalle.cantidad_recibida.isZero()) {
      throw new BadRequestException(
        'No se puede eliminar un detalle ya recibido',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.detalleOrdenCompra.delete({ where: { id: detalleId } });
      const total = await tx.detalleOrdenCompra.aggregate({
        where: { orden_compra_id: id },
        _sum: { subtotal_cop: true },
      });
      await tx.ordenCompra.update({
        where: { id },
        data: { valor_total_cop: total._sum.subtotal_cop ?? 0 },
      });
    });
    return { id: detalleId, eliminado: true };
  }

  async recibir(id: number, dto: RecibirOrdenDto, solicitante: Solicitante) {
    const orden = await this.obtener(id, solicitante);
    const clave = dto.clave_idempotencia.trim();
    const ids = dto.items.map((item) => item.detalle_id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'No se puede repetir un detalle en la recepción',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const existentes = await tx.movimientoInventario.findMany({
        where: {
          clave_idempotencia: clave,
          detalle_orden_compra: { orden_compra_id: id },
        },
        select: { detalle_orden_compra_id: true, cantidad: true },
      });
      if (existentes.length > 0) {
        const recibidos = new Map(
          existentes.map((movimiento) => [
            movimiento.detalle_orden_compra_id,
            movimiento.cantidad.toString(),
          ]),
        );
        const coincide =
          recibidos.size === dto.items.length &&
          dto.items.every(
            (item) =>
              recibidos.get(item.detalle_id) ===
              new Prisma.Decimal(item.cantidad).toString(),
          );
        if (!coincide) {
          throw new ConflictException(
            'La clave idempotente ya se usó con otros datos',
          );
        }
        return { idempotente: true, movimientos: existentes };
      }

      if (
        orden.estado === EstadoOrdenCompra.cancelada ||
        orden.estado === EstadoOrdenCompra.entregada
      ) {
        throw new BadRequestException('La orden no admite nuevas recepciones');
      }

      const detalles = await tx.$queryRaw<DetalleBloqueado[]>`
        SELECT "id", "insumo_id", "cantidad", "cantidad_recibida", "unidad_medida"
        FROM "detalles_ordenes_compra"
        WHERE "orden_compra_id" = ${id}
        ORDER BY "id" FOR UPDATE
      `;
      const porId = new Map(detalles.map((detalle) => [detalle.id, detalle]));
      if (dto.items.some((item) => !porId.has(item.detalle_id))) {
        throw new BadRequestException(
          'Hay detalles que no pertenecen a la orden',
        );
      }

      const insumoIds = [
        ...new Set(
          dto.items.map((item) => porId.get(item.detalle_id)!.insumo_id),
        ),
      ];
      const insumos = await tx.$queryRaw<InsumoBloqueado[]>(Prisma.sql`
        SELECT "id", "stock_actual" FROM "inventario_insumos"
        WHERE "id" IN (${Prisma.join(insumoIds)})
        ORDER BY "id" FOR UPDATE
      `);
      const stockPorInsumo = new Map(
        insumos.map((insumo) => [
          insumo.id,
          new Prisma.Decimal(insumo.stock_actual),
        ]),
      );
      const nuevosRecibidos = new Map<number, Prisma.Decimal>();
      const movimientos = [];

      for (const item of dto.items) {
        const detalle = porId.get(item.detalle_id)!;
        const cantidad = new Prisma.Decimal(item.cantidad);
        const recibida = new Prisma.Decimal(detalle.cantidad_recibida).plus(
          cantidad,
        );
        if (recibida.gt(detalle.cantidad)) {
          throw new BadRequestException(
            `La recepción supera la cantidad pedida del detalle ${detalle.id}`,
          );
        }
        const stock = stockPorInsumo.get(detalle.insumo_id);
        if (!stock) throw new NotFoundException('Insumo no encontrado');
        const stockResultante = stock.plus(cantidad);
        stockPorInsumo.set(detalle.insumo_id, stockResultante);
        nuevosRecibidos.set(detalle.id, recibida);

        await tx.inventarioInsumo.update({
          where: { id: detalle.insumo_id },
          data: { stock_actual: stockResultante },
        });
        await tx.detalleOrdenCompra.update({
          where: { id: detalle.id },
          data: { cantidad_recibida: recibida },
        });
        movimientos.push(
          await tx.movimientoInventario.create({
            data: {
              insumo_id: detalle.insumo_id,
              lote_id: orden.lote_id,
              detalle_orden_compra_id: detalle.id,
              clave_idempotencia: clave,
              tipo_movimiento: TipoMovimientoInventario.entrada,
              cantidad,
              unidad_medida: detalle.unidad_medida,
              motivo: `Recepción orden ${orden.codigo}`,
              comprobante_url: dto.comprobante_url,
              stock_resultante: stockResultante,
              usuario_id: solicitante.id,
            },
          }),
        );
      }

      const completa = detalles.every((detalle) =>
        (nuevosRecibidos.get(detalle.id) ?? detalle.cantidad_recibida).eq(
          detalle.cantidad,
        ),
      );
      await tx.ordenCompra.update({
        where: { id },
        data: {
          estado: completa
            ? EstadoOrdenCompra.entregada
            : EstadoOrdenCompra.en_proceso,
          fecha_entrega_real: completa ? new Date() : undefined,
        },
      });
      return { idempotente: false, completa, movimientos };
    });
  }

  async eliminar(id: number, solicitante: Solicitante) {
    const orden = await this.obtener(id, solicitante);
    if (orden.detalles.length > 0) {
      throw new BadRequestException(
        'Elimina primero los detalles no recibidos de la orden',
      );
    }

    await this.prisma.ordenCompra.delete({
      where: { id },
    });

    return { id, eliminado: true };
  }
}
