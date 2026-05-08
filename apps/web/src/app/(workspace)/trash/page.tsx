'use client';

import { Button } from '@/components/ui/button';
import {
  usePermanentlyDeleteDocument,
  useRestoreDocument,
  useTrashedDocuments,
} from '@/hooks/useDocuments';

export default function TrashPage() {
  const { data: documents, isLoading, isError } = useTrashedDocuments();
  const restore = useRestoreDocument();
  const hardDelete = usePermanentlyDeleteDocument();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Restore documents, or delete them permanently.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border bg-card p-4">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/4 rounded bg-muted/50" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-destructive">Failed to load trash.</p>
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <p className="text-sm font-medium">Trash is empty</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Deleted documents will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50" aria-hidden="true">
                  <rect x="3" y="2" width="10" height="12" rx="1.5" />
                  <line x1="6" y1="6" x2="10" y2="6" />
                  <line x1="6" y1="9" x2="9" y2="9" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground/70">
                  {doc.title || 'Untitled'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Deleted{' '}
                  {doc.deletedAt
                    ? new Date(doc.deletedAt).toLocaleString()
                    : 'unknown'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => restore.mutate({ id: doc.id })}
                  disabled={restore.isPending}
                >
                  Restore
                </Button>
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => {
                    if (
                      confirm(
                        `Permanently delete "${doc.title || 'Untitled'}"? This cannot be undone.`,
                      )
                    ) {
                      hardDelete.mutate({ id: doc.id });
                    }
                  }}
                  disabled={hardDelete.isPending}
                >
                  Delete forever
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
