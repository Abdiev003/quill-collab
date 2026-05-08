import path from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      envFilePath: [
        path.resolve(process.cwd(), '../../.env'),
        path.resolve(process.cwd(), '.env'),
      ],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CollaborationModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

