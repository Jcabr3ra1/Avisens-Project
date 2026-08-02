import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';

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

  async crear(dto: CreateInsumoDto) {
    await this.validarProveedor(dto.proveedor_habitual_id);
    return this.prisma.inventarioInsumo.create({
      data: {
        nombre: dto.nombre,
        tipo: dto.tipo,
        unidad_medida: dto.unidad_medida,
        stock_actual: dto.stock_actual,
        stock_minimo: dto.stock_minimo,
        precio_unitario_cop: dto.precio_unitario_cop,
        proveedor_habitual_id: dto.proveedor_habitual_id,
        ubicacion_almacen: dto.ubicacion_almacen,
        fecha_vencimiento: dto.fecha_vencimiento
          ? new Date(dto.fecha_vencimiento)
          : undefined,
      },
    });
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventarioInsumo.findMany({
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventarioInsumo.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const insumo = await this.prisma.inventarioInsumo.findUnique({
      where: { id },
    });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    return insumo;
  }

  async actualizar(id: number, dto: UpdateInsumoDto) {
    await this.obtener(id);
    await this.validarProveedor(dto.proveedor_habitual_id);
    return this.prisma.inventarioInsumo.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        tipo: dto.tipo,
        unidad_medida: dto.unidad_medida,
        stock_actual: dto.stock_actual,
        stock_minimo: dto.stock_minimo,
        precio_unitario_cop: dto.precio_unitario_cop,
        proveedor_habitual_id: dto.proveedor_habitual_id,
        ubicacion_almacen: dto.ubicacion_almacen,
        fecha_vencimiento: dto.fecha_vencimiento
          ? new Date(dto.fecha_vencimiento)
          : undefined,
        activo: dto.activo,
      },
    });
  }

  async desactivar(id: number) {
    await this.obtener(id);
    await this.prisma.inventarioInsumo.update({
      where: { id },
      data: { activo: false },
    });
    return { id, activo: false };
  }

  async activar(id: number) {
    await this.obtener(id);
    await this.prisma.inventarioInsumo.update({
      where: { id },
      data: { activo: true },
    });
    return { id, activo: true };
  }

  async eliminarPermanente(id: number) {
    await this.obtener(id);
    await this.prisma.inventarioInsumo.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
