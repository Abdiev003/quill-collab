import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@quill-collab/shared';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Quill Collab API';
  }

  getHealth(): HealthResponse {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
