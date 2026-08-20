import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotNluService } from './chatbot.nlu.service';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, ChatbotNluService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
