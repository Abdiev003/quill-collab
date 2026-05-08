'use client';

import { useAuth } from '@/lib/auth/AuthProvider';

export default function DocumentsPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-zinc-500">
            Signed in as {user?.displayName} ({user?.email})
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </header>
      <p className="text-sm text-zinc-500">
        Document list will appear here in Phase 2.
      </p>
    </div>
  );
}
