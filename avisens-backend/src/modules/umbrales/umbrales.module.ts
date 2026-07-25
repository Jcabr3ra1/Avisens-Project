import { Module } from '@nestjs/common';
import { UmbralesController } from './umbrales.controller';
import { UmbralesService } from './umbrales.service';

@Module({
  controllers: [UmbralesController],
  providers: [UmbralesService],
})
export class UmbralesModule {}
