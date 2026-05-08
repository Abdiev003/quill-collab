import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@quill-collab/shared';
import { PrismaService } from './infra/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Quill Collab API';
  }

  async getHealth(): Promise<HealthResponse> {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      db: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
