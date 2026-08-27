import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { InterpreteRespuestaService } from './interprete-respuesta.service';
import { CotizacionesModule } from '../cotizaciones/cotizaciones.module';

@Module({
  imports: [CotizacionesModule],
  controllers: [ChatbotController],
  providers: [ChatbotService, InterpreteRespuestaService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
