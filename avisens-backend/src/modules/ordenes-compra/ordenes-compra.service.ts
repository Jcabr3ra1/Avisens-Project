import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { CreateOrdenesCompraDto } from './dto/create-ordenes-compra.dto';
import { UpdateOrdenesCompraDto } from './dto/update-ordenes-compra.dto';

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

  private async validarLote(loteId?: number) {
    if (loteId === undefined) return;

    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      select: { id: true },
    });

    if (!lote) {
      throw new NotFoundException('Lote no encontrado');
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

  async crear(dto: CreateOrdenesCompraDto) {
    await this.validarProveedor(dto.proveedor_id);
    await this.validarLote(dto.lote_id);
    await this.validarUsuario(dto.usuario_id);

    try {
      return await this.prisma.ordenCompra.create({
        data: {
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
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Ya existen una orden con ese codigo');
      }

      throw error;
    }
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.ordenCompra.findMany({
        include: {
          proveedor: true,
          lote: true,
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ordenCompra.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        lote: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    return orden;
  }

  async actualizar(id: number, dto: UpdateOrdenesCompraDto) {
    await this.obtener(id);
    await this.validarProveedor(dto.proveedor_id);
    await this.validarLote(dto.lote_id);
    await this.validarUsuario(dto.usuario_id);

    try {
      return await this.prisma.ordenCompra.update({
        where: { id },
        data: {
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
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Ya existe una orden con ese código');
      }

      throw error;
    }
  }

  async eliminar(id: number) {
    await this.obtener(id);

    await this.prisma.ordenCompra.delete({
      where: { id },
    });

    return { id, eliminado: true };
  }
}
