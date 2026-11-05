import { Module } from '@nestjs/common';
import { IndicadoresController } from './indicadores.controller';
import { IndicadoresService } from './indicadores.service';
import { IndicadoresJob } from './indicadores.job';
import { ResumenCrecimientoService } from './resumen-crecimiento.service';

@Module({
  controllers: [IndicadoresController],
  providers: [IndicadoresService, IndicadoresJob, ResumenCrecimientoService],
  exports: [IndicadoresService],
})
export class IndicadoresModule {}
