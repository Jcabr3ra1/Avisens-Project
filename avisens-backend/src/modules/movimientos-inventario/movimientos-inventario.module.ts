import { Module } from '@nestjs/common';
import { MovimientosInventarioController } from './movimientos-inventario.controller';
import { MovimientosInventarioService } from './movimientos-inventario.service';
import { InsumosModule } from '../insumos/insumos.module';

@Module({
  imports: [InsumosModule],
  controllers: [MovimientosInventarioController],
  providers: [MovimientosInventarioService],
  exports: [MovimientosInventarioService],
})
export class MovimientosInventarioModule {}
