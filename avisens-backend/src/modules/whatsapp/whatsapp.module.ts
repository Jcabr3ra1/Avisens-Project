import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { WhatsappProcessor } from './whatsapp.cola';
import { COLA_WHATSAPP } from './whatsapp.tipos';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappSender } from './whatsapp.sender';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [BullModule.registerQueue({ name: COLA_WHATSAPP }), ChatbotModule],
  controllers: [WhatsappController],
  providers: [WhatsappSender, WhatsappService, WhatsappProcessor],
  exports: [BullModule],
})
export class WhatsappModule {}
