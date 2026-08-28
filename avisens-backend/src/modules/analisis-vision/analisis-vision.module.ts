import { Module } from '@nestjs/common';
import { AnalisisVisionController } from './analisis-vision.controller';
import { AnalisisVisionService } from './analisis-vision.service';

@Module({
  controllers: [AnalisisVisionController],
  providers: [AnalisisVisionService],
  exports: [AnalisisVisionService],
})
export class AnalisisVisionModule {}
