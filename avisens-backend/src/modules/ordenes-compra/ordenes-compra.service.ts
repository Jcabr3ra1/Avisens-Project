import {
  BadRequestException,
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
} as const;

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

  async eliminar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.ordenCompra.delete({
      where: { id },
    });

    return { id, eliminado: true };
  }
}
