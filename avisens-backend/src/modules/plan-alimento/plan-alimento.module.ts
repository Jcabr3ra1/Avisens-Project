import { Module } from '@nestjs/common';
import { PlanAlimentoController } from './plan-alimento.controller';
import { PlanAlimentoService } from './plan-alimento.service';
import { PlanLoteModule } from '../plan-lote/plan-lote.module';

@Module({
  imports: [PlanLoteModule],
  controllers: [PlanAlimentoController],
  providers: [PlanAlimentoService],
  exports: [PlanAlimentoService],
})
export class PlanAlimentoModule {}
