import { Module } from '@nestjs/common';
import { EvidenciaAlertaController } from './evidencia-alerta.controller';
import { EvidenciaAlertaService } from './evidencia-alerta.service';

@Module({
  controllers: [EvidenciaAlertaController],
  providers: [EvidenciaAlertaService],
  exports: [EvidenciaAlertaService],
})
export class EvidenciaAlertaModule {}
