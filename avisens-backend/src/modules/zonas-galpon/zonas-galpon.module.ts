import { Module } from '@nestjs/common';
import { ZonasGalponController } from './zonas-galpon.controller';
import { ZonasGalponService } from './zonas-galpon.service';

@Module({
  controllers: [ZonasGalponController],
  providers: [ZonasGalponService],
  exports: [ZonasGalponService],
})
export class ZonasGalponModule {}
