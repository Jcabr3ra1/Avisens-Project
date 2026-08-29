import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CaptacionProspectosService } from './captacion-prospectos.service';
import { CrearProspectoWebDto } from './dto/crear-prospecto-web.dto';

@ApiTags('captacion-prospectos')
@Controller('captacion-prospectos')
export class CaptacionProspectosController {
  constructor(private readonly captacionProspectos: CaptacionProspectosService) {}

  @Post('web')
  @Throttle({ default: { limit: 4, ttl: 60000 } })
  @ApiOperation({ summary: 'Registrar una solicitud comercial desde la web' })
  crearDesdeWeb(@Body() dto: CrearProspectoWebDto) {
    return this.captacionProspectos.crearDesdeWeb(dto);
  }
}
