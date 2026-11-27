import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CrearProspectoWebDto } from './dto/crear-prospecto-web.dto';

@Injectable()
export class CaptacionProspectosService {
  constructor(private readonly prisma: PrismaService) {}

  async crearDesdeWeb(dto: CrearProspectoWebDto) {
    if (!dto.consentimiento_habeas_data) {
      throw new BadRequestException(
        'Debes autorizar el tratamiento de datos para enviar la solicitud.',
      );
    }

    return this.prisma.prospecto.create({
      data: {
        sesion_id: randomUUID(),
        nombre: dto.nombre.trim(),
        telefono: dto.telefono.trim(),
        municipio: dto.municipio.trim(),
        tipo_produccion: dto.tipo_produccion.trim(),
        email: dto.email?.trim() || null,
        canal_origen: 'web',
        consentimiento_habeas_data: true,
        estado: 'nuevo',
      },
      select: {
        id: true,
        nombre: true,
        canal_origen: true,
        estado: true,
      },
    });
  }
}
