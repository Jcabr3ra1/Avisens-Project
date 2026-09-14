import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMedicionDto } from './dto/create-medicion.dto';
import { QueryMedicionesDto } from './dto/query-mediciones.dto';
import { paginate } from '../../common/pagination/paginate';
import type { Solicitante } from '../../common/auth/acceso';
import {
  filtroSensores,
  verificarAccesoSensor,
} from '../../common/auth/alcance';
import { AlertasService } from '../alertas/alertas.service';
import { clasificarFalloAlerta } from '../../common/errores/clasificar-error';

const MEDICION_SELECT = {
  id: true,
  sensor_id: true,
  fecha_hora: true,
  valor: true,
  calidad: true,
} as const;

@Injectable()
export class MedicionesService {
  private readonly logger = new Logger(MedicionesService.name);
  constructor(
    private prisma: PrismaService,
    private alertas: AlertasService,
  ) {}

  private async validarSensor(sensorId: number, solicitante: Solicitante) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: sensorId },
      select: {
        id: true,
        galpon: { select: { granja: { select: { propietario_id: true } } } },
      },
    });
    if (!sensor) throw new NotFoundException('Sensor no encontrado');
    await verificarAccesoSensor(
      this.prisma,
      sensorId,
      solicitante,
      'Solo puedes gestionar mediciones de tus propios sensores',
      sensor.galpon.granja.propietario_id,
    );
  }

  async registrar(dto: CreateMedicionDto, solicitante: Solicitante) {
    await this.validarSensor(dto.sensor_id, solicitante);

    const medicion = await this.prisma.medicion.create({
      data: {
        sensor_id: dto.sensor_id,
        valor: dto.valor,
        fecha_hora: dto.fecha_hora ? new Date(dto.fecha_hora) : undefined,
        calidad: dto.calidad,
      },
      select: MEDICION_SELECT,
    });

    try {
      await this.alertas.evaluarLectura(
        dto.sensor_id,
        dto.valor,
        dto.fecha_hora ? new Date(dto.fecha_hora) : undefined,
      );
    } catch (error: unknown) {
      const { clasificacion, codigo } = clasificarFalloAlerta(error);
      this.logger.error(
        JSON.stringify({
          evento: 'mediciones.alerta.fallida',
          medicion_id: medicion.id.toString(),
          sensor_id: dto.sensor_id,
          clasificacion,
          codigo,
        }),
      );
      return {
        ...medicion,
        advertencia_evaluacion:
          'No se pudo completar el procesamiento de alertas para esta lectura',
      };
    }

    return medicion;
  }

  async listar(query: QueryMedicionesDto, solicitante: Solicitante) {
    const { sensor_id, desde, hasta, page, limit } = query;

    if (sensor_id) {
      await this.validarSensor(sensor_id, solicitante);
    }

    const where = {
      sensor_id,
      fecha_hora:
        desde || hasta
          ? {
              gte: desde ? new Date(desde) : undefined,
              lte: hasta ? new Date(hasta) : undefined,
            }
          : undefined,

      sensor: filtroSensores(solicitante),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.medicion.findMany({
        where,
        select: MEDICION_SELECT,
        orderBy: { fecha_hora: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.medicion.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }
}
