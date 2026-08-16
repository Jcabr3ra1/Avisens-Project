import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClimaService } from './clima.service';
import { ClimaController } from './clima.controller';
import { ClimaJob } from './clima.job';

@Module({
  imports: [PrismaModule],
  controllers: [ClimaController],
  providers: [ClimaService, ClimaJob],
})
export class ClimaModule {}
