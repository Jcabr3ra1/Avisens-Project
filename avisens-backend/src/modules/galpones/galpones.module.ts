import { Module } from '@nestjs/common';
import { GalponesController } from './galpones.controller';
import { GalponesService } from './galpones.service';

@Module({
  controllers: [GalponesController],
  providers: [GalponesService],
})
export class GalponesModule {}
