import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { WhatsappProcessor } from './whatsapp.cola';
import { COLA_WHATSAPP } from './whatsapp.tipos';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappSender } from './whatsapp.sender';
import { WhatsappService } from './whatsapp.service';
import { WhatsappInactividadJob } from './whatsapp.inactividad.job';
import { FirmaMetaGuard } from './firma-meta.guard';

@Module({
  imports: [BullModule.registerQueue({ name: COLA_WHATSAPP }), ChatbotModule],
  controllers: [WhatsappController],
  providers: [
    WhatsappSender,
    WhatsappService,
    WhatsappProcessor,
    WhatsappInactividadJob,
    FirmaMetaGuard,
  ],
  exports: [BullModule],
})
export class WhatsappModule {}
