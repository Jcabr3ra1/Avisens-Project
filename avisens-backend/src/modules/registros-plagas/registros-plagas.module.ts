import { Module } from '@nestjs/common';
import { RegistrosPlagasController } from './registros-plagas.controller';
import { RegistrosPlagasService } from './registros-plagas.service';

@Module({
  controllers: [RegistrosPlagasController],
  providers: [RegistrosPlagasService],
})
export class RegistrosPlagasModule {}
