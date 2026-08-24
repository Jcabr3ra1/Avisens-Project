import { Module } from '@nestjs/common';
import { InteraccionesChatbotController } from './interacciones-chatbot.controller';
import { InteraccionesChatbotService } from './interacciones-chatbot.service';

@Module({
  controllers: [InteraccionesChatbotController],
  providers: [InteraccionesChatbotService],
  exports: [InteraccionesChatbotService],
})
export class InteraccionesChatbotModule {}
