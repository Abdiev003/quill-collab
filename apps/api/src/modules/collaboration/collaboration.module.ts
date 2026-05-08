import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CollaborationGateway } from './collaboration.gateway';
import { YjsPersistenceService } from './yjs-persistence.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [CollaborationGateway, YjsPersistenceService],
})
export class CollaborationModule {}
