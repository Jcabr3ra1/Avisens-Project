import { Module } from '@nestjs/common';
import { MovimientosFinancierosController } from './movimientos-financieros.controller';
import { MovimientosFinancierosService } from './movimientos-financieros.service';

@Module({
  controllers: [MovimientosFinancierosController],
  providers: [MovimientosFinancierosService],
})
export class MovimientosFinancierosModule {}
