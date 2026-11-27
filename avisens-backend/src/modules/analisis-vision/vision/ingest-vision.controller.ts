import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceTokenGuard } from '../../../common/guards/device-token.guard';
import type { DeviceRequest } from '../../../common/guards/device-token.guard';
import { VisionIngestService } from './vision-ingest.service';

// Misma puerta que /ingest de los sensores (X-Device-Token), pero la ESP32-CAM
// manda la foto JPEG tal cual en el cuerpo. El galpón sale del token.
@ApiTags('ingest')
@Controller({ path: 'ingest', version: VERSION_NEUTRAL })
export class IngestVisionController {
  constructor(private vision: VisionIngestService) {}

  @Post('foto')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(DeviceTokenGuard)
  @ApiConsumes('image/jpeg')
  @ApiOperation({
    summary: 'Foto de la ESP32-CAM: detecta pollos, sigue a los quietos y alerta',
  })
  registrar(@Body() foto: Buffer, @Req() req: DeviceRequest) {
    return this.vision.registrarFoto(req.dispositivo, foto);
  }
}
