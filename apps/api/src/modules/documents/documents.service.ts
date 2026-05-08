import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Document } from '@prisma/client';
import type { DocumentDetail, DocumentSummary } from '@quill-collab/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  listActive(ownerId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  listTrashed(ownerId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { ownerId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async findOne(ownerId: string, id: string): Promise<Document> {
    return this.assertOwned(ownerId, id, { allowTrashed: false });
  }

  create(ownerId: string, input: { title?: string }): Promise<Document> {
    return this.prisma.document.create({
      data: {
        ownerId,
        title: input.title?.trim() || 'Untitled',
      },
    });
  }

  async rename(ownerId: string, id: string, title: string): Promise<Document> {
    await this.assertOwned(ownerId, id, { allowTrashed: false });
    return this.prisma.document.update({
      where: { id },
      data: { title: title.trim() },
    });
  }

  async updateContent(
    ownerId: string,
    id: string,
    content: Record<string, unknown>,
  ): Promise<Document> {
    await this.assertOwned(ownerId, id, { allowTrashed: false });
    return this.prisma.document.update({
      where: { id },
      data: { content: content as never },
    });
  }

  async softDelete(ownerId: string, id: string): Promise<Document> {
    await this.assertOwned(ownerId, id, { allowTrashed: false });
    return this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(ownerId: string, id: string): Promise<Document> {
    const doc = await this.assertOwned(ownerId, id, { allowTrashed: true });
    if (doc.deletedAt === null) {
      return doc;
    }
    return this.prisma.document.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async hardDelete(ownerId: string, id: string): Promise<void> {
    const doc = await this.assertOwned(ownerId, id, { allowTrashed: true });
    if (doc.deletedAt === null) {
      throw new ForbiddenException(
        'Document must be in trash before permanent deletion',
      );
    }
    await this.prisma.document.delete({ where: { id } });
  }

  private async assertOwned(
    ownerId: string,
    id: string,
    opts: { allowTrashed: boolean },
  ): Promise<Document> {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this document');
    }
    if (!opts.allowTrashed && doc.deletedAt !== null) {
      throw new NotFoundException('Document not found');
    }
    return doc;
  }

  static toSummary(doc: Document): DocumentSummary {
    return {
      id: doc.id,
      title: doc.title,
      ownerId: doc.ownerId,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
    };
  }

  static toDetail(doc: Document): DocumentDetail {
    return {
      ...DocumentsService.toSummary(doc),
      content: (doc.content as Record<string, unknown>) ?? null,
    };
  }
}
