import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { COLA_WHATSAPP } from '../whatsapp/whatsapp.tipos';

@Module({
  imports: [BullModule.registerQueue({ name: COLA_WHATSAPP })],
  controllers: [HealthController],
})
export class HealthModule {}
