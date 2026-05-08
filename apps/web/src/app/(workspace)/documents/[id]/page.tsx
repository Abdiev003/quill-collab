'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Editor } from '@/components/editor/Editor';
import { useDocument } from '@/hooks/useDocument';
import { useRenameDocument } from '@/hooks/useDocuments';

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: document, isLoading, isError } = useDocument(id);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-muted-foreground border-r-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading document…</p>
        </div>
      </div>
    );
  }

  if (isError || !document) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Document not found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            It may have been deleted or you don&apos;t have access.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/documents')}>
          ← Back to documents
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <DocumentHeader documentId={document.id} initialTitle={document.title} />
      <div className="flex-1 overflow-hidden">
        <Editor documentId={document.id} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline-editable document title
// ---------------------------------------------------------------------------

function DocumentHeader({
  documentId,
  initialTitle,
}: {
  documentId: string;
  initialTitle: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameMutation = useRenameDocument();

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === initialTitle) {
      setTitle(initialTitle);
      setEditing(false);
      return;
    }
    renameMutation.mutate({ id: documentId, title: trimmed });
    setEditing(false);
  }, [title, initialTitle, documentId, renameMutation]);

  return (
    <div className="border-b bg-card px-6 py-3">
      {editing ? (
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setTitle(initialTitle);
              setEditing(false);
            }
          }}
          className="h-auto border-none bg-transparent px-0 py-0 text-lg font-semibold tracking-tight shadow-none focus-visible:ring-0"
          maxLength={200}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-70"
          title="Click to rename"
        >
          {title || 'Untitled'}
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-muted-foreground/50"
          >
            <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
          </svg>
        </button>
      )}
    </div>
  );
}
