import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { VersionSummary } from '@quill-collab/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { VersionsService } from './versions.service';

@UseGuards(JwtAuthGuard)
@Controller('documents/:documentId/versions')
export class VersionsController {
  constructor(private readonly versions: VersionsService) {}

  @Get()
  async list(
    @CurrentUser() jwt: JwtPayload,
    @Param('documentId') documentId: string,
  ): Promise<VersionSummary[]> {
    const versions = await this.versions.listVersions(jwt.sub, documentId);
    return versions.map(VersionsService.toSummary);
  }

  @Post(':versionId/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  async restore(
    @CurrentUser() jwt: JwtPayload,
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ): Promise<void> {
    await this.versions.restoreVersion(jwt.sub, documentId, versionId);
  }
}
