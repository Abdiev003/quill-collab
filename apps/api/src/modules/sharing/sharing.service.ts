import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ActivityType } from '@prisma/client';
import type { Share } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import type { ShareSummary, ResolvedShare } from '@quill-collab/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class SharingService {
  private readonly logger = new Logger(SharingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef,
    private readonly activity: ActivityService,
  ) {}

  /** Create a shareable link for a document. Only the owner can share. */
  async createShare(
    userId: string,
    documentId: string,
    input: { permission: 'READ' | 'WRITE'; expiresAt?: string },
  ): Promise<Share> {
    await this.assertDocumentOwner(userId, documentId);
    await this.persistActiveRoom(documentId);

    const token = randomBytes(32).toString('base64url');

    const share = await this.prisma.share.create({
      data: {
        documentId,
        token,
        permission: input.permission,
        createdBy: userId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    this.logger.log(
      `Share created: doc=${documentId} perm=${input.permission} by=${userId}`,
    );

    await this.activity.record({
      documentId,
      type: ActivityType.SHARE,
      actorId: userId,
      metadata: { permission: input.permission },
    });

    return share;
  }

  /** List all active shares for a document. Only the owner can see them. */
  async listShares(userId: string, documentId: string): Promise<Share[]> {
    await this.assertDocumentOwner(userId, documentId);

    return this.prisma.share.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Revoke (delete) a share. Only the owner can revoke. */
  async revokeShare(userId: string, shareId: string): Promise<void> {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: { document: { select: { ownerId: true } } },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    if (share.document.ownerId !== userId) {
      throw new ForbiddenException('Only the document owner can revoke shares');
    }

    await this.prisma.share.delete({ where: { id: shareId } });
    this.logger.log(`Share revoked: ${shareId} by=${userId}`);
  }

  /** Resolve a share token to document info + permission. Public endpoint. */
  async resolveToken(token: string): Promise<ResolvedShare> {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: {
        document: { select: { id: true, title: true, deletedAt: true } },
      },
    });

    if (!share) {
      throw new NotFoundException('Invalid or expired share link');
    }

    if (share.document.deletedAt !== null) {
      throw new NotFoundException('Document has been deleted');
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new NotFoundException('Share link has expired');
    }

    await this.persistActiveRoom(share.document.id);

    return {
      documentId: share.document.id,
      documentTitle: share.document.title,
      permission: share.permission,
    };
  }

  /**
   * Validate a share token for WS connections.
   * Returns the documentId and permission if valid.
   */
  async validateShareToken(
    token: string,
    documentId: string,
  ): Promise<{ permission: 'READ' | 'WRITE' } | null> {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: {
        document: { select: { id: true, deletedAt: true } },
      },
    });

    if (!share) return null;
    if (share.document.id !== documentId) return null;
    if (share.document.deletedAt !== null) return null;
    if (share.expiresAt && share.expiresAt < new Date()) return null;

    return { permission: share.permission };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async assertDocumentOwner(
    userId: string,
    documentId: string,
  ): Promise<void> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true, deletedAt: true },
    });

    if (!doc) throw new NotFoundException('Document not found');
    if (doc.deletedAt !== null)
      throw new NotFoundException('Document not found');
    if (doc.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to manage this document',
      );
    }
  }

  private async persistActiveRoom(documentId: string): Promise<void> {
    try {
      const { CollaborationGateway } =
        await import('../collaboration/collaboration.gateway');
      const gateway = this.moduleRef.get(CollaborationGateway, {
        strict: false,
      });
      await gateway.persistRoomNow(documentId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Could not persist active collaboration room before sharing ${documentId}: ${message}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Serialisation
  // -------------------------------------------------------------------------

  static toSummary(share: Share): ShareSummary {
    return {
      id: share.id,
      documentId: share.documentId,
      token: share.token,
      permission: share.permission,
      createdBy: share.createdBy,
      expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
      createdAt: share.createdAt.toISOString(),
    };
  }
}
