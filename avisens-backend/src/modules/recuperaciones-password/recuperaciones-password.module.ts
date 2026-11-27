import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RecuperacionesPasswordController } from './recuperaciones-password.controller';
import { RecuperacionesPasswordService } from './recuperaciones-password.service';

@Module({
  imports: [PassportModule],
  controllers: [RecuperacionesPasswordController],
  providers: [RecuperacionesPasswordService],
})
export class RecuperacionesPasswordModule {}
