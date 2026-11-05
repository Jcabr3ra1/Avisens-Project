import { Module } from '@nestjs/common';
import { AlertasModule } from '../alertas/alertas.module';
import { ClienteMlService } from '../predicciones/cliente-ml.service';
import { AnalisisVisionController } from './analisis-vision.controller';
import { AnalisisVisionService } from './analisis-vision.service';
import { IngestVisionController } from './vision/ingest-vision.controller';
import { VisionIngestService } from './vision/vision-ingest.service';

@Module({
  imports: [AlertasModule],
  controllers: [AnalisisVisionController, IngestVisionController],
  providers: [AnalisisVisionService, VisionIngestService, ClienteMlService],
  exports: [AnalisisVisionService],
})
export class AnalisisVisionModule {}
