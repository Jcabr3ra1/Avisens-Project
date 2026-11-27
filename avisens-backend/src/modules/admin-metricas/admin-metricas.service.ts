import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const ZONA_HORARIA = 'America/Bogota';
const OFFSET_COLOMBIA_MS = 5 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

interface FilaDia {
  fecha: string;
  total: number;
}

export interface PuntoSerie {
  fecha: string;
  mediciones: number;
  alertas: number;
  aves_muertas: number;
  usuarios_nuevos: number;
  organizaciones_nuevas: number;
}

type ClaveSerie = Exclude<keyof PuntoSerie, 'fecha'>;

export const diaColombia = (instante: Date): string =>
  new Date(instante.getTime() - OFFSET_COLOMBIA_MS).toISOString().slice(0, 10);

const inicioDiaUtc = (fecha: string): Date =>
  new Date(new Date(`${fecha}T00:00:00.000Z`).getTime() + OFFSET_COLOMBIA_MS);

const sumarDias = (fecha: string, dias: number): string =>
  new Date(new Date(`${fecha}T00:00:00.000Z`).getTime() + dias * DIA_MS)
    .toISOString()
    .slice(0, 10);

@Injectable()
export class AdminMetricasService {
  constructor(private prisma: PrismaService) {}

  async obtener(dias: number, ahora: Date = new Date()) {
    const hoy = diaColombia(ahora);
    const primerDia = sumarDias(hoy, -(dias - 1));
    const primerDiaAnterior = sumarDias(primerDia, -dias);
    const desde = inicioDiaUtc(primerDiaAnterior);
    const hasta = inicioDiaUtc(sumarDias(hoy, 1));
    const inicioHoy = inicioDiaUtc(hoy);

    const [
      organizaciones,
      usuarios,
      granjas,
      galpones,
      lotes,
      aves,
      medicionesHoy,
      alertasAbiertas,
      mediciones,
      alertas,
      muertes,
      usuariosNuevos,
      organizacionesNuevas,
    ] = await Promise.all([
      this.prisma.organizacion.count({ where: { activa: true } }),
      this.prisma.usuario.count({ where: { activo: true } }),
      this.prisma.granja.count({ where: { activa: true } }),
      this.prisma.galpon.count({ where: { activo: true } }),
      this.prisma.lote.count({
        where: { estado: 'activo', fecha_salida_real: null },
      }),
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM(GREATEST(l.cantidad_inicial - COALESCE(m.muertas, 0), 0)), 0)::int AS total
        FROM lotes l
        LEFT JOIN (
          SELECT lote_id, SUM(cantidad_aves) AS muertas
          FROM registros_mortalidad
          GROUP BY lote_id
        ) m ON m.lote_id = l.id
        WHERE l.estado = 'activo' AND l.fecha_salida_real IS NULL`,
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total FROM mediciones
        WHERE fecha_hora >= ${inicioHoy} AND fecha_hora < ${hasta}`,
      this.prisma.alerta.count({
        where: { estado: { in: ['abierta', 'en_proceso'] } },
      }),
      this.prisma.$queryRaw<FilaDia[]>`
        SELECT to_char(date_trunc('day', (fecha_hora AT TIME ZONE 'UTC') AT TIME ZONE 'America/Bogota'), 'YYYY-MM-DD') AS fecha,
               COUNT(*)::int AS total
        FROM mediciones
        WHERE fecha_hora >= ${desde} AND fecha_hora < ${hasta}
        GROUP BY 1`,
      this.prisma.$queryRaw<FilaDia[]>`
        SELECT to_char(date_trunc('day', (fecha_creacion AT TIME ZONE 'UTC') AT TIME ZONE 'America/Bogota'), 'YYYY-MM-DD') AS fecha,
               COUNT(*)::int AS total
        FROM alertas
        WHERE fecha_creacion >= ${desde} AND fecha_creacion < ${hasta}
        GROUP BY 1`,
      this.prisma.$queryRaw<FilaDia[]>`
        SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha,
               COALESCE(SUM(cantidad_aves), 0)::int AS total
        FROM registros_mortalidad
        WHERE fecha >= ${primerDiaAnterior}::date AND fecha <= ${hoy}::date
        GROUP BY 1`,
      this.prisma.$queryRaw<FilaDia[]>`
        SELECT to_char(date_trunc('day', (fecha_creacion AT TIME ZONE 'UTC') AT TIME ZONE 'America/Bogota'), 'YYYY-MM-DD') AS fecha,
               COUNT(*)::int AS total
        FROM usuarios
        WHERE fecha_creacion >= ${desde} AND fecha_creacion < ${hasta}
        GROUP BY 1`,
      this.prisma.$queryRaw<FilaDia[]>`
        SELECT to_char(date_trunc('day', (fecha_creacion AT TIME ZONE 'UTC') AT TIME ZONE 'America/Bogota'), 'YYYY-MM-DD') AS fecha,
               COUNT(*)::int AS total
        FROM organizaciones
        WHERE fecha_creacion >= ${desde} AND fecha_creacion < ${hasta}
        GROUP BY 1`,
    ]);

    const fuentes: Record<ClaveSerie, FilaDia[]> = {
      mediciones,
      alertas,
      aves_muertas: muertes,
      usuarios_nuevos: usuariosNuevos,
      organizaciones_nuevas: organizacionesNuevas,
    };
    const claves = Object.keys(fuentes) as ClaveSerie[];
    const porDia = new Map<ClaveSerie, Map<string, number>>();
    for (const clave of claves) {
      const mapa = new Map<string, number>();
      for (const fila of fuentes[clave]) {
        mapa.set(fila.fecha, (mapa.get(fila.fecha) ?? 0) + Number(fila.total));
      }
      porDia.set(clave, mapa);
    }

    const valorDe = (clave: ClaveSerie, fecha: string): number =>
      porDia.get(clave)?.get(fecha) ?? 0;

    const series: PuntoSerie[] = [];
    const anterior: Record<ClaveSerie, number> = {
      mediciones: 0,
      alertas: 0,
      aves_muertas: 0,
      usuarios_nuevos: 0,
      organizaciones_nuevas: 0,
    };
    for (let i = 0; i < dias; i++) {
      const fecha = sumarDias(primerDia, i);
      series.push({
        fecha,
        mediciones: valorDe('mediciones', fecha),
        alertas: valorDe('alertas', fecha),
        aves_muertas: valorDe('aves_muertas', fecha),
        usuarios_nuevos: valorDe('usuarios_nuevos', fecha),
        organizaciones_nuevas: valorDe('organizaciones_nuevas', fecha),
      });
      const fechaAnterior = sumarDias(primerDiaAnterior, i);
      for (const clave of claves) {
        anterior[clave] += valorDe(clave, fechaAnterior);
      }
    }

    return {
      generado_en: ahora.toISOString(),
      dias,
      zona_horaria: ZONA_HORARIA,
      actuales: {
        organizaciones_activas: organizaciones,
        usuarios_activos: usuarios,
        granjas_activas: granjas,
        galpones_activos: galpones,
        lotes_activos: lotes,
        aves_en_produccion: Number(aves[0]?.total ?? 0),
        mediciones_hoy: Number(medicionesHoy[0]?.total ?? 0),
        alertas_abiertas: alertasAbiertas,
      },
      series,
      periodo_anterior: anterior,
    };
  }
}
