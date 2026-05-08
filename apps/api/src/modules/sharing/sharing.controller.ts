import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { ResolvedShare, ShareSummary } from '@quill-collab/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateShareDto } from './dto/create-share.dto';
import { SharingService } from './sharing.service';

@Controller()
export class SharingController {
  constructor(private readonly sharing: SharingService) {}

  /**
   * Create a new share link for a document.
   * Only the document owner can create shares.
   */
  @UseGuards(JwtAuthGuard)
  @Post('documents/:documentId/shares')
  async createShare(
    @CurrentUser() jwt: JwtPayload,
    @Param('documentId') documentId: string,
    @Body() dto: CreateShareDto,
  ): Promise<ShareSummary> {
    const share = await this.sharing.createShare(jwt.sub, documentId, dto);
    return SharingService.toSummary(share);
  }

  /**
   * List all shares for a document.
   * Only the document owner can list shares.
   */
  @UseGuards(JwtAuthGuard)
  @Get('documents/:documentId/shares')
  async listShares(
    @CurrentUser() jwt: JwtPayload,
    @Param('documentId') documentId: string,
  ): Promise<ShareSummary[]> {
    const shares = await this.sharing.listShares(jwt.sub, documentId);
    return shares.map(SharingService.toSummary);
  }

  /**
   * Revoke (delete) a share.
   * Only the document owner can revoke shares.
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('shares/:shareId')
  async revokeShare(
    @CurrentUser() jwt: JwtPayload,
    @Param('shareId') shareId: string,
  ): Promise<void> {
    await this.sharing.revokeShare(jwt.sub, shareId);
  }

  /**
   * Resolve a share token to document info + permission.
   * Public endpoint — no auth required.
   */
  @Get('share/:token')
  async resolveToken(@Param('token') token: string): Promise<ResolvedShare> {
    return this.sharing.resolveToken(token);
  }
}
