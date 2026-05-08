import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ActivityType as PrismaActivityType, Prisma } from '@prisma/client';
import type { ActivitySummary, ActivityType } from '@quill-collab/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';

const EDIT_ACTIVITY_THROTTLE_MS = 5 * 60 * 1000;
const MAX_ACTIVITY_ROWS = 50;

const TO_API_TYPE: Record<PrismaActivityType, ActivityType> = {
  CREATE: 'create',
  RENAME: 'rename',
  EDIT_BATCH: 'edit-batch',
  RESTORE: 'restore',
  SHARE: 'share',
};

type ActivityRow = {
  id: string;
  documentId: string;
  type: PrismaActivityType;
  actorId: string;
  actorName: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
};

interface RecordActivityInput {
  documentId: string;
  type: PrismaActivityType;
  actorId: string;
  actorName?: string | null;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async listForDocument(
    requesterId: string,
    documentId: string,
  ): Promise<ActivitySummary[]> {
    await this.assertDocumentAccess(requesterId, documentId);

    const rows = await this.prisma.activity.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      take: MAX_ACTIVITY_ROWS,
    });

    return rows.map(ActivityService.toSummary);
  }

  async record(input: RecordActivityInput): Promise<ActivitySummary | null> {
    if (input.type === PrismaActivityType.EDIT_BATCH) {
      const recent = await this.prisma.activity.findFirst({
        where: {
          documentId: input.documentId,
          actorId: input.actorId,
          type: PrismaActivityType.EDIT_BATCH,
          createdAt: {
            gte: new Date(Date.now() - EDIT_ACTIVITY_THROTTLE_MS),
          },
        },
        select: { id: true },
      });

      if (recent) return null;
    }

    const actorName =
      input.actorName ?? (await this.resolveActorName(input.actorId));

    const row = await this.prisma.activity.create({
      data: {
        documentId: input.documentId,
        type: input.type,
        actorId: input.actorId,
        actorName,
        metadata: input.metadata,
      },
    });

    const summary = ActivityService.toSummary(row);
    await this.broadcast(input.documentId, summary);
    return summary;
  }

  async assertDocumentAccess(
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

  private async resolveActorName(actorId: string): Promise<string | null> {
    if (actorId.startsWith('anon-')) return 'Guest';

    const user = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { displayName: true, email: true },
    });

    return user?.displayName ?? user?.email ?? null;
  }

  private async broadcast(
    documentId: string,
    activity: ActivitySummary,
  ): Promise<void> {
    try {
      const { CollaborationGateway } =
        await import('../collaboration/collaboration.gateway');
      const gateway = this.moduleRef.get(CollaborationGateway, {
        strict: false,
      });
      gateway.broadcastActivity(documentId, activity);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not broadcast activity: ${message}`);
    }
  }

  static toSummary(row: ActivityRow): ActivitySummary {
    const metadata =
      row.metadata &&
      typeof row.metadata === 'object' &&
      !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null;

    return {
      id: row.id,
      documentId: row.documentId,
      type: TO_API_TYPE[row.type],
      actorId: row.actorId,
      actorName: row.actorName,
      metadata,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
