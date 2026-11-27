import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { IniciarChatDto } from './dto/iniciar-chat.dto';
import { ResponderChatDto } from './dto/responder-chat.dto';

@ApiTags('chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private chatbotService: ChatbotService) {}

  @Post('iniciar')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Iniciar una conversacion de calificacion (publico)',
  })
  iniciar(@Body() dto: IniciarChatDto) {
    return this.chatbotService.iniciar(dto);
  }

  @Post('responder')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Responder la pregunta actual del chatbot (publico)',
  })
  responder(@Body() dto: ResponderChatDto) {
    return this.chatbotService.responder(dto);
  }
}
