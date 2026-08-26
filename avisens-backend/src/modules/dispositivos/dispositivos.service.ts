import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDispositivoDto } from './dto/create-dispositivo.dto';
import { UpdateDispositivoDto } from './dto/update-dispositivo.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';
import {
  filtroDispositivos,
  verificarAccesoGalpon,
} from '../../common/auth/alcance';

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
    verificarDueno(
      solicitante,
      galpon.granja.propietario_id,
      'Solo puedes gestionar dispositivos de tus propios galpones',
    );
  }

  private generarToken(): string {
    return randomBytes(24).toString('hex');
  }

  async crear(dto: CreateDispositivoDto, solicitante: Solicitante) {
    await this.validarGalpon(dto.galpon_id, solicitante);

    const token = this.generarToken();

    const dispositivo = await this.prisma.dispositivo.create({
      data: {
        galpon_id: dto.galpon_id,
        mac_address: dto.mac_address,
        codigo_topic: dto.codigo_topic,
        nombre: dto.nombre,
        version_firmware: dto.version_firmware,
        ip_local: dto.ip_local,
        token_ingesta: token,
      },
      select: DISPOSITIVO_SELECT,
    });

    return { ...dispositivo, token_ingesta: token };
  }

  async regenerarToken(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    const token = this.generarToken();
    await this.prisma.dispositivo.update({
      where: { id },
      data: { token_ingesta: token },
    });
    return { id, token_ingesta: token };
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = filtroDispositivos(solicitante);

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
    await verificarAccesoGalpon(
      this.prisma,
      dispositivo.galpon.id,
      solicitante,
      'Solo puedes gestionar dispositivos de tus propios galpones',
      dispositivo.galpon.granja.propietario_id,
    );
    return dispositivo;
  }

  async actualizar(
    id: number,
    dto: UpdateDispositivoDto,
    solicitante: Solicitante,
  ) {
    const actual = await this.obtener(id, solicitante);

    if (dto.galpon_id !== undefined && dto.galpon_id !== actual.galpon.id) {
      throw new BadRequestException(
        'No se puede trasladar un dispositivo a otro galpón mientras conserva sensores asociados',
      );
    }

    return this.prisma.dispositivo.update({
      where: { id },
      data: {
        galpon_id: undefined,
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
    await this.obtener(id, solicitante);

    await this.prisma.dispositivo.update({
      where: { id },
      data: { activo: false },
    });
    return { id, activo: false };
  }

  async activar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    await this.prisma.dispositivo.update({
      where: { id },
      data: { activo: true },
    });
    return { id, activo: true };
  }

  async eliminarPermanente(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.dispositivo.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
