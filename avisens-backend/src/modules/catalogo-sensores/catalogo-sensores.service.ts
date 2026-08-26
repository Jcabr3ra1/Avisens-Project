import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { CreateCatalogoSensorDto } from './dto/create-catalogo-sensor.dto';
import { UpdateCatalogoSensorDto } from './dto/update-catalogo-sensor.dto';

@Injectable()
export class CatalogoSensoresService {
  constructor(private prisma: PrismaService) {}

  crear(dto: CreateCatalogoSensorDto) {
    return this.prisma.catalogoSensor.create({ data: dto });
  }

  async listar({ page, limit }: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.catalogoSensor.findMany({
        orderBy: { tipo_sensor: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.catalogoSensor.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const sensor = await this.prisma.catalogoSensor.findUnique({
      where: { id },
    });
    if (!sensor)
      throw new NotFoundException('Sensor de catálogo no encontrado');
    return sensor;
  }

  async actualizar(id: number, dto: UpdateCatalogoSensorDto) {
    await this.obtener(id);
    return this.prisma.catalogoSensor.update({ where: { id }, data: dto });
  }

  async cambiarEstado(id: number, activo: boolean) {
    await this.obtener(id);
    await this.prisma.catalogoSensor.update({
      where: { id },
      data: { activo },
    });
    return { id, activo };
  }
}
