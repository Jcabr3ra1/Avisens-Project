import { Module } from '@nestjs/common';
import { ModelosMlController } from './modelos-ml.controller';
import { ModelosMlService } from './modelos-ml.service';

@Module({
  controllers: [ModelosMlController],
  providers: [ModelosMlService],
  exports: [ModelosMlService],
})
export class ModelosMlModule {}
