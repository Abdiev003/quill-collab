import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

interface ScheduledPersist {
  timer: ReturnType<typeof setTimeout>;
  getState: () => Uint8Array;
  onPersist?: (state: Uint8Array) => void | Promise<void>;
}

@Injectable()
export class YjsPersistenceService implements OnModuleDestroy {
  private readonly logger = new Logger(YjsPersistenceService.name);
  private readonly scheduledPersists = new Map<string, ScheduledPersist>();

  constructor(private readonly prisma: PrismaService) {}

  async loadDocument(documentId: string): Promise<Uint8Array | null> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { yState: true },
    });
    if (!doc || !doc.yState) return null;
    return new Uint8Array(doc.yState);
  }

  async saveDocument(documentId: string, state: Uint8Array): Promise<void> {
    await this.prisma.document.update({
      where: { id: documentId },
      data: { yState: Buffer.from(state) },
    });
    this.logger.debug(
      `Persisted yState for document ${documentId} (${state.byteLength} bytes)`,
    );
  }

  scheduleDocumentPersist(
    documentId: string,
    getState: () => Uint8Array,
    opts: {
      delayMs: number;
      onPersist?: (state: Uint8Array) => void | Promise<void>;
    },
  ): void {
    this.cancelScheduledPersist(documentId);

    const scheduled: ScheduledPersist = {
      getState,
      onPersist: opts.onPersist,
      timer: setTimeout(() => {
        const pending = this.scheduledPersists.get(documentId);
        if (!pending) return;
        this.scheduledPersists.delete(documentId);
        void this.runScheduledPersist(documentId, pending);
      }, opts.delayMs),
    };

    this.scheduledPersists.set(documentId, scheduled);
  }

  cancelScheduledPersist(documentId: string): void {
    const scheduled = this.scheduledPersists.get(documentId);
    if (!scheduled) return;
    clearTimeout(scheduled.timer);
    this.scheduledPersists.delete(documentId);
  }

  async flushScheduledPersist(documentId: string): Promise<boolean> {
    const scheduled = this.scheduledPersists.get(documentId);
    if (!scheduled) return false;

    clearTimeout(scheduled.timer);
    this.scheduledPersists.delete(documentId);
    await this.runScheduledPersist(documentId, scheduled);
    return true;
  }

  onModuleDestroy(): void {
    for (const scheduled of this.scheduledPersists.values()) {
      clearTimeout(scheduled.timer);
    }
    this.scheduledPersists.clear();
  }

  private async runScheduledPersist(
    documentId: string,
    scheduled: ScheduledPersist,
  ): Promise<void> {
    const state = scheduled.getState();
    await this.saveDocument(documentId, state);
    await scheduled.onPersist?.(state);
  }
}
