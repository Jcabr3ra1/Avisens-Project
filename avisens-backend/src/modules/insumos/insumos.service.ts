import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoMovimientoInventario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';

const SIN_ACCESO = 'Solo puedes gestionar insumos de tus propias granjas';

const INSUMO_SELECT = {
  id: true,
  granja_id: true,
  nombre: true,
  tipo: true,
  unidad_medida: true,
  stock_actual: true,
  stock_minimo: true,
  precio_unitario_cop: true,
  proveedor_habitual_id: true,
  ubicacion_almacen: true,
  fecha_vencimiento: true,
  activo: true,
  fecha_actualizacion: true,
  granja: {
    select: { id: true, nombre: true, propietario_id: true },
  },
} as const;

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
} as const;

@Injectable()
export class InsumosService {
  constructor(private prisma: PrismaService) {}

  private async validarProveedor(proveedorId?: number) {
    if (proveedorId === undefined) return;
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
      select: { id: true },
    });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
  }

  private async validarGranja(granjaId: number, solicitante: Solicitante) {
    const granja = await this.prisma.granja.findUnique({
      where: { id: granjaId },
      select: { propietario_id: true },
    });
    if (!granja) throw new NotFoundException('Granja no encontrada');
    verificarDueno(solicitante, granja.propietario_id, SIN_ACCESO);
  }

  async crear(dto: CreateInsumoDto, solicitante: Solicitante) {
    await this.validarGranja(dto.granja_id, solicitante);
    await this.validarProveedor(dto.proveedor_habitual_id);

    return this.prisma.$transaction(async (tx) => {
      const insumo = await tx.inventarioInsumo.create({
        data: {
          granja_id: dto.granja_id,
          nombre: dto.nombre,
          tipo: dto.tipo,
          unidad_medida: dto.unidad_medida,
          stock_actual: dto.stock_actual ?? 0,
          stock_minimo: dto.stock_minimo,
          precio_unitario_cop: dto.precio_unitario_cop,
          proveedor_habitual_id: dto.proveedor_habitual_id,
          ubicacion_almacen: dto.ubicacion_almacen,
          fecha_vencimiento: dto.fecha_vencimiento
            ? new Date(dto.fecha_vencimiento)
            : undefined,
        },
        select: INSUMO_SELECT,
      });

      // El stock inicial tambien deja rastro: sin este movimiento, el primer
      // valor del inventario seria el unico que nadie puede explicar.
      if (insumo.stock_actual.gt(0)) {
        await tx.movimientoInventario.create({
          data: {
            insumo_id: insumo.id,
            tipo_movimiento: TipoMovimientoInventario.entrada,
            cantidad: insumo.stock_actual,
            unidad_medida: insumo.unidad_medida,
            motivo: 'Stock inicial',
            stock_resultante: insumo.stock_actual,
            usuario_id: solicitante.id,
          },
        });
      }

      return insumo;
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where: Prisma.InventarioInsumoWhereInput | undefined = esPropietario(
      solicitante,
    )
      ? { granja: { propietario_id: solicitante.id } }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventarioInsumo.findMany({
        where,
        select: INSUMO_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventarioInsumo.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const insumo = await this.prisma.inventarioInsumo.findUnique({
      where: { id },
      select: INSUMO_SELECT,
    });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    verificarDueno(solicitante, insumo.granja.propietario_id, SIN_ACCESO);
    return insumo;
  }

  async actualizar(
    id: number,
    dto: UpdateInsumoDto,
    solicitante: Solicitante,
  ) {
    await this.obtener(id, solicitante);
    await this.validarProveedor(dto.proveedor_habitual_id);
    return this.prisma.inventarioInsumo.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        tipo: dto.tipo,
        unidad_medida: dto.unidad_medida,
        stock_minimo: dto.stock_minimo,
        precio_unitario_cop: dto.precio_unitario_cop,
        proveedor_habitual_id: dto.proveedor_habitual_id,
        ubicacion_almacen: dto.ubicacion_almacen,
        fecha_vencimiento: dto.fecha_vencimiento
          ? new Date(dto.fecha_vencimiento)
          : undefined,
        activo: dto.activo,
      },
      select: INSUMO_SELECT,
    });
  }

  async registrarMovimiento(
    id: number,
    dto: RegistrarMovimientoDto,
    solicitante: Solicitante,
  ) {
    const insumo = await this.obtener(id, solicitante);

    if (dto.lote_id !== undefined) {
      const lote = await this.prisma.lote.findUnique({
        where: { id: dto.lote_id },
        select: { id: true },
      });
      if (!lote) throw new NotFoundException('Lote no encontrado');
    }

    const cantidad = new Prisma.Decimal(dto.cantidad);

    // Todo ocurre dentro de una transaccion con la fila bloqueada. Si se
    // leyera el stock fuera, dos movimientos simultaneos leerian el mismo
    // valor y uno pisaria al otro: el inventario quedaria con un numero que
    // sus propios movimientos no explican, que es justo lo que este modulo
    // existe para evitar.
    return this.prisma.$transaction(async (tx) => {
      const [fila] = await tx.$queryRaw<Array<{ stock_actual: Prisma.Decimal }>>`
        SELECT "stock_actual" FROM "inventario_insumos"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      if (!fila) throw new NotFoundException('Insumo no encontrado');

      const stockResultante = this.calcularStock(
        new Prisma.Decimal(fila.stock_actual),
        dto.tipo_movimiento,
        cantidad,
      );

      await tx.inventarioInsumo.update({
        where: { id },
        data: { stock_actual: stockResultante },
      });

      return tx.movimientoInventario.create({
        data: {
          insumo_id: id,
          lote_id: dto.lote_id,
          tipo_movimiento: dto.tipo_movimiento,
          cantidad,
          unidad_medida: insumo.unidad_medida,
          motivo: dto.motivo,
          comprobante_url: dto.comprobante_url,
          stock_resultante: stockResultante,
          usuario_id: solicitante.id,
        },
        select: MOVIMIENTO_SELECT,
      });
    });
  }

  private calcularStock(
    stockActual: Prisma.Decimal,
    tipo: TipoMovimientoInventario,
    cantidad: Prisma.Decimal,
  ): Prisma.Decimal {
    if (tipo === TipoMovimientoInventario.entrada) {
      return stockActual.plus(cantidad);
    }
    if (tipo === TipoMovimientoInventario.ajuste) {
      // En un ajuste la cantidad no se suma ni se resta: es el stock real que
      // se conto en bodega y que pasa a mandar sobre el registrado.
      return cantidad;
    }
    const resultante = stockActual.minus(cantidad);
    if (resultante.isNegative()) {
      throw new BadRequestException(
        `No hay stock suficiente: hay ${stockActual.toString()} y se intentan sacar ${cantidad.toString()}`,
      );
    }
    return resultante;
  }

  async listarMovimientos(
    id: number,
    solicitante: Solicitante,
    { page, limit }: PaginationQueryDto,
  ) {
    await this.obtener(id, solicitante);

    const where = { insumo_id: id };
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

  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    await this.prisma.inventarioInsumo.update({
      where: { id },
      data: { activo: false },
    });
    return { id, activo: false };
  }

  async activar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    await this.prisma.inventarioInsumo.update({
      where: { id },
      data: { activo: true },
    });
    return { id, activo: true };
  }

  async eliminarPermanente(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    await this.prisma.inventarioInsumo.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
