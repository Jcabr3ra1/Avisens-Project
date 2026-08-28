// zonas-galpon.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ZonasGalponController } from './zonas-galpon.controller';
import { ZonasGalponService } from './zonas-galpon.service';

@Module({
  controllers: [ZonasGalponController],
  providers: [ZonasGalponService, PrismaService],
  exports: [ZonasGalponService],
})
export class ZonasGalponModule {}