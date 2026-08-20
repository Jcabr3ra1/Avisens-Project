import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { WhatsappService } from './whatsapp.service';

@ApiExcludeController()
@Controller('whatsapp')
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  @Get('webhook')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  verificar(
    @Query('hub.mode') modo: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
    if (modo === 'subscribe' && esperado && token === esperado) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  @Post('webhook')
  @HttpCode(200)
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async recibir(@Body() cuerpo: unknown) {
    await this.whatsappService.encolarEntrantes(cuerpo);
    return { received: true };
  }
}
