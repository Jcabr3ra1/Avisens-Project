import {
  Body,
  Get,
  Controller,
  Headers,
  Res,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceTokenGuard } from '../../common/guards/device-token.guard';
import type { DeviceRequest } from '../../common/guards/device-token.guard';
import { IngestService } from './ingest.service';
import { IngestDto } from './dto/ingest.dto';
import type { Response } from 'express';
import { FirmwareService } from '../firmware/firmware.service';

@ApiTags('ingest')
@Controller({ path: 'ingest', version: VERSION_NEUTRAL })
export class IngestController {
  constructor(
    private ingestService: IngestService,
    private firmware: FirmwareService,
  ) {}

  @Get('configuracion')
  @UseGuards(DeviceTokenGuard)
  @ApiOperation({
    summary: 'Conexiones DHT22 activas del controlador autenticado',
  })
  configuracion(
    @Req() req: DeviceRequest,
    @Headers('x-firmware-version') versionFirmware?: string,
  ) {
    return this.ingestService.configuracion(req.dispositivo, versionFirmware);
  }

  @Get('firmware')
  @UseGuards(DeviceTokenGuard)
  @ApiOperation({
    summary: 'Binario del firmware publicado (actualización por Wi-Fi)',
  })
  async descargarFirmware(@Res() res: Response) {
    const firmware = await this.firmware.binarioVigente();
    const binario = Buffer.from(firmware.binario);
    res
      .status(200)
      .set({
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(binario.length),
        'X-Firmware-Version': firmware.version,
        'X-Firmware-Sha256': firmware.sha256,
      })
      .end(binario);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(DeviceTokenGuard)
  @ApiOperation({
    summary: 'Ingesta de lecturas desde un dispositivo (ESP32) por token',
  })
  registrar(@Body() dto: IngestDto, @Req() req: DeviceRequest) {
    return this.ingestService.registrar(dto, req.dispositivo, req.ip);
  }
}
