import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { CreateMovimientoInventarioDto } from './dto/create-movimiento-inventario.dto';

const SELECT = {
  id: true,
  insumo_id: true,
  lote_id: true,
  tipo_movimiento: true,
  cantidad: true,
  unidad_medida: true,
  motivo: true,
  stock_resultante: true,
  usuario_id: true,
  fecha_movimiento: true,
  insumo: { select: { id: true, nombre: true, tipo: true } },
  lote: { select: { id: true, codigo: true } },
} as const;

@Injectable()
export class MovimientosInventarioService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateMovimientoInventarioDto) {
    return this.prisma.movimientoInventario.create({
      data: {
        insumo_id: dto.insumo_id,
        tipo_movimiento: dto.tipo_movimiento as 'entrada' | 'salida' | 'ajuste',
        cantidad: dto.cantidad as unknown as Prisma.Decimal,
        lote_id: dto.lote_id,
        unidad_medida: dto.unidad_medida,
        motivo: dto.motivo,
        usuario_id: dto.usuario_id ?? 1,
      },
      select: SELECT,
    });
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.movimientoInventario.findMany({
        select: SELECT,
        orderBy: { fecha_movimiento: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.movimientoInventario.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const mov = await this.prisma.movimientoInventario.findUnique({
      where: { id },
      select: SELECT,
    });
    if (!mov) throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    return mov;
  }

  async eliminar(id: number) {
    await this.obtener(id);
    await this.prisma.movimientoInventario.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
