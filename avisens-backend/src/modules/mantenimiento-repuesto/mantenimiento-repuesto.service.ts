import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMantenimientoRepuestoDto } from "./dto/create-mantenimiento-repuesto.dto";
import { PaginationQueryDto } from "../../common/pagination/pagination-query.dto";
import { UpdateMantenimientoRepuestoDto } from "./dto/update-mantenimiento-repuesto.dto";

function paginate<T>(data: T[], total: number, page: number, limit: number) {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

@Injectable()
export class MantenimientoRepuestoService {
  constructor(private prisma: PrismaService) {}

  private async validarMantenimiento(mantenimientoId: number) {
    const mantenimiento = await this.prisma.mantenimiento.findUnique({
      where: { id: mantenimientoId },
      select: { id: true },
    });
    if (!mantenimiento) {
      throw new NotFoundException('Mantenimiento no encontrado');
    }
  }

  private async validarInsumo(insumoId: number) {
    const insumo = await this.prisma.inventarioInsumo.findUnique({
      where: { id: insumoId },
      select: { id: true },
    });
    if (!insumo) {
      throw new NotFoundException('Insumo (repuesto) no encontrado');
    }
  }

  async crear(dto: CreateMantenimientoRepuestoDto) {
    await this.validarMantenimiento(dto.mantenimiento_id);
    await this.validarInsumo(dto.insumo_id);

    return this.prisma.mantenimientoRepuesto.create({
      data: {
        mantenimiento_id: dto.mantenimiento_id,
        insumo_id: dto.insumo_id,
        descripcion: dto.description,
        cantidad: dto.cantidad,
        costo_cop: dto.costo_cop,
      },
    });
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.mantenimientoRepuesto.findMany({
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mantenimientoRepuesto.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async listarPorMantenimiento(
    mantenimientoId: number,
    { page, limit }: PaginationQueryDto,
  ) {
    await this.validarMantenimiento(mantenimientoId);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.mantenimientoRepuesto.findMany({
        where: { mantenimiento_id: mantenimientoId },
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mantenimientoRepuesto.count({
        where: { mantenimiento_id: mantenimientoId },
      }),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const repuesto = await this.prisma.mantenimientoRepuesto.findUnique({
      where: { id },
    });
    if (!repuesto) {
      throw new NotFoundException('Repuesto de mantenimiento no encontrado');
    }
    return repuesto;
  }

  async actualizar(id: number, dto: UpdateMantenimientoRepuestoDto) {
    await this.obtener(id);

    if (dto.mantenimiento_id !== undefined) {
      await this.validarMantenimiento(dto.mantenimiento_id);
    }
    if (dto.insumo_id !== undefined) {
      await this.validarInsumo(dto.insumo_id);
    }

    return this.prisma.mantenimientoRepuesto.update({
      where: { id },
      data: {
        mantenimiento_id: dto.mantenimiento_id,
        insumo_id: dto.insumo_id,
        descripcion: dto.description,
        cantidad: dto.cantidad,
        costo_cop: dto.costo_cop,
      },
    });
  }

  async eliminar(id: number) {
    await this.obtener(id);
    await this.prisma.mantenimientoRepuesto.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
