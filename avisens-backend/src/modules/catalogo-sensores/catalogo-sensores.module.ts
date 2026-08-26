import { Module } from '@nestjs/common';
import { CatalogoSensoresController } from './catalogo-sensores.controller';
import { CatalogoSensoresService } from './catalogo-sensores.service';

@Module({
  controllers: [CatalogoSensoresController],
  providers: [CatalogoSensoresService],
})
export class CatalogoSensoresModule {}
