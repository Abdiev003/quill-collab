import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CollaborationGateway } from './collaboration.gateway';
import { YjsPersistenceService } from './yjs-persistence.service';
import { VersionsModule } from '../versions/versions.module';

@Module({
  imports: [JwtModule.register({}), VersionsModule],
  providers: [CollaborationGateway, YjsPersistenceService],
})
export class CollaborationModule {}
