'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ActivityPanel } from '@/components/activity/ActivityPanel';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useActiveDocuments, useCreateDocument } from '@/hooks/useDocuments';

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
  const [activeTab, setActiveTab] = useState<'documents' | 'activity'>('documents');
  const currentDocumentId = pathname.match(/^\/documents\/([^/]+)/)?.[1] ?? null;
  const effectiveTab = currentDocumentId ? activeTab : 'documents';

  if (collapsed) {
    return (
      <aside
        className="flex h-full w-12 flex-col items-center border-r border-sidebar-border bg-sidebar py-3"
        aria-label="Workspace sidebar"
      >
        <Tooltip>
          <TooltipTrigger render={<span />}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggle}
              aria-label="Expand sidebar"
              aria-expanded={false}
            >
              <ChevronIcon direction="right" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand sidebar</TooltipContent>
        </Tooltip>
      </aside>
    );
  }

  return (
    <aside
      className="flex h-full w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
      aria-label="Workspace sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2" aria-label="Quill home">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Quill
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label="Collapse sidebar"
          aria-expanded={true}
        >
          <ChevronIcon direction="left" />
        </Button>
      </div>

      {/* New document */}
      <div className="px-3 pb-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => createMutation.mutate({})}
          disabled={createMutation.isPending}
          aria-label="Create a new document"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          New document
        </Button>
      </div>

      {/* Document list */}
      <nav className="flex-1 overflow-y-auto px-2 py-1" aria-label="Workspace navigation">
        {currentDocumentId && (
          <div
            className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1"
            role="tablist"
            aria-label="Sidebar content"
          >
            <TabButton
              active={effectiveTab === 'documents'}
              onClick={() => setActiveTab('documents')}
            >
              Docs
            </TabButton>
            <TabButton
              active={effectiveTab === 'activity'}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </TabButton>
          </div>
        )}

        {effectiveTab === 'activity' && currentDocumentId ? (
          <SidebarSection label="Activity">
            <ActivityPanel documentId={currentDocumentId} />
          </SidebarSection>
        ) : (
          <SidebarSection label="Documents">
            {isLoading ? (
              <div className="space-y-1.5 px-2 py-1">
                <SkeletonLine width="75%" />
                <SkeletonLine width="60%" />
                <SkeletonLine width="85%" />
              </div>
            ) : documents.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">No documents yet</p>
            ) : (
              documents.map((doc) => {
                const href = `/documents/${doc.id}`;
                const active = pathname === href;
                return (
                  <Link
                    key={doc.id}
                    href={href}
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors',
                      active
                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
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
                      className="shrink-0 opacity-50 group-hover:opacity-80 transition-opacity"
                    >
                      <rect x="3" y="2" width="10" height="12" rx="1.5" />
                      <line x1="6" y1="6" x2="10" y2="6" />
                      <line x1="6" y1="9" x2="9" y2="9" />
                    </svg>
                    <span className="truncate">{doc.title || 'Untitled'}</span>
                  </Link>
                );
              })
            )}
          </SidebarSection>
        )}

        <Separator className="my-2" />

        <Link
          href="/trash"
          className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors',
            pathname === '/trash'
              ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          )}
          aria-current={pathname === '/trash' ? 'page' : undefined}
        >
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
            className="opacity-50"
          >
            <polyline points="3 4 4 4 13 4" />
            <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
            <path d="M12 4v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4" />
          </svg>
          Trash
        </Link>
      </nav>

      {/* User footer */}
      <Separator />
      <div className="px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[11px] font-semibold">
              {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground" title={user?.displayName}>
              {user?.displayName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground" title={user?.email}>
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-1.5 w-full gap-1.5"
          onClick={async () => {
            setSigningOut(true);
            try {
              await signOut();
            } finally {
              setSigningOut(false);
            }
          }}
          disabled={signingOut}
          aria-label="Sign out"
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
            <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" />
            <polyline points="10 11 14 8 10 5" />
            <line x1="14" y1="8" x2="6" y2="8" />
          </svg>
          Sign out
        </Button>
      </div>
    </aside>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
      <div className="mt-0.5 space-y-0.5">{children}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-md px-2 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-sidebar text-sidebar-foreground shadow-sm'
          : 'text-muted-foreground hover:text-sidebar-foreground',
      )}
    >
      {children}
    </button>
  );
}

function SkeletonLine({ width }: { width: string }) {
  return <div className="h-3 animate-pulse rounded bg-muted" style={{ width }} />;
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
