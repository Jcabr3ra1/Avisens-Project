import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMedicionDto } from './dto/create-medicion.dto';
import { QueryMedicionesDto } from './dto/query-mediciones.dto';
import {
  QueryHistoricoMedicionesDto,
  type VariableHistorico,
} from './dto/query-historico-mediciones.dto';
import { paginate } from '../../common/pagination/paginate';
import type { Solicitante } from '../../common/auth/acceso';
import {
  filtroSensores,
  verificarAccesoGalpon,
  verificarAccesoSensor,
} from '../../common/auth/alcance';
import { diaDeVida, semanaDeVida } from '../../common/fechas/dias-de-vida';
import { AlertasService } from '../alertas/alertas.service';
import { EstadoSensor, Prisma } from '@prisma/client';
import { clasificarFalloAlerta } from '../../common/errores/clasificar-error';
import { SENSOR_VIGENTE } from '../sensores/sensor-vigente';

const MAX_DIAS_HISTORICO = 366;
const MS_POR_DIA = 86_400_000;

const UNIDADES_DEFECTO: Record<VariableHistorico, string> = {
  temperatura: '°C',
  humedad: '%',
  co2: 'ppm',
  nh3: 'ppm',
  luminosidad: 'lux',
};

function coincideVariableSensor(
  tipoSensor: string,
  variable: VariableHistorico,
): boolean {
  const t = tipoSensor.toLowerCase();
  if (variable === 'temperatura') return t.includes('temp');
  if (variable === 'humedad') return t.includes('hum');
  if (variable === 'co2') return t.includes('co2') || t.includes('gas');
  if (variable === 'nh3') return t.includes('nh3') || t.includes('amon');
  if (variable === 'luminosidad') return t.includes('luz') || t.includes('lum');
  return false;
}

export interface PuntoHistorico {
  fecha: string;
  promedio: number;
  minimo: number;
  maximo: number;
  lecturas: number;
  objetivo_min: number | null;
  objetivo_max: number | null;
}

export interface HistoricoMedicionesResponse {
  galpon: { id: number; nombre: string; codigo: string; granja: string };
  variable: VariableHistorico;
  unidad_medida: string;
  zona_id: number | null;
  zonas: Array<{ id: number; nombre: string; codigo: string | null }>;
  granularidad: 'hora' | 'dia';
  desde: string;
  hasta: string;
  sin_datos: boolean;
  mensaje: string | null;
  rango_sugerido: { desde: string; hasta: string } | null;
  resumen: {
    promedio_general: number | null;
    minimo_general: number | null;
    maximo_general: number | null;
    total_lecturas: number;
    puntos_fuera_de_rango: number;
  };
  serie: PuntoHistorico[];
}

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
        SENSOR_VIGENTE,
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

  async historico(
    query: QueryHistoricoMedicionesDto,
    solicitante: Solicitante,
  ): Promise<HistoricoMedicionesResponse> {
    const desdeDate = new Date(query.desde);
    const hastaDate = new Date(query.hasta);

    if (
      Number.isNaN(desdeDate.getTime()) ||
      Number.isNaN(hastaDate.getTime()) ||
      desdeDate > hastaDate
    ) {
      throw new BadRequestException(
        'La fecha inicial debe ser anterior o igual a la fecha final.',
      );
    }

    const duracionMs = hastaDate.getTime() - desdeDate.getTime();
    if (duracionMs > MAX_DIAS_HISTORICO * MS_POR_DIA) {
      throw new BadRequestException(
        'El rango máximo de consulta histórica es de 12 meses (366 días).',
      );
    }

    const galpon = await this.prisma.galpon.findUnique({
      where: { id: query.galpon_id },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        granja: { select: { nombre: true, propietario_id: true } },
      },
    });
    if (!galpon) {
      throw new NotFoundException('Galpón no encontrado');
    }

    await verificarAccesoGalpon(
      this.prisma,
      galpon.id,
      solicitante,
      'No tienes acceso al historial de este galpón',
      galpon.granja.propietario_id,
    );

    const [zonas, sensoresGalpon] = await Promise.all([
      this.prisma.zonaGalpon.findMany({
        where: { galpon_id: galpon.id, activa: true },
        select: { id: true, nombre: true, codigo: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.sensor.findMany({
        where: {
          AND: [
            { galpon_id: galpon.id },
            query.zona_id !== undefined ? { zona_id: query.zona_id } : {},
            SENSOR_VIGENTE,
          ],
        },
        select: { id: true, tipo: true, unidad_medida: true },
      }),
    ]);

    const sensoresFiltrados = sensoresGalpon.filter((s) =>
      coincideVariableSensor(s.tipo, query.variable),
    );
    const unidadMedida =
      sensoresFiltrados[0]?.unidad_medida ?? UNIDADES_DEFECTO[query.variable];
    const granularidad: 'hora' | 'dia' =
      duracionMs <= 7 * MS_POR_DIA ? 'hora' : 'dia';

    const baseRespuesta = {
      galpon: {
        id: galpon.id,
        nombre: galpon.nombre,
        codigo: galpon.codigo,
        granja: galpon.granja.nombre,
      },
      variable: query.variable,
      unidad_medida: unidadMedida,
      zona_id: query.zona_id ?? null,
      zonas,
      granularidad,
      desde: desdeDate.toISOString(),
      hasta: hastaDate.toISOString(),
    };

    if (sensoresFiltrados.length === 0) {
      return {
        ...baseRespuesta,
        sin_datos: true,
        mensaje: 'No existen registros para el rango seleccionado',
        rango_sugerido: null,
        resumen: {
          promedio_general: null,
          minimo_general: null,
          maximo_general: null,
          total_lecturas: 0,
          puntos_fuera_de_rango: 0,
        },
        serie: [],
      };
    }

    const sensorIds = sensoresFiltrados.map((s) => s.id);
    const truncado = granularidad === 'hora' ? 'hour' : 'day';

    const [filas, rangoDisponible, loteReferencia, umbrales] =
      await Promise.all([
        this.prisma.$queryRaw<
          Array<{
            bucket: Date;
            promedio: number;
            minimo: number;
            maximo: number;
            lecturas: number;
          }>
        >(Prisma.sql`
          SELECT (date_trunc(${truncado}, fecha_hora AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota') AS bucket,
                 ROUND(AVG(valor)::numeric, 2)::float8 AS promedio,
                 ROUND(MIN(valor)::numeric, 2)::float8 AS minimo,
                 ROUND(MAX(valor)::numeric, 2)::float8 AS maximo,
                 COUNT(*)::int AS lecturas
            FROM mediciones
           WHERE sensor_id = ANY(ARRAY[${Prisma.join(sensorIds)}]::int[])
             AND fecha_hora >= ${desdeDate}
             AND fecha_hora <= ${hastaDate}
           GROUP BY bucket
           ORDER BY bucket ASC
        `),
        this.prisma.medicion.aggregate({
          where: { sensor_id: { in: sensorIds } },
          _min: { fecha_hora: true },
          _max: { fecha_hora: true },
        }),
        this.prisma.lote.findFirst({
          where: { galpon_id: galpon.id },
          orderBy: [{ estado: 'asc' }, { fecha_ingreso: 'desc' }],
          select: { fecha_ingreso: true },
        }),
        this.prisma.umbralAmbiental.findMany({
          where: {
            galpon_id: galpon.id,
            variable: query.variable,
            vigente: true,
          },
          orderBy: { semana_vida: 'asc' },
          select: {
            semana_vida: true,
            valor_minimo: true,
            valor_maximo: true,
          },
        }),
      ]);

    const minDisp = rangoDisponible._min.fecha_hora;
    const maxDisp = rangoDisponible._max.fecha_hora;
    const rangoSugerido =
      minDisp && maxDisp
        ? {
            desde: new Date(
              Math.max(
                minDisp.getTime(),
                maxDisp.getTime() - 30 * MS_POR_DIA,
              ),
            ).toISOString(),
            hasta: maxDisp.toISOString(),
          }
        : null;

    if (filas.length === 0) {
      return {
        ...baseRespuesta,
        sin_datos: true,
        mensaje: 'No existen registros para el rango seleccionado',
        rango_sugerido: rangoSugerido,
        resumen: {
          promedio_general: null,
          minimo_general: null,
          maximo_general: null,
          total_lecturas: 0,
          puntos_fuera_de_rango: 0,
        },
        serie: [],
      };
    }

    const buscarUmbralParaFecha = (fecha: Date) => {
      if (umbrales.length === 0) return { min: null, max: null };
      const semana = loteReferencia
        ? semanaDeVida(diaDeVida(loteReferencia.fecha_ingreso, fecha))
        : umbrales[0].semana_vida;
      let elegido = umbrales[0];
      for (const item of umbrales) {
        if (item.semana_vida <= semana) elegido = item;
        else break;
      }
      return { min: elegido.valor_minimo, max: elegido.valor_maximo };
    };

    let sumaPonderada = 0;
    let totalLecturas = 0;
    let minimoGeneral = Infinity;
    let maximoGeneral = -Infinity;
    let fueraDeRango = 0;

    const serie: PuntoHistorico[] = filas.map((fila) => {
      const fecha = new Date(fila.bucket);
      const objetivo = buscarUmbralParaFecha(fecha);
      sumaPonderada += fila.promedio * fila.lecturas;
      totalLecturas += fila.lecturas;
      if (fila.minimo < minimoGeneral) minimoGeneral = fila.minimo;
      if (fila.maximo > maximoGeneral) maximoGeneral = fila.maximo;
      if (
        (objetivo.min !== null && fila.promedio < objetivo.min) ||
        (objetivo.max !== null && fila.promedio > objetivo.max)
      ) {
        fueraDeRango += 1;
      }
      return {
        fecha: fecha.toISOString(),
        promedio: fila.promedio,
        minimo: fila.minimo,
        maximo: fila.maximo,
        lecturas: fila.lecturas,
        objetivo_min: objetivo.min,
        objetivo_max: objetivo.max,
      };
    });

    return {
      ...baseRespuesta,
      sin_datos: false,
      mensaje: null,
      rango_sugerido: null,
      resumen: {
        promedio_general:
          totalLecturas > 0
            ? Number((sumaPonderada / totalLecturas).toFixed(2))
            : null,
        minimo_general: Number.isFinite(minimoGeneral) ? minimoGeneral : null,
        maximo_general: Number.isFinite(maximoGeneral) ? maximoGeneral : null,
        total_lecturas: totalLecturas,
        puntos_fuera_de_rango: fueraDeRango,
      },
      serie,
    };
  }
}
