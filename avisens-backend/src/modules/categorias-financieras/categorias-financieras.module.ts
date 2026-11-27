import { Module } from '@nestjs/common';
import { CategoriasFinancierasController } from './categorias-financieras.controller';
import { CategoriasFinancierasService } from './categorias-financieras.service';

@Module({
  controllers: [CategoriasFinancierasController],
  providers: [CategoriasFinancierasService],
})
export class CategoriasFinancierasModule {}
