import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsappService } from './whatsapp.service';
import { JobCoordinatorService } from '../../common/jobs/job-coordinator.service';

@Injectable()
export class WhatsappInactividadJob {
  constructor(
    private whatsapp: WhatsappService,
    private jobs: JobCoordinatorService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cerrarConversacionesSinRespuesta() {
    const ventana = new Date().toISOString().slice(0, 16);
    await this.jobs.ejecutar(
      'whatsapp-inactividad',
      ventana,
      async () => {
        await this.whatsapp.cerrarInactivas();
      },
      55 * 1000,
    );
  }
}
