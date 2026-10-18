import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
import {
  generarDeviceToken,
  hashDeviceToken,
} from '../../common/security/device-token';
import { esViolacionDeLlaveForanea } from '../../common/errores/llave-foranea';
import {
  estadoConexion,
  VENTANA_CONECTIVIDAD_MINUTOS,
} from '../../common/conectividad/conectividad';

const DISPOSITIVO_SELECT = {
  id: true,
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
        codigo: true,
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
    return galpon;
  }

  private async siguienteCodigo(
    galponId: number,
    codigoGalpon: string,
    minimo: number,
  ) {
    const prefijo = `${codigoGalpon}-ESP32-`;
    const existentes = await this.prisma.dispositivo.findMany({
      where: { codigo_topic: { startsWith: prefijo } },
      select: { codigo_topic: true, galpon_id: true },
    });
    const ocupados = new Set<number>();
    let ultimoEnGalpon = 0;
    for (const dispositivo of existentes) {
      const sufijo = dispositivo.codigo_topic.slice(prefijo.length);
      if (!/^\d+$/.test(sufijo)) continue;
      const numero = Number(sufijo);
      if (!Number.isSafeInteger(numero) || numero < 1) continue;
      ocupados.add(numero);
      if (dispositivo.galpon_id === galponId) {
        ultimoEnGalpon = Math.max(ultimoEnGalpon, numero);
      }
    }
    let consecutivo = Math.max(ultimoEnGalpon + 1, minimo);
    // El código histórico del galpón puede repetirse en otra granja. Se saltan
    // los códigos ya ocupados para respetar el UNIQUE global del nodo.
    while (ocupados.has(consecutivo)) consecutivo += 1;
    if (!Number.isSafeInteger(consecutivo)) {
      throw new ConflictException(
        'No se pudo reservar el consecutivo del controlador',
      );
    }
    return {
      codigo: `${prefijo}${String(consecutivo).padStart(3, '0')}`,
      consecutivo,
    };
  }

  async crear(dto: CreateDispositivoDto, solicitante: Solicitante) {
    const galpon = await this.validarGalpon(dto.galpon_id, solicitante);

    const token = generarDeviceToken();
    const tokenHash = hashDeviceToken(token);
    const codigoManual = dto.codigo_topic?.trim();
    let siguiente = 1;

    // El consecutivo se consulta en el servidor, y PostgreSQL reserva el código
    // mediante UNIQUE. Una colisión concurrente avanza al siguiente número;
    // los demás errores se propagan sin reintentar el alta.
    for (let intento = 0; intento < 5; intento += 1) {
      const identidad = codigoManual
        ? { codigo: codigoManual, consecutivo: null }
        : await this.siguienteCodigo(galpon.id, galpon.codigo, siguiente);
      const codigo = identidad.codigo;
      try {
        const dispositivo = await this.prisma.dispositivo.create({
          data: {
            galpon_id: galpon.id,
            codigo_topic: codigo,
            nombre: dto.nombre?.trim() || codigo,
            version_firmware: dto.version_firmware,
            ip_local: dto.ip_local,
            token_ingesta_hash: tokenHash,
          },
          select: DISPOSITIVO_SELECT,
        });
        return { ...dispositivo, token_ingesta: token };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target = error.meta?.target;
          const columnas = Array.isArray(target)
            ? target.filter(
                (columna): columna is string => typeof columna === 'string',
              )
            : typeof target === 'string'
              ? [target]
              : [];
          if (
            identidad.consecutivo !== null &&
            columnas.some((columna) => columna.includes('codigo_topic'))
          ) {
            siguiente = identidad.consecutivo + 1;
            continue;
          }
        }
        throw error;
      }
    }

    throw new ConflictException(
      'No se pudo reservar un código único para el controlador; intenta de nuevo',
    );
  }

  async regenerarToken(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    const token = generarDeviceToken();
    await this.prisma.dispositivo.update({
      where: { id },
      data: {
        token_ingesta: null,
        token_ingesta_hash: hashDeviceToken(token),
      },
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

  async conectividad(ahora: Date = new Date()) {
    const dispositivos = await this.prisma.dispositivo.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        codigo_topic: true,
        ultima_conexion: true,
        galpon: {
          select: {
            id: true,
            nombre: true,
            granja: {
              select: {
                id: true,
                nombre: true,
                organizacion: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
      orderBy: { ultima_conexion: { sort: 'asc', nulls: 'first' } },
    });

    const conEstado = dispositivos.map((dispositivo) => ({
      ...dispositivo,
      estado: estadoConexion(dispositivo.ultima_conexion, ahora),
    }));
    const contar = (estado: string) =>
      conEstado.filter((dispositivo) => dispositivo.estado === estado).length;

    return {
      ventana_minutos: VENTANA_CONECTIVIDAD_MINUTOS,
      total: conEstado.length,
      conectados: contar('conectado'),
      sin_reportar: contar('sin_reportar'),
      nunca: contar('nunca'),
      problemas: conEstado.filter(
        (dispositivo) => dispositivo.estado !== 'conectado',
      ),
    };
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

    try {
      await this.prisma.dispositivo.delete({ where: { id } });
    } catch (error) {
      if (esViolacionDeLlaveForanea(error)) {
        throw new ConflictException(
          'No se puede eliminar: el dispositivo tiene sensores asociados. Elimínalos primero, o desactiva el dispositivo en su lugar.',
        );
      }
      throw error;
    }
    return { id, eliminado: true };
  }
}
