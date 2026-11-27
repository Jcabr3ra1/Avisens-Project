import { Module } from '@nestjs/common';
import { IndicadoresController } from './indicadores.controller';
import { IndicadoresService } from './indicadores.service';
import { IndicadoresJob } from './indicadores.job';
import { ResumenCrecimientoService } from './resumen-crecimiento.service';
import { CompararLotesService } from './comparar-lotes.service';

@Module({
  controllers: [IndicadoresController],
  providers: [
    IndicadoresService,
    IndicadoresJob,
    ResumenCrecimientoService,
    CompararLotesService,
  ],
  exports: [IndicadoresService],
})
export class IndicadoresModule {}
