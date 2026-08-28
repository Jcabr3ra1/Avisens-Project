import { Module } from '@nestjs/common';
import { RecuperacionPasswordController } from './recuperacion-password.controller';
import { RecuperacionPasswordService } from './recuperacion-password.service';

@Module({
  controllers: [RecuperacionPasswordController],
  providers: [RecuperacionPasswordService],
})
export class RecuperacionPasswordModule {}
