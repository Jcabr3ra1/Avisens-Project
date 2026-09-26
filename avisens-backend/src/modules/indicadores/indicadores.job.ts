import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { IndicadoresService } from './indicadores.service';
import { JobCoordinatorService } from '../../common/jobs/job-coordinator.service';

@Injectable()
export class IndicadoresJob {
  private readonly logger = new Logger(IndicadoresJob.name);

  constructor(
    private prisma: PrismaService,
    private indicadores: IndicadoresService,
    private jobs: JobCoordinatorService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async calcularDiar() {
    const ventana = new Date().toISOString().slice(0, 10);
    await this.jobs.ejecutar(
      'indicadores-diarios',
      ventana,
      async () => {
        const lotes = await this.prisma.lote.findMany({
          where: {
            estado: 'activo',
            galpon: {
              activo: true,
              granja: { activa: true, organizacion: { activa: true } },
            },
          },
          select: { id: true },
        });

        this.logger.log(`Procesando ${lotes.length} lotes activos`);
        let fallidosTecnicos = 0;
        const lotesIncoherentes: number[] = [];

        for (const lote of lotes) {
          try {
            const indicador = await this.indicadores.calcularParaLote(
              lote.id,
            );
            if (indicador.estado_calculo === 'mortalidad_incoherente') {
              lotesIncoherentes.push(lote.id);
            }
            await this.indicadores.generarAlertaDesvio(lote.id);
          } catch (error: unknown) {
            fallidosTecnicos += 1;
            const mensaje =
              error instanceof Error ? error.message : String(error);
            this.logger.error(`Falló lote ${lote.id}: ${mensaje}`);
          }
        }

        if (lotesIncoherentes.length > 0) {
          this.logger.warn(
            JSON.stringify({
              evento: 'indicadores.lotes_incoherentes',
              ventana,
              cantidad: lotesIncoherentes.length,
              lotes: lotesIncoherentes,
            }),
          );
        }

        if (fallidosTecnicos > 0) {
          throw new Error(
            `${fallidosTecnicos} de ${lotes.length} lotes fallaron por excepcion tecnica`,
          );
        }
      },
      6 * 60 * 60 * 1000,
    );
  }
}
