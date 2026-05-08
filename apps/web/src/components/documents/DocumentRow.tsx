'use client';

import Link from 'next/link';
import type { DocumentSummary } from '@quill-collab/shared';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useRenameDocument,
  useSoftDeleteDocument,
} from '@/hooks/useDocuments';

export function DocumentRow({ doc }: { doc: DocumentSummary }) {
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  const inputRef = useRef<HTMLInputElement>(null);
  const renameMutation = useRenameDocument();
  const deleteMutation = useSoftDeleteDocument();

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    if (draft === null) return;
    const trimmed = draft.trim();
    if (!trimmed || trimmed === doc.title) {
      setDraft(null);
      return;
    }
    renameMutation.mutate({ id: doc.id, title: trimmed });
    setDraft(null);
  };

  return (
    <div className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 transition-shadow hover:shadow-sm">
      {/* Doc icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
          <rect x="3" y="2" width="10" height="12" rx="1.5" />
          <line x1="6" y1="6" x2="10" y2="6" />
          <line x1="6" y1="9" x2="9" y2="9" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            ref={inputRef}
            value={draft ?? ''}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setDraft(null);
            }}
            className="h-7"
            maxLength={200}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={`/documents/${doc.id}`}
              className="block truncate text-sm font-medium text-foreground hover:underline"
            >
              {doc.title || 'Untitled'}
            </Link>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => setDraft(doc.title)}
              aria-label="Rename document"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
              </svg>
            </Button>
          </div>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          Updated {new Date(doc.updatedAt).toLocaleString()}
        </p>
      </div>

      <Button
        variant="destructive"
        size="xs"
        className="opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => deleteMutation.mutate({ id: doc.id })}
        disabled={deleteMutation.isPending}
      >
        Delete
      </Button>
    </div>
  );
}
