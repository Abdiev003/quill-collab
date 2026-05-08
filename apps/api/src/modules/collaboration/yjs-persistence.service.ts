import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class YjsPersistenceService {
  private readonly logger = new Logger(YjsPersistenceService.name);

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
}
