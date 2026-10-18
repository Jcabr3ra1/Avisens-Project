import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { DeviceTokenGuard } from '../../common/guards/device-token.guard';
import { ObservabilityModule } from '../../common/observability/observability.module';
import { AlertasModule } from '../alertas/alertas.module';
import { FirmwareModule } from '../firmware/firmware.module';

@Module({
  imports: [ObservabilityModule, AlertasModule, FirmwareModule],
  controllers: [IngestController],
  providers: [IngestService, DeviceTokenGuard],
})
export class IngestModule {}
