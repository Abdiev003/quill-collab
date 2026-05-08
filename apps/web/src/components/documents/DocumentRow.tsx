'use client';

import type { DocumentSummary } from '@quill-collab/shared';
import { useEffect, useRef, useState } from 'react';
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
    <li className="group flex items-center gap-3 border-b border-zinc-200 px-4 py-3 last:border-b-0 dark:border-zinc-800">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={draft ?? ''}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setDraft(null);
            }}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            maxLength={200}
          />
        ) : (
          <button
            type="button"
            onClick={() => setDraft(doc.title)}
            className="block w-full truncate text-left text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            title="Click to rename"
          >
            {doc.title || 'Untitled'}
          </button>
        )}
        <p className="mt-0.5 text-xs text-zinc-500">
          Updated {new Date(doc.updatedAt).toLocaleString()}
        </p>
      </div>
      <button
        type="button"
        onClick={() => deleteMutation.mutate({ id: doc.id })}
        disabled={deleteMutation.isPending}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-red-950/30"
      >
        Delete
      </button>
    </li>
  );
}
