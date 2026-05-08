import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';

@Module({
  imports: [ActivityModule],
  controllers: [VersionsController],
  providers: [VersionsService],
  exports: [VersionsService],
})
export class VersionsModule {}
