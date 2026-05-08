import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { REQUEST_ID_HEADER } from './infra/http/request-id.middleware';
import { PrismaModule } from './infra/prisma/prisma.module';
import { ActivityModule } from './modules/activity/activity.module';
import { AuthModule } from './modules/auth/auth.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { SharingModule } from './modules/sharing/sharing.module';
import { UsersModule } from './modules/users/users.module';
import { VersionsModule } from './modules/versions/versions.module';

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
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
        customAttributeKeys: {
          reqId: 'requestId',
        },
        genReqId: (req, res) => {
          const incoming = req.headers[REQUEST_ID_HEADER];
          const requestId = Array.isArray(incoming) ? incoming[0] : incoming;
          const resolved =
            requestId?.trim() ||
            ('id' in req && typeof req.id === 'string' ? req.id : randomUUID());
          req.id = resolved;
          res.setHeader(REQUEST_ID_HEADER, resolved);
          return resolved;
        },
        customProps: (req) => ({
          requestId: 'id' in req && typeof req.id === 'string' ? req.id : null,
        }),
      },
    }),
    PrismaModule,
    ActivityModule,
    UsersModule,
    AuthModule,
    CollaborationModule,
    DocumentsModule,
    SharingModule,
    VersionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
