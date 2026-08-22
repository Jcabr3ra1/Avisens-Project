import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginate';
import { ListarProspectosDto } from './dto/listar-prospectos.dto';

const PROSPECTO_LISTA = {
  id: true,
  nombre: true,
  nombre_granja: true,
  telefono: true,
  municipio: true,
  canal_origen: true,
  puntaje_total: true,
  clasificacion: true,
  estado: true,
  asesor_asignado_id: true,
  fecha_inicio: true,
  fecha_finalizacion: true,
};

@Injectable()
export class ProspectosService {
  constructor(private prisma: PrismaService) {}

  async listar(dto: ListarProspectosDto) {
    const { page, limit, clasificacion, estado, sin_asignar } = dto;

    const where: Prisma.ProspectoWhereInput = {
      ...(clasificacion ? { clasificacion } : {}),
      ...(estado ? { estado } : {}),
      ...(sin_asignar ? { asesor_asignado_id: null } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.prospecto.findMany({
        where,
        select: PROSPECTO_LISTA,
        orderBy: [{ puntaje_total: 'desc' }, { fecha_inicio: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.prospecto.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number) {
    const prospecto = await this.prisma.prospecto.findUnique({
      where: { id },
      omit: { sesion_id: true },
      include: {
        respuestas: {
          orderBy: { id: 'asc' },
          select: {
            codigo_pregunta: true,
            pregunta_texto: true,
            respuesta_texto: true,
            puntaje_obtenido: true,
          },
        },
        asesor: { select: { id: true, nombre_completo: true, email: true } },
      },
    });
    if (!prospecto) throw new NotFoundException('Prospecto no encontrado');

    return prospecto;
  }

  async asignar(id: number, asesorId: number) {
    const prospecto = await this.prisma.prospecto.findUnique({
      where: { id },
      select: { id: true, estado: true, clasificacion: true },
    });
    if (!prospecto) throw new NotFoundException('Prospecto no encontrado');

    if (prospecto.estado !== 'calificado') {
      throw new BadRequestException(
        'Solo se pueden asignar prospectos ya calificados',
      );
    }

    const asesor = await this.prisma.usuario.findFirst({
      where: { id: asesorId, activo: true },
      select: { id: true, nombre_completo: true },
    });
    if (!asesor) {
      throw new NotFoundException('El asesor no existe o esta inactivo');
    }

    await this.prisma.prospecto.update({
      where: { id },
      data: { asesor_asignado_id: asesorId, estado: 'asignado' },
    });

    return {
      prospecto_id: id,
      clasificacion: prospecto.clasificacion,
      asesor: asesor.nombre_completo,
      estado: 'asignado',
    };
  }
}
