'use client';

import { Button } from '@/components/ui/button';
import { DocumentRow } from '@/components/documents/DocumentRow';
import {
  useActiveDocuments,
  useCreateDocument,
} from '@/hooks/useDocuments';

export default function DocumentsPage() {
  const { data: documents, isLoading, isError } = useActiveDocuments();
  const createMutation = useCreateDocument();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 animate-fade-in">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your workspace documents. Click to open, hover for actions.
          </p>
        </div>
        <Button
          onClick={() => createMutation.mutate({})}
          disabled={createMutation.isPending}
          className="gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          New document
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border bg-card p-4"
            >
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/4 rounded bg-muted/50" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-destructive">Failed to load documents.</p>
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <p className="text-sm font-medium">No documents yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first document to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
