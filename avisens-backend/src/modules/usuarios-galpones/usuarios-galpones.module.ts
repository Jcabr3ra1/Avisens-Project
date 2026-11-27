import { Module } from '@nestjs/common';
import { UsuariosGalponesController } from './usuarios-galpones.controller';
import { UsuariosGalponesService } from './usuarios-galpones.service';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [UsuariosModule],
  controllers: [UsuariosGalponesController],
  providers: [UsuariosGalponesService],
  exports: [UsuariosGalponesService],
})
export class UsuariosGalponesModule {}
