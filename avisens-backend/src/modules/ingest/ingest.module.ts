import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { DeviceTokenGuard } from '../../common/guards/device-token.guard';

@Module({
  controllers: [IngestController],
  providers: [IngestService, DeviceTokenGuard],
})
export class IngestModule {}
