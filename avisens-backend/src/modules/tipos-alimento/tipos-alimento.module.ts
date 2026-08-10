import { Module } from '@nestjs/common';
import { TiposAlimentoController } from './tipos-alimento.controller';
import { TiposAlimentoService } from './tipos-alimento.service';

@Module({
  controllers: [TiposAlimentoController],
  providers: [TiposAlimentoService],
})
export class TiposAlimentoModule {}
