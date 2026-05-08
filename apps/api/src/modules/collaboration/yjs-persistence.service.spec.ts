import { YjsPersistenceService } from './yjs-persistence.service';

function makeService() {
  const prisma = {
    document: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  return {
    service: new YjsPersistenceService(prisma as never),
    prisma,
  };
}

describe('YjsPersistenceService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces scheduled document persistence per document', async () => {
    const { service, prisma } = makeService();
    const first = new Uint8Array([1, 2, 3]);
    const latest = new Uint8Array([4, 5, 6]);
    const onPersist = jest.fn();

    service.scheduleDocumentPersist('doc-1', () => first, {
      delayMs: 100,
      onPersist,
    });
    service.scheduleDocumentPersist('doc-1', () => latest, {
      delayMs: 100,
      onPersist,
    });

    await jest.advanceTimersByTimeAsync(99);
    expect(prisma.document.update).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);

    expect(prisma.document.update).toHaveBeenCalledTimes(1);
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { yState: Buffer.from(latest) },
    });
    expect(onPersist).toHaveBeenCalledWith(latest);
  });

  it('flushes a scheduled persist immediately', async () => {
    const { service, prisma } = makeService();
    const state = new Uint8Array([7, 8, 9]);

    service.scheduleDocumentPersist('doc-1', () => state, { delayMs: 100 });

    await expect(service.flushScheduledPersist('doc-1')).resolves.toBe(true);

    expect(prisma.document.update).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(100);
    expect(prisma.document.update).toHaveBeenCalledTimes(1);
  });
});
