import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ProspectosController } from './prospectos.controller';
import { ProspectosService } from './prospectos.service';

@Module({
  imports: [UsuariosModule],
  controllers: [ProspectosController],
  providers: [ProspectosService],
})
export class ProspectosModule {}
