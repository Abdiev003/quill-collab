import { ActivityType, type Document } from '@prisma/client';
import { DocumentsService } from './documents.service';

const baseDocument: Document = {
  id: 'doc-1',
  title: 'Draft',
  ownerId: 'user-1',
  yState: null,
  deletedAt: null,
  createdAt: new Date('2026-05-08T00:00:00.000Z'),
  updatedAt: new Date('2026-05-08T00:00:00.000Z'),
};

function makeService() {
  const prisma = {
    document: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const activity = {
    record: jest.fn().mockResolvedValue(null),
  };

  return {
    service: new DocumentsService(prisma as never, activity as never),
    prisma,
    activity,
  };
}

describe('DocumentsService', () => {
  it('soft deletes an owned active document', async () => {
    const { service, prisma } = makeService();
    const deleted = { ...baseDocument, deletedAt: new Date() };
    prisma.document.findUnique.mockResolvedValue(baseDocument);
    prisma.document.update.mockResolvedValue(deleted);

    await expect(service.softDelete('user-1', 'doc-1')).resolves.toBe(deleted);

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('restores a trashed document and records activity', async () => {
    const { service, prisma, activity } = makeService();
    const trashed = {
      ...baseDocument,
      deletedAt: new Date('2026-05-08T12:00:00.000Z'),
    };
    const restored = { ...baseDocument, deletedAt: null };
    prisma.document.findUnique.mockResolvedValue(trashed);
    prisma.document.update.mockResolvedValue(restored);

    await expect(service.restore('user-1', 'doc-1')).resolves.toBe(restored);

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { deletedAt: null },
    });
    expect(activity.record).toHaveBeenCalledWith({
      documentId: 'doc-1',
      type: ActivityType.RESTORE,
      actorId: 'user-1',
      metadata: { source: 'trash' },
    });
  });

  it('leaves an already active document unchanged during restore', async () => {
    const { service, prisma, activity } = makeService();
    prisma.document.findUnique.mockResolvedValue(baseDocument);

    await expect(service.restore('user-1', 'doc-1')).resolves.toBe(
      baseDocument,
    );

    expect(prisma.document.update).not.toHaveBeenCalled();
    expect(activity.record).not.toHaveBeenCalled();
  });
});
