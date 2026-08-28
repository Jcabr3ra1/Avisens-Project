import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { JobCoordinatorService } from './job-coordinator.service';

@Injectable()
export class JobRetentionJob {
  private readonly logger = new Logger(JobRetentionJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jobs: JobCoordinatorService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async limpiarHistorial() {
    const ahora = new Date();
    const diasJobs = Number(this.config.get<string>('JOB_HISTORY_DAYS', '30'));
    const diasIngestas = Number(
      this.config.get<string>('IOT_IDEMPOTENCY_DAYS', '30'),
    );

    await this.jobs.ejecutar(
      'retencion-operativa',
      ahora.toISOString().slice(0, 10),
      async () => {
        const [jobs, ingestas] = await this.prisma.$transaction([
          this.prisma.ejecucionJob.deleteMany({
            where: {
              finalizada_en: {
                lt: new Date(ahora.getTime() - diasJobs * 86_400_000),
              },
            },
          }),
          this.prisma.ingestaDispositivo.deleteMany({
            where: {
              fecha_recepcion: {
                lt: new Date(ahora.getTime() - diasIngestas * 86_400_000),
              },
            },
          }),
        ]);
        this.logger.log(
          JSON.stringify({
            evento: 'retencion.completada',
            jobs_eliminados: jobs.count,
            ingestas_eliminadas: ingestas.count,
          }),
        );
      },
      30 * 60 * 1000,
    );
  }
}
