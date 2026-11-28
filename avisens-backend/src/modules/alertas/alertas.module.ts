import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';
import { AlertasEscalamientoService } from './alertas-escalamiento.service';
import { AlertasEscalamientoJob } from './alertas-escalamiento.job';

@Module({
  imports: [AuditoriaModule],
  controllers: [AlertasController],
  providers: [AlertasService, AlertasEscalamientoService, AlertasEscalamientoJob],
  exports: [AlertasService, AlertasEscalamientoService],
})
export class AlertasModule {}
