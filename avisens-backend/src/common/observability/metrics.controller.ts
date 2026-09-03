import {
  Controller,
  Get,
  Header,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsTokenGuard } from '../guards/metrics-token.guard';
import { ObservabilityService } from './observability.service';

// Prometheus raspa esto cada pocos segundos y no puede iniciar sesión, asi
// que la puerta es un token fijo y no el JWT del resto de la API.
@ApiExcludeController()
@SkipThrottle()
@UseGuards(MetricsTokenGuard)
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  obtener() {
    return this.observability.prometheus();
  }
}
