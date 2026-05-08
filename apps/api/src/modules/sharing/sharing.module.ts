import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';

@Module({
  imports: [ActivityModule],
  controllers: [SharingController],
  providers: [SharingService],
  exports: [SharingService],
})
export class SharingModule {}
