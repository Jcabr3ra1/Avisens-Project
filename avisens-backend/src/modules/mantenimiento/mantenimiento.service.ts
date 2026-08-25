import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';
import { UpdateMantenimientoDto } from './dto/update-mantenimiento.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { esPropietario, verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';

@Injectable()
export class MantenimientoService {
  constructor(private readonly prisma: PrismaService) {}

  private async validarEquipo(equipoId: number, solicitante: Solicitante) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { id: equipoId },
      include: {
        galpon: {
          include: {
            granja: true,
          },
        },
      },
    });

    if (!equipo) {
      throw new NotFoundException(`El equipo con ID ${equipoId} no existe`);
    }

    verificarDueno(
      solicitante,
      equipo.galpon.granja.propietario_id,
      'No tienes acceso a este equipo',
    );

    return equipo;
  }

  async create(createDto: CreateMantenimientoDto, solicitante: Solicitante) {
    const { fecha_programada, fecha_ejecucion, equipo_id, ...data } = createDto;

    if (!fecha_programada) {
      throw new BadRequestException('La fecha programada es obligatoria');
    }

    await this.validarEquipo(equipo_id, solicitante);

    return this.prisma.mantenimiento.create({
      data: {
        ...data,
        equipo_id,
        fecha_programada: new Date(fecha_programada),
        ...(fecha_ejecucion && {
          fecha_ejecucion: new Date(fecha_ejecucion),
        }),
      },
      include: {
        equipo: true,
      },
    });
  }

  async findAll(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = esPropietario(solicitante)
      ? {
          equipo: {
            galpon: {
              granja: {
                propietario_id: solicitante.id,
              },
            },
          },
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.mantenimiento.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          fecha_programada: 'desc',
        },
        include: {
          equipo: true,
        },
      }),
      this.prisma.mantenimiento.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string, solicitante: Solicitante) {
    const mantenimiento = await this.prisma.mantenimiento.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        equipo: {
          include: {
            galpon: {
              include: {
                granja: true,
              },
            },
          },
        },
      },
    });

    if (!mantenimiento) {
      throw new NotFoundException(
        `No se encontró el mantenimiento con ID ${id}`,
      );
    }

    verificarDueno(
      solicitante,
      mantenimiento.equipo.galpon.granja.propietario_id,
      'No tienes acceso a este mantenimiento',
    );

    return mantenimiento;
  }

  async update(
    id: string,
    updateDto: UpdateMantenimientoDto,
    solicitante: Solicitante,
  ) {
    await this.findOne(id, solicitante);

    if (updateDto.equipo_id !== undefined) {
      await this.validarEquipo(updateDto.equipo_id, solicitante);
    }

    const { fecha_programada, fecha_ejecucion, ...data } = updateDto;

    return this.prisma.mantenimiento.update({
      where: {
        id: Number(id),
      },
      data: {
        ...data,

        ...(fecha_programada && {
          fecha_programada: new Date(fecha_programada),
        }),

        ...(fecha_ejecucion && {
          fecha_ejecucion: new Date(fecha_ejecucion),
        }),
      },
      include: {
        equipo: true,
      },
    });
  }

  async remove(id: string, solicitante: Solicitante) {
    await this.findOne(id, solicitante);

    await this.prisma.mantenimiento.delete({
      where: {
        id: Number(id),
      },
    });

    return {
      message: 'Mantenimiento eliminado correctamente',
      id: Number(id),
    };
  }
}
