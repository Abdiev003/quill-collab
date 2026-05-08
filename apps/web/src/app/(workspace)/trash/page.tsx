'use client';

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
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
        <p className="text-sm text-zinc-500">
          Restore documents, or delete them permanently.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-red-500">Failed to load trash.</p>
      ) : !documents || documents.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">Trash is empty.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 last:border-b-0 dark:border-zinc-800"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {doc.title || 'Untitled'}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Deleted{' '}
                  {doc.deletedAt
                    ? new Date(doc.deletedAt).toLocaleString()
                    : 'unknown'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => restore.mutate({ id: doc.id })}
                disabled={restore.isPending}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Restore
              </button>
              <button
                type="button"
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
                className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Delete forever
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
