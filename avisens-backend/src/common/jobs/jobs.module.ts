import { Global, Module } from '@nestjs/common';
import { JobCoordinatorService } from './job-coordinator.service';
import { JobRetentionJob } from './job-retention.job';

@Global()
@Module({
  providers: [JobCoordinatorService, JobRetentionJob],
  exports: [JobCoordinatorService],
})
export class JobsModule {}
