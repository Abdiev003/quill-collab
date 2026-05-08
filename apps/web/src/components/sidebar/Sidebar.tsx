'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  useActiveDocuments,
  useCreateDocument,
} from '@/hooks/useDocuments';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { data: documents = [], isLoading } = useActiveDocuments();
  const createMutation = useCreateDocument();
  const [signingOut, setSigningOut] = useState(false);

  const onCreate = () => {
    createMutation.mutate({});
  };

  if (collapsed) {
    return (
      <aside className="flex h-full w-12 flex-col items-center border-r border-zinc-200 bg-zinc-50 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        >
          <ChevronIcon direction="right" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold tracking-tight">Quill</span>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Collapse sidebar"
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        >
          <ChevronIcon direction="left" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onCreate}
          disabled={createMutation.isPending}
          className="w-full rounded-md bg-zinc-900 px-3 py-1.5 text-left text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + New document
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <SidebarSection label="Documents">
          {isLoading ? (
            <SidebarPlaceholder>Loading…</SidebarPlaceholder>
          ) : documents.length === 0 ? (
            <SidebarPlaceholder>No documents yet</SidebarPlaceholder>
          ) : (
            documents.map((doc) => {
              const href = `/documents/${doc.id}`;
              const active = pathname === href;
              return (
                <Link
                  key={doc.id}
                  href={href}
                  className={`block truncate rounded-md px-2 py-1.5 text-sm ${
                    active
                      ? 'bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {doc.title || 'Untitled'}
                </Link>
              );
            })
          )}
        </SidebarSection>

        <div className="mt-4">
          <Link
            href="/trash"
            className={`block rounded-md px-2 py-1.5 text-sm ${
              pathname === '/trash'
                ? 'bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Trash
          </Link>
        </div>
      </nav>

      <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
        <p className="truncate text-xs text-zinc-500" title={user?.email}>
          {user?.displayName}
        </p>
        <p className="truncate text-xs text-zinc-400" title={user?.email}>
          {user?.email}
        </p>
        <button
          type="button"
          onClick={async () => {
            setSigningOut(true);
            try {
              await signOut();
            } finally {
              setSigningOut(false);
            }
          }}
          disabled={signingOut}
          className="mt-2 w-full rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <div className="mt-1 space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarPlaceholder({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-1 text-xs text-zinc-400">{children}</p>;
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={direction === 'right' ? 'rotate-180' : ''}
      aria-hidden
    >
      <path d="M10 12l-4-4 4-4" />
    </svg>
  );
}
