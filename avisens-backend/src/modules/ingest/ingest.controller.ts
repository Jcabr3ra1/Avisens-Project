import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceTokenGuard } from '../../common/guards/device-token.guard';
import type { DeviceRequest } from '../../common/guards/device-token.guard';
import { IngestService } from './ingest.service';
import { IngestDto } from './dto/ingest.dto';

@ApiTags('ingest')
@Controller('ingest')
export class IngestController {
  constructor(private ingestService: IngestService) {}

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
