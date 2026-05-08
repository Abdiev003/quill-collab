import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { ActivitySummary } from '@quill-collab/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ActivityService } from './activity.service';

@UseGuards(JwtAuthGuard)
@Controller('documents/:documentId/activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  async list(
    @CurrentUser() jwt: JwtPayload,
    @Param('documentId') documentId: string,
  ): Promise<ActivitySummary[]> {
    return this.activity.listForDocument(jwt.sub, documentId);
  }
}
