import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@quill-collab/shared';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('healthz')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
