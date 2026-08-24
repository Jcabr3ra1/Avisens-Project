import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';

const EQUIPO_SELECT = {
  id: true,
  galpon_id: true,
  zona_id: true,
  codigo: true,
  nombre: true,
  tipo: true,
  es_actuador: true,
  modelo: true,
  fabricante: true,
  serial: true,
  fecha_compra: true,
  fecha_instalacion: true,
  vida_util_horas: true,
  horas_operacion: true,
  estado_actual: true,
  modo_operacion: true,
  coordenada_x: true,
  coordenada_y: true,
  costo_cop: true,
  galpon: {
    select: { id: true, nombre: true, codigo: true },
  },
} as const;

@Injectable()
export class EquiposService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateEquipoDto) {
    try {
      return await this.prisma.equipo.create({
        data: {
          galpon_id: dto.galpon_id,
          codigo: dto.codigo,
          nombre: dto.nombre,
          tipo: dto.tipo,
          es_actuador: dto.es_actuador ?? false,
          modelo: dto.modelo,
          fabricante: dto.fabricante,
          serial: dto.serial,
          fecha_compra: dto.fecha_compra ? new Date(dto.fecha_compra) : undefined,
          fecha_instalacion: dto.fecha_instalacion ? new Date(dto.fecha_instalacion) : undefined,
          vida_util_horas: dto.vida_util_horas,
          estado_actual: dto.estado_actual ?? 'operativo',
          modo_operacion: dto.modo_operacion,
          coordenada_x: dto.coordenada_x,
          coordenada_y: dto.coordenada_y,
          costo_cop: dto.costo_cop,
        },
        select: EQUIPO_SELECT,
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(`Ya existe un equipo con el código "${dto.codigo}"`);
      }
      throw error;
    }
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.equipo.findMany({
        select: EQUIPO_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.equipo.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { id },
      select: EQUIPO_SELECT,
    });
    if (!equipo) throw new NotFoundException(`Equipo con ID ${id} no encontrado`);
    return equipo;
  }

  async actualizar(id: number, dto: UpdateEquipoDto) {
    await this.obtener(id);
    try {
      return await this.prisma.equipo.update({
        where: { id },
        data: {
          galpon_id: dto.galpon_id,
          codigo: dto.codigo,
          nombre: dto.nombre,
          tipo: dto.tipo,
          es_actuador: dto.es_actuador,
          modelo: dto.modelo,
          fabricante: dto.fabricante,
          serial: dto.serial,
          fecha_compra: dto.fecha_compra ? new Date(dto.fecha_compra) : undefined,
          fecha_instalacion: dto.fecha_instalacion ? new Date(dto.fecha_instalacion) : undefined,
          vida_util_horas: dto.vida_util_horas,
          estado_actual: dto.estado_actual,
          modo_operacion: dto.modo_operacion,
          coordenada_x: dto.coordenada_x,
          coordenada_y: dto.coordenada_y,
          costo_cop: dto.costo_cop,
        },
        select: EQUIPO_SELECT,
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(`Ya existe un equipo con el código "${dto.codigo}"`);
      }
      throw error;
    }
  }

  async eliminar(id: number) {
    await this.obtener(id);
    await this.prisma.equipo.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
