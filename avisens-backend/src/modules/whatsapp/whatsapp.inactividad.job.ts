import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsappService } from './whatsapp.service';

@Injectable()
export class WhatsappInactividadJob {
  constructor(private whatsapp: WhatsappService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cerrarConversacionesSinRespuesta() {
    await this.whatsapp.cerrarInactivas();
  }
}
