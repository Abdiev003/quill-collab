'use client';

import { DocumentRow } from '@/components/documents/DocumentRow';
import {
  useActiveDocuments,
  useCreateDocument,
} from '@/hooks/useDocuments';

export default function DocumentsPage() {
  const { data: documents, isLoading, isError } = useActiveDocuments();
  const createMutation = useCreateDocument();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-zinc-500">
            Click a title to rename. Hover to reveal delete.
          </p>
        </div>
        <button
          type="button"
          onClick={() => createMutation.mutate({})}
          disabled={createMutation.isPending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New document
        </button>
      </header>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading documents…</p>
      ) : isError ? (
        <p className="text-sm text-red-500">Failed to load documents.</p>
      ) : !documents || documents.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            No documents yet. Create your first one to get started.
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </ul>
      )}
    </div>
  );
}
