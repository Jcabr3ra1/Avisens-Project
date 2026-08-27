// movimientos-inventario.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MovimientosInventarioController } from './movimientos-inventarios.controller';
import { MovimientosInventarioService } from './movimientos-inventarios.service';

@Module({
  controllers: [MovimientosInventarioController],
  providers: [MovimientosInventarioService, PrismaService],
  exports: [MovimientosInventarioService],
})
export class MovimientosInventarioModule {}