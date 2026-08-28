import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { CreateModeloMlDto } from './dto/create-modelo-ml.dto';
import { UpdateModeloMlDto } from './dto/update-modelo-ml.dto';

const SELECT = {
  id: true,
  nombre: true,
  tipo: true,
  objetivo: true,
  version: true,
  framework: true,
  metricas: true,
  activo: true,
  fecha_entrenamiento: true,
  fecha_creacion: true,
} as const;

@Injectable()
export class ModelosMlService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateModeloMlDto) {
    try {
      return await this.prisma.modeloMl.create({
        data: {
          nombre: dto.nombre,
          tipo: dto.tipo,
          objetivo: dto.objetivo,
          version: dto.version,
          framework: dto.framework,
          metricas: dto.metricas as unknown as Prisma.InputJsonValue,
          activo: dto.activo ?? true,
        },
        select: SELECT,
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(`Ya existe un modelo "${dto.nombre}" versión "${dto.version}"`);
      }
      throw error;
    }
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.modeloMl.findMany({
        select: SELECT,
        orderBy: { fecha_creacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.modeloMl.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const modelo = await this.prisma.modeloMl.findUnique({
      where: { id },
      select: SELECT,
    });
    if (!modelo) throw new NotFoundException(`Modelo con ID ${id} no encontrado`);
    return modelo;
  }

  async actualizar(id: number, dto: UpdateModeloMlDto) {
    await this.obtener(id);
    return this.prisma.modeloMl.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        tipo: dto.tipo,
        objetivo: dto.objetivo,
        version: dto.version,
        framework: dto.framework,
        metricas: dto.metricas as unknown as Prisma.InputJsonValue,
        activo: dto.activo,
      },
      select: SELECT,
    });
  }

  async eliminar(id: number) {
    await this.obtener(id);
    await this.prisma.modeloMl.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
