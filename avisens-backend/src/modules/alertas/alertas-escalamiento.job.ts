import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobCoordinatorService } from '../../common/jobs/job-coordinator.service';
import { AlertasEscalamientoService } from './alertas-escalamiento.service';

@Injectable()
export class AlertasEscalamientoJob {
  constructor(
    private readonly escalamiento: AlertasEscalamientoService,
    private readonly jobs: JobCoordinatorService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async revisarAlertasVencidas() {
    const ventana = new Date().toISOString().slice(0, 16);
    await this.jobs.ejecutar(
      'alertas-escalamiento',
      ventana,
      async () => {
        await this.escalamiento.escalarAlertasVencidas();
      },
      55 * 1000,
    );
  }
}
