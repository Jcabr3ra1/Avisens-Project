import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { POLITICA_PRIVACIDAD_HTML } from './politica-privacidad.html';

@ApiExcludeController()
@SkipThrottle()
@Controller({ path: 'privacidad', version: VERSION_NEUTRAL })
export class LegalController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
  politicaPrivacidad(): string {
    return POLITICA_PRIVACIDAD_HTML;
  }
}
