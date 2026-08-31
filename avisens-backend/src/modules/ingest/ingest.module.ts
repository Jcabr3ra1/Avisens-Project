import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { DeviceTokenGuard } from '../../common/guards/device-token.guard';
import { ObservabilityModule } from '../../common/observability/observability.module';
import { AlertasModule } from '../alertas/alertas.module';

@Module({
  imports: [ObservabilityModule, AlertasModule],
  controllers: [IngestController],
  providers: [IngestService, DeviceTokenGuard],
})
export class IngestModule {}
