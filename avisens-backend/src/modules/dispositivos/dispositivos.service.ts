import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';
import { UpdateDispositivoDto } from './dto/update-dispositivo.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';

const ROL_PROPIETARIO = 'Propietario';

// Quién hace la petición. Su rol decide el alcance:
// - Administrador: gestiona todos los dispositivos.
// - Propietario: solo los de galpones de sus propias granjas.

type Solicitante = { id: number; rol: string };

const DISPOSITIVO_SELECT = {
  id: true,
  mac_address: true,
  codigo_topic: true,
  nombre: true,
  version_firmware: true,
  estado: true,
  ip_local: true,
  ultima_conexion: true,
  activo: true,
  fecha_creacion: true,
  // Subimos dos niveles para saber de quién es: dispositivo → galpón → granja.
  galpon: {
    select: {
      id: true,
      nombre: true,
      granja: {
        select: {
          id: true,
          propietario_id: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class DispositivosService {
  constructor(private prisma: PrismaService) {}

  private esPropietario(solicitante: Solicitante): boolean {
    return solicitante.rol === ROL_PROPIETARIO;
  }

  // Verifica que el galpón exista y, si el solicitante es Propietario, que la
  // granja de ese galpón sea suya. Se usa al crear o al mover de galpón.
  private async validarGalpon(galponId: number, solicitante: Solicitante) {
    const galpon = await this.prisma.galpon.findUnique({
      where: { id: galponId },
      select: {
        id: true,
        granja: {
          select: {
            propietario_id: true,
          },
        },
      },
    });
    if (!galpon) {
      throw new NotFoundException('Galpón no encontrado');
    }
    if (
      this.esPropietario(solicitante) &&
      galpon.granja.propietario_id !== solicitante.id
    ) {
      throw new ForbiddenException(
        'Solo puedes gestionar dispositivos de tus propios galpones',
      );
    }
  }

  async crear(dto: CreateDispositivoDto, solicitante: Solicitante) {
    await this.validarGalpon(dto.galpon_id, solicitante);

    // mac_address y codigo_topic son únicos: si se repiten, la restricción de
    // Prisma + el PrismaExceptionFilter devuelven 409 automáticamente.
    return this.prisma.dispositivo.create({
      data: {
        galpon_id: dto.galpon_id,
        mac_address: dto.mac_address,
        codigo_topic: dto.codigo_topic,
        nombre: dto.nombre,
        version_firmware: dto.version_firmware,
        ip_local: dto.ip_local,
      },
      select: DISPOSITIVO_SELECT,
    });
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    // El Propietario solo ve dispositivos de galpones de sus granjas.
    const where = this.esPropietario(solicitante)
      ? { galpon: { granja: { propietario_id: solicitante.id } } }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.dispositivo.findMany({
        where,
        select: DISPOSITIVO_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dispositivo.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const dispositivo = await this.prisma.dispositivo.findUnique({
      where: { id },
      select: DISPOSITIVO_SELECT,
    });
    if (!dispositivo) throw new NotFoundException('Dispositivo no encontrado');
    if (
      this.esPropietario(solicitante) &&
      dispositivo.galpon.granja.propietario_id !== solicitante.id
    ) {
      throw new ForbiddenException(
        'Solo puedes gestionar dispositivos de tus propios galpones',
      );
    }
    return dispositivo;
  }

  async actualizar(
    id: number,
    dto: UpdateDispositivoDto,
    solicitante: Solicitante,
  ) {
    await this.obtener(id, solicitante); // valida existencia y alcance actual

    // Si se mueve a otro galpón, validar que exista y que el solicitante pueda usarlo.
    if (dto.galpon_id) {
      await this.validarGalpon(dto.galpon_id, solicitante);
    }

    return this.prisma.dispositivo.update({
      where: { id },
      data: {
        galpon_id: dto.galpon_id,
        mac_address: dto.mac_address,
        codigo_topic: dto.codigo_topic,
        nombre: dto.nombre,
        version_firmware: dto.version_firmware,
        ip_local: dto.ip_local,
        activo: dto.activo,
      },
      select: DISPOSITIVO_SELECT,
    });
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante); // valida existencia y alcance

    // Borrado suave: el dispositivo queda inactivo pero conserva su historial.
    await this.prisma.dispositivo.update({
      where: { id },
      data: { activo: false },
    });
    return { id, activo: false };
  }

  async activar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante); // valida existencia y alcance
    await this.prisma.dispositivo.update({
      where: {id },
      data: { activo: true },
    });
    return { id, activo: true };
  }

  async eliminarPermanente(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante); // valida existencia y alcance

    // Borrado permanente (casos legales). Si el dispositivo tiene sensores
    // asociados, la FK ON DELETE RESTRICT lo impedirá (400 vía filtro).
    await this.prisma.dispositivo.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
