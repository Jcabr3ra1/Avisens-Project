import { Module } from '@nestjs/common';
import { IndicadoresController } from './indicadores.controller';
import { IndicadoresService } from './indicadores.service';
import { IndicadoresJob } from './indicadores.job';

@Module({
  controllers: [IndicadoresController],
  providers: [IndicadoresService, IndicadoresJob],
  exports: [IndicadoresService],
})
export class IndicadoresModule {}
