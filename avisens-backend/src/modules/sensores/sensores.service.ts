import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { esConflictoConexion, validarConexionSensor } from './conexion-sensor';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { paginate } from '../../common/pagination/paginate';
import { verificarDueno } from '../../common/auth/acceso';
import type { Solicitante } from '../../common/auth/acceso';
import {
  filtroSensores,
  verificarAccesoSensor,
} from '../../common/auth/alcance';

const UNIDAD_POR_TIPO: Record<string, string> = {
  temperatura: '°C',
  humedad: '%',
  amoniaco: 'ppm',
  co2: 'ppm',
  luminosidad: 'lux',
};

function normalizarTipo(tipo: string) {
  return tipo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function unidadMedidaPorTipo(tipo: string) {
  return UNIDAD_POR_TIPO[normalizarTipo(tipo)] ?? 'N/D';
}

function prefijoSerial(tipo: string) {
  return (
    normalizarTipo(tipo)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 12) || 'SENSOR'
  );
}

const SENSOR_SELECT = {
  id: true,
  codigo: true,
  tipo: true,
  canal: true,
  unidad_medida: true,
  modelo: true,
  fabricante: true,
  coordenada_x: true,
  coordenada_y: true,
  altura_metros: true,
  fecha_instalacion: true,
  ultima_calibracion: true,
  proxima_calibracion: true,
  estado: true,

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
  dispositivo: {
    select: {
      id: true,
      nombre: true,
      codigo_topic: true,
    },
  },
} as const;

@Injectable()
export class SensoresService {
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
      'Solo puedes gestionar sensores de tus propios galpones',
    );
  }

  private async validarDispositivoEnGalpon(
    dispositivoId: number,
    galponId: number,
  ) {
    const dispositivo = await this.prisma.dispositivo.findUnique({
      where: { id: dispositivoId },
      select: { id: true, galpon_id: true },
    });
    if (!dispositivo) {
      throw new NotFoundException('Dispositivo no encontrado');
    }
    if (dispositivo.galpon_id !== galponId) {
      throw new BadRequestException(
        'El dispositivo no pertenece al galpón indicado',
      );
    }
  }

  async crear(dto: CreateSensorDto, solicitante: Solicitante) {
    await this.validarGalpon(dto.galpon_id, solicitante);
    await this.validarDispositivoEnGalpon(dto.dispositivo_id, dto.galpon_id);
    const tipo = normalizarTipo(dto.tipo);
    const modelo = dto.modelo?.trim();
    validarConexionSensor(dto.canal, tipo, modelo);

    const data = {
      galpon_id: dto.galpon_id,
      dispositivo_id: dto.dispositivo_id,
      tipo,
      canal: dto.canal,
      unidad_medida: dto.unidad_medida?.trim() || unidadMedidaPorTipo(dto.tipo),
      modelo,
      fabricante: dto.fabricante,
      coordenada_x: dto.coordenada_x,
      coordenada_y: dto.coordenada_y,
      altura_metros: dto.altura_metros,
      fecha_instalacion: dto.fecha_instalacion
        ? new Date(dto.fecha_instalacion)
        : undefined,
      ultima_calibracion: dto.ultima_calibracion
        ? new Date(dto.ultima_calibracion)
        : undefined,
      proxima_calibracion: dto.proxima_calibracion
        ? new Date(dto.proxima_calibracion)
        : undefined,
    };

    if (dto.codigo?.trim()) {
      return this.prisma.sensor
        .create({
          data: { ...data, codigo: dto.codigo.trim() },
          select: SENSOR_SELECT,
        })
        .catch((error: unknown) => {
          if (esConflictoConexion(error))
            throw new ConflictException(
              'Ya existe esta variable en el GPIO del controlador; edita o reactiva el sensor existente',
            );
          throw error;
        });
    }

    // Sensor.codigo tiene índice UNIQUE en PostgreSQL. Si dos altas concurrentes
    // chocan, se genera otro serial y se vuelve a intentar; nunca se devuelve un
    // código que no quedó reservado por la base de datos.
    for (let intento = 0; intento < 5; intento += 1) {
      const codigo = `${prefijoSerial(dto.tipo)}-G${dto.galpon_id}-${randomUUID()
        .replace(/-/g, '')
        .slice(0, 12)
        .toUpperCase()}`;
      try {
        return await this.prisma.sensor.create({
          data: { ...data, codigo },
          select: SENSOR_SELECT,
        });
      } catch (error) {
        if (esConflictoConexion(error))
          throw new ConflictException(
            'Ya existe esta variable en el GPIO del controlador; edita o reactiva el sensor existente',
          );
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException(
      'No se pudo reservar un serial único para el sensor; intenta de nuevo',
    );
  }

  async listar(solicitante: Solicitante, { page, limit }: PaginationQueryDto) {
    const where = filtroSensores(solicitante);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sensor.findMany({
        where,
        select: SENSOR_SELECT,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sensor.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async obtener(id: number, solicitante: Solicitante) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id },
      select: SENSOR_SELECT,
    });
    if (!sensor) throw new NotFoundException('Sensor no encontrado');
    await verificarAccesoSensor(
      this.prisma,
      id,
      solicitante,
      'Solo puedes gestionar sensores de tus propios galpones',
      sensor.galpon.granja.propietario_id,
    );
    return sensor;
  }

  async actualizar(id: number, dto: UpdateSensorDto, solicitante: Solicitante) {
    const actual = await this.obtener(id, solicitante);

    if (dto.galpon_id !== undefined && dto.galpon_id !== actual.galpon.id) {
      throw new BadRequestException(
        'No se puede trasladar un sensor a otro galpón; sus mediciones y alertas son históricas',
      );
    }

    const galponFinal = actual.galpon.id;
    const dispositivoFinal = dto.dispositivo_id ?? actual.dispositivo.id;
    if (dto.dispositivo_id) {
      await this.validarDispositivoEnGalpon(dispositivoFinal, galponFinal);
    }
    if (dto.tipo !== undefined && typeof dto.tipo !== 'string')
      throw new BadRequestException('El tipo de sensor debe ser texto');
    const tipo =
      dto.tipo === undefined ? actual.tipo : normalizarTipo(dto.tipo);
    const modelo =
      dto.modelo === undefined ? actual.modelo : (dto.modelo?.trim() ?? null);
    validarConexionSensor(
      dto.canal === undefined ? actual.canal : dto.canal,
      tipo,
      modelo,
    );

    return this.prisma.sensor
      .update({
        where: { id },
        data: {
          galpon_id: undefined,
          dispositivo_id: dto.dispositivo_id,
          codigo: dto.codigo,
          tipo,
          canal: dto.canal,
          unidad_medida: dto.unidad_medida,
          modelo,
          fabricante: dto.fabricante,
          coordenada_x: dto.coordenada_x,
          coordenada_y: dto.coordenada_y,
          altura_metros: dto.altura_metros,
          fecha_instalacion: dto.fecha_instalacion
            ? new Date(dto.fecha_instalacion)
            : undefined,
          ultima_calibracion: dto.ultima_calibracion
            ? new Date(dto.ultima_calibracion)
            : undefined,
          proxima_calibracion: dto.proxima_calibracion
            ? new Date(dto.proxima_calibracion)
            : undefined,
          estado: dto.estado,
        },
        select: SENSOR_SELECT,
      })
      .catch((error: unknown) => {
        if (esConflictoConexion(error))
          throw new ConflictException(
            'Ya existe esta variable en el GPIO del controlador; edita o reactiva el sensor existente',
          );
        throw error;
      });
  }

  async desactivar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.sensor.update({
      where: { id },
      data: { estado: 'inactivo' },
    });
    return { id, estado: 'inactivo' };
  }

  async activar(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);
    await this.prisma.sensor.update({
      where: { id },
      data: { estado: 'activo' },
    });
    return { id, estado: 'activo' };
  }

  async eliminarPermanente(id: number, solicitante: Solicitante) {
    await this.obtener(id, solicitante);

    await this.prisma.sensor.delete({ where: { id } });
    return { id, eliminado: true };
  }
}
