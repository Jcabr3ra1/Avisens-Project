import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { MovimientosFinancierosController } from './movimientos-financieros.controller';
import { MovimientosFinancierosService } from './movimientos-financieros.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [MovimientosFinancierosController],
  providers: [MovimientosFinancierosService],
})
export class MovimientosFinancierosModule {}
