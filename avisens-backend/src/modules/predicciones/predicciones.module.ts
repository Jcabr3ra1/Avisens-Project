import { Module } from '@nestjs/common';
import { PrediccionesController } from './predicciones.controller';
import { PrediccionesService } from './predicciones.service';
import { ClienteMlService } from './cliente-ml.service';
import { CurvaCrecimientoService } from './curva-crecimiento.service';
import { PronosticoClimaService } from './pronostico-clima.service';
import { RiesgoCalorService } from './riesgo-calor.service';
import { PlanLoteModule } from '../plan-lote/plan-lote.module';

@Module({
  imports: [PlanLoteModule],
  controllers: [PrediccionesController],
  providers: [
    PrediccionesService,
    ClienteMlService,
    CurvaCrecimientoService,
    PronosticoClimaService,
    RiesgoCalorService,
  ],
  exports: [PrediccionesService, CurvaCrecimientoService, RiesgoCalorService],
})
export class PrediccionesModule {}
