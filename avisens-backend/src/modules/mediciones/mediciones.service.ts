import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
import { EstadoSensor, Prisma } from '@prisma/client';
import { clasificarFalloAlerta } from '../../common/errores/clasificar-error';

const MEDICION_SELECT = {
  id: true,
  sensor_id: true,
  fecha_hora: true,
  valor: true,
  calidad: true,
} as const;

export interface UltimaLecturaSensor {
  valor: number;
  fecha_hora: Date;
  calidad: string;
  antiguedad_segundos: number;
}

export interface SensorConUltimaLectura {
  sensor_id: number;
  galpon_id: number;
  codigo: string;
  tipo: string;
  unidad_medida: string;
  estado_sensor: EstadoSensor;
  ultima_lectura: UltimaLecturaSensor | null;
}

export interface UltimasLecturasPorSensor {
  generado_en: Date;
  sensores: SensorConUltimaLectura[];
}
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

  async ultimasPorSensores(
    solicitante: Solicitante,
    galponIds?: number[],
  ): Promise<UltimasLecturasPorSensor> {
    const where: Prisma.SensorWhereInput = {
      AND: [
        filtroSensores(solicitante) ?? {},
        galponIds?.length ? { galpon_id: { in: galponIds } } : {},
      ],
    };

    const sensores = await this.prisma.sensor.findMany({
      where,
      select: {
        id: true,
        galpon_id: true,
        codigo: true,
        tipo: true,
        unidad_medida: true,
        estado: true,
      },
      orderBy: { id: 'asc' },
      take: 501,
    });

    if (sensores.length > 500) {
      throw new BadRequestException(
        'Tienes más de 500 sensores visibles. Acota la consulta con galpon_id.',
      );
    }

    if (sensores.length === 0) {
      return { generado_en: new Date(), sensores: [] };
    }
    const sensorIds = sensores.map((s) => s.id);

    const lecturas = await this.prisma.$queryRaw<
      Array<{
        sensor_id: number;
        valor: number | null;
        fecha_hora: Date | null;
        calidad: string | null;
      }>
    >(Prisma.sql`
    SELECT s.sensor_id, u.valor, u.fecha_hora, u.calidad
     FROM unnest(ARRAY[${Prisma.join(sensorIds)}]::int[]) AS s(sensor_id)
      LEFT JOIN LATERAL (
             SELECT m.valor, m.fecha_hora, m.calidad
               FROM mediciones m
              WHERE m.sensor_id = s.sensor_id
              ORDER BY m.fecha_hora DESC, m.id DESC
              LIMIT 1
           ) u ON true
  `);
    const generadoEn = new Date();
    const lecturaPorSensor = new Map(lecturas.map((l) => [l.sensor_id, l]));

    const sensoresConLectura: SensorConUltimaLectura[] = sensores.map((s) => {
      const lectura = lecturaPorSensor.get(s.id);

      const ultimaLectura: UltimaLecturaSensor | null =
        lectura !== undefined &&
        lectura.fecha_hora !== null &&
        lectura.valor !== null &&
        lectura.calidad !== null
          ? {
              valor: lectura.valor,
              fecha_hora: lectura.fecha_hora,
              calidad: lectura.calidad,
              antiguedad_segundos: Math.floor(
                (generadoEn.getTime() - lectura.fecha_hora.getTime()) / 1000,
              ),
            }
          : null;

      return {
        sensor_id: s.id,
        galpon_id: s.galpon_id,
        codigo: s.codigo,
        tipo: s.tipo,
        unidad_medida: s.unidad_medida,
        estado_sensor: s.estado,
        ultima_lectura: ultimaLectura,
      };
    });

    return { generado_en: generadoEn, sensores: sensoresConLectura };
  }
}
