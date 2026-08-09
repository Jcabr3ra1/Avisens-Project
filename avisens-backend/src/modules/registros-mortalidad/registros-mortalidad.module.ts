import { Module } from '@nestjs/common';
import { RegistrosMortalidadController } from './registros-mortalidad.controller';
import { RegistrosMortalidadService } from './registros-mortalidad.service';

@Module({
  controllers: [RegistrosMortalidadController],
  providers: [RegistrosMortalidadService],
})
export class RegistrosMortalidadModule {}
