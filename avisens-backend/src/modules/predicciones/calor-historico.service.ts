import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClienteMlService } from './cliente-ml.service';

const DIAS_DE_HISTORIAL = 7;
const HORAS_MAXIMAS = DIAS_DE_HISTORIAL * 24;
const LIMITE_TEMPERATURA = { min: -20, max: 60 } as const;
const LIMITE_HUMEDAD = { min: 0, max: 100 } as const;

interface PromedioHorario {
  hora: Date;
  tipo: string;
  promedio: number;
}

interface HoraLeida {
  hora: string;
  temperatura?: number;
  humedad?: number;
}

@Injectable()
export class CalorHistoricoService {
  private readonly logger = new Logger(CalorHistoricoService.name);

  constructor(
    private prisma: PrismaService,
    private clienteMl: ClienteMlService,
  ) {}

  async horasCalorSevero(
    galponId: number,
    diaVida: number | null,
  ): Promise<number> {
    try {
      const horas = await this.horasConAmbasLecturas(galponId);
      if (horas.length === 0) return 0;

      const respuesta = await this.clienteMl.llamar('/riesgo-calor', {
        horas,
        dia_vida: diaVida !== null && diaVida >= 1 ? diaVida : null,
      });
      if (!respuesta?.ok) return 0;
      return this.contarSeveras(await this.clienteMl.leerJson(respuesta));
    } catch (error) {
      const motivo = error instanceof Error ? error.message : 'desconocido';
      this.logger.warn(`No se pudo medir el calor del galpón: ${motivo}`);
      return 0;
    }
  }

  private async horasConAmbasLecturas(galponId: number) {
    const desde = new Date(Date.now() - DIAS_DE_HISTORIAL * 24 * 3600 * 1000);
    const filas = await this.prisma.$queryRaw<PromedioHorario[]>(Prisma.sql`
      SELECT date_trunc('hour', m.fecha_hora) AS hora,
             s.tipo AS tipo,
             AVG(m.valor) AS promedio
      FROM mediciones m
      JOIN sensores s ON s.id = m.sensor_id
      WHERE s.galpon_id = ${galponId}
        AND s.tipo IN ('temperatura', 'humedad')
        AND m.calidad = 'ok'
        AND m.fecha_hora >= ${desde}
      GROUP BY 1, 2
      ORDER BY 1
    `);

    const porHora = new Map<string, HoraLeida>();
    for (const fila of filas) {
      const clave = new Date(fila.hora).toISOString().slice(0, 16);
      const hora = porHora.get(clave) ?? { hora: clave };
      const valor = Number(fila.promedio);
      if (fila.tipo === 'temperatura') hora.temperatura = valor;
      if (fila.tipo === 'humedad') hora.humedad = valor;
      porHora.set(clave, hora);
    }

    return [...porHora.values()]
      .filter(
        (h): h is Required<HoraLeida> =>
          h.temperatura !== undefined &&
          h.humedad !== undefined &&
          Number.isFinite(h.temperatura) &&
          Number.isFinite(h.humedad) &&
          h.temperatura >= LIMITE_TEMPERATURA.min &&
          h.temperatura <= LIMITE_TEMPERATURA.max &&
          h.humedad >= LIMITE_HUMEDAD.min &&
          h.humedad <= LIMITE_HUMEDAD.max,
      )
      .slice(-HORAS_MAXIMAS);
  }

  private contarSeveras(cuerpo: unknown): number {
    if (typeof cuerpo !== 'object' || cuerpo === null) return 0;
    const porNivel = (cuerpo as { horas_por_nivel?: Record<string, unknown> })
      .horas_por_nivel;
    if (!porNivel) return 0;
    const contar = (nivel: string) => {
      const horas = porNivel[nivel];
      return typeof horas === 'number' && Number.isFinite(horas) ? horas : 0;
    };
    return Math.min(HORAS_MAXIMAS, contar('peligro') + contar('emergencia'));
  }
}
