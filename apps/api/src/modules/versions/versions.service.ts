import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ActivityType } from '@prisma/client';
import type { Version } from '@prisma/client';
import * as Y from 'yjs';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

/** Maximum length of the plain-text preview stored with each version */
const PREVIEW_MAX_LENGTH = 200;

/** Minimum interval between automatic snapshots for the same document (ms) */
const MIN_SNAPSHOT_INTERVAL_MS = 30_000;

@Injectable()
export class VersionsService {
  private readonly logger = new Logger(VersionsService.name);

  private lastSnapshotAt = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef,
    private readonly activity: ActivityService,
  ) {}

  async onDocumentIdle(
    documentId: string,
    yState: Uint8Array,
    lastEditorUserId: string,
  ): Promise<void> {
    const now = Date.now();
    const lastSnapshot = this.lastSnapshotAt.get(documentId) ?? 0;

    if (now - lastSnapshot < MIN_SNAPSHOT_INTERVAL_MS) {
      return;
    }

    try {
      const preview = this.extractPreview(yState);

      await this.prisma.version.create({
        data: {
          documentId,
          ySnapshot: Buffer.from(yState),
          preview,
          createdBy: lastEditorUserId,
        },
      });

      this.lastSnapshotAt.set(documentId, now);
      this.logger.log(
        `Version snapshot created for document ${documentId} (${yState.byteLength} bytes)`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to create version snapshot for document ${documentId}`,
        err,
      );
    }
  }

  async listVersions(
    requesterId: string,
    documentId: string,
  ): Promise<Version[]> {
    await this.assertDocumentAccess(requesterId, documentId);

    return this.prisma.version.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async restoreVersion(
    requesterId: string,
    documentId: string,
    versionId: string,
  ): Promise<void> {
    await this.assertDocumentAccess(requesterId, documentId);

    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
    });

    if (!version || version.documentId !== documentId) {
      throw new NotFoundException('Version not found');
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { yState: version.ySnapshot },
    });

    await this.activity.record({
      documentId,
      type: ActivityType.RESTORE,
      actorId: requesterId,
      metadata: { source: 'version', versionId },
    });

    // Reset the in-memory WS room so the old Y.Doc doesn't persist
    // back over the restored state. Uses ModuleRef to avoid circular deps.
    try {
      const { CollaborationGateway } =
        await import('../collaboration/collaboration.gateway');
      const gateway = this.moduleRef.get(CollaborationGateway, {
        strict: false,
      });
      gateway.resetRoom(documentId);
    } catch {
      this.logger.warn(
        `Could not reset room for document ${documentId} after restore`,
      );
    }

    this.logger.log(`Document ${documentId} restored to version ${versionId}`);
  }

  /** TipTap stores content in a Y.XmlFragment named "default". */
  private extractPreview(yState: Uint8Array): string {
    try {
      const doc = new Y.Doc();
      Y.applyUpdate(doc, yState);
      const xmlFragment = doc.getXmlFragment('default');
      const text = xmlFragment.toJSON();
      doc.destroy();
      return text.slice(0, PREVIEW_MAX_LENGTH);
    } catch {
      return '';
    }
  }

  private async assertDocumentAccess(
    requesterId: string,
    documentId: string,
  ): Promise<void> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true, deletedAt: true },
    });

    if (!doc || doc.deletedAt !== null) {
      throw new NotFoundException('Document not found');
    }

    if (doc.ownerId !== requesterId) {
      throw new ForbiddenException('You do not have access to this document');
    }
  }

  static toSummary(v: Version): {
    id: string;
    documentId: string;
    preview: string;
    createdBy: string;
    createdAt: string;
  } {
    return {
      id: v.id,
      documentId: v.documentId,
      preview: v.preview,
      createdBy: v.createdBy,
      createdAt: v.createdAt.toISOString(),
    };
  }
}
