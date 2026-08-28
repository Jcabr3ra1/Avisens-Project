import { Module } from '@nestjs/common';
import { MovimientosInventarioController } from './movimientos-inventario.controller';
import { MovimientosInventarioService } from './movimientos-inventario.service';

@Module({
  controllers: [MovimientosInventarioController],
  providers: [MovimientosInventarioService],
  exports: [MovimientosInventarioService],
})
export class MovimientosInventarioModule {}
