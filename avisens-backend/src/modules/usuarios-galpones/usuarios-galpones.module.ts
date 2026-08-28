import { Module } from '@nestjs/common';
import { UsuariosGalponesController } from './usuarios-galpones.controller';
import { UsuariosGalponesService } from './usuarios-galpones.service';

@Module({
  controllers: [UsuariosGalponesController],
  providers: [UsuariosGalponesService],
  exports: [UsuariosGalponesService],
})
export class UsuariosGalponesModule {}
