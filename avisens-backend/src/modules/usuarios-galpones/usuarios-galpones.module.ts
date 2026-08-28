// usuarios-galpones.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuariosGalponesController } from './usuarios-galpones.controller';
import { UsuariosGalponesService } from './usuarios-galpones.service';

@Module({
  controllers: [UsuariosGalponesController],
  providers: [UsuariosGalponesService, PrismaService],
  exports: [UsuariosGalponesService],
})
export class UsuariosGalponesModule {}
