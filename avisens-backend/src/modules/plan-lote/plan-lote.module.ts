import { Module } from '@nestjs/common';
import { PlanLoteController } from './plan-lote.controller';
import { PlanLoteService } from './plan-lote.service';

@Module({
  controllers: [PlanLoteController],
  providers: [PlanLoteService],
  exports: [PlanLoteService],
})
export class PlanLoteModule {}
