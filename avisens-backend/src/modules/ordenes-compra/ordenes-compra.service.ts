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
import { esPropietario, verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';

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

  private async validarLote(loteId?: number, solicitante?: Solicitante) {
    if (loteId === undefined) return;

    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      include: { galpon: { include: { granja: true } } },
    });

    if (!lote) {
      throw new NotFoundException('Lote no encontrado');
    }

    if (solicitante) {
      verificarDueno(solicitante, lote.galpon.granja.propietario_id, 'No tienes acceso a este lote');
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

  async crear(dto: CreateOrdenesCompraDto, solicitante?: Solicitante) {
    await this.validarProveedor(dto.proveedor_id);
    await this.validarLote(dto.lote_id, solicitante);
    await this.validarUsuario(dto.usuario_id);
    if (solicitante && esPropietario(solicitante) && dto.usuario_id !== solicitante.id) {
      verificarDueno(solicitante, dto.usuario_id, 'Solo puedes crear órdenes a tu nombre');
    }

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

  async listar({ page, limit }: PaginationQueryDto, solicitante?: Solicitante) {
    const where =
      solicitante && esPropietario(solicitante)
        ? { lote: { galpon: { granja: { propietario_id: solicitante.id } } } }
        : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.ordenCompra.findMany({
        where,
        include: {
          proveedor: true,
          lote: true,
          usuario: {
            select: {
              id: true,
              nombre_completo: true,
              email: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ordenCompra.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante?: Solicitante) {
    const orden = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        lote: true,
        usuario: {
          select: {
            id: true,
            nombre_completo: true,
            email: true,
          },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (solicitante && esPropietario(solicitante) && orden.lote) {
      const lote = await this.prisma.lote.findUnique({ where: { id: orden.lote_id! }, include: { galpon: { include: { granja: true } } } });
      if (lote) verificarDueno(solicitante, lote.galpon.granja.propietario_id, 'No tienes acceso a esta orden');
    }

    return orden;
  }

  async actualizar(id: number, dto: UpdateOrdenesCompraDto, solicitante?: Solicitante) {
    await this.obtener(id, solicitante);
    await this.validarProveedor(dto.proveedor_id);
    await this.validarLote(dto.lote_id, solicitante);
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

  async eliminar(id: number, solicitante?: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.ordenCompra.delete({
      where: { id },
    });

    return { id, eliminado: true };
  }
}
