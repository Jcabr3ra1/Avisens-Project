import { Module } from '@nestjs/common';
import { CurvasObjetivoController } from './curvas-objetivo.controller';
import { CurvasObjetivoService } from './curvas-objetivo.service';

@Module({
  controllers: [CurvasObjetivoController],
  providers: [CurvasObjetivoService],
})
export class CurvasObjetivoModule {}
