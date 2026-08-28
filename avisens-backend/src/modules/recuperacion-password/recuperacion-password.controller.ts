import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RecuperacionPasswordService } from './recuperacion-password.service';
import { SolicitarRecuperacionDto } from './dto/solicitar-recuperacion.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';

@ApiTags('recuperacion-password')
@Controller('recuperacion-password')
export class RecuperacionPasswordController {
  constructor(
    private recuperacionPasswordService: RecuperacionPasswordService,
  ) {}

  @Post('solicitar')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Solicitar recuperación de contraseña (genera y envía un token)',
  })
  solicitar(@Body() dto: SolicitarRecuperacionDto) {
    return this.recuperacionPasswordService.solicitar(dto);
  }

  @Post('restablecer')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Restablecer la contraseña con un token válido' })
  restablecer(@Body() dto: RestablecerPasswordDto) {
    return this.recuperacionPasswordService.restablecer(dto);
  }
}
