'use client';

import { useState } from 'react';
import type { VersionSummary } from '@quill-collab/shared';
import { Button } from '@/components/ui/button';
import { useVersions, useRestoreVersion } from '@/hooks/useVersions';

interface VersionHistoryDrawerProps {
  documentId: string;
  open: boolean;
  onClose: () => void;
  /** Tear down the y-websocket provider before restore */
  disconnectProvider?: () => void;
}

export function VersionHistoryDrawer({
  documentId,
  open,
  onClose,
  disconnectProvider,
}: VersionHistoryDrawerProps) {
  const { data: versions, isLoading } = useVersions(documentId);
  const restoreMutation = useRestoreVersion(documentId, disconnectProvider);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-[360px] flex-col border-l bg-card shadow-xl"
        style={{ animation: 'slide-in-right 0.25s ease-out' }}
        role="dialog"
        aria-label="Version history"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold">Version History</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close version history"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex flex-col gap-3 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse-subtle rounded-lg border bg-muted/30 p-4"
                >
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="mt-2 h-2.5 w-full rounded bg-muted" />
                  <div className="mt-1.5 h-2.5 w-3/4 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : !versions || versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                No versions yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Versions are created automatically as you edit
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {versions.map((version, index) => (
                <VersionCard
                  key={version.id}
                  version={version}
                  isLatest={index === 0}
                  isConfirming={confirmId === version.id}
                  isRestoring={
                    restoreMutation.isPending &&
                    restoreMutation.variables?.versionId === version.id
                  }
                  onRestore={() => {
                    if (confirmId === version.id) {
                      restoreMutation.mutate({ versionId: version.id });
                      setConfirmId(null);
                    } else {
                      setConfirmId(version.id);
                    }
                  }}
                  onCancelConfirm={() => setConfirmId(null)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function VersionCard({
  version,
  isLatest,
  isConfirming,
  isRestoring,
  onRestore,
  onCancelConfirm,
}: {
  version: VersionSummary;
  isLatest: boolean;
  isConfirming: boolean;
  isRestoring: boolean;
  onRestore: () => void;
  onCancelConfirm: () => void;
}) {
  const date = new Date(version.createdAt);
  const timeAgo = getRelativeTime(date);

  return (
    <div
      className="group relative rounded-lg border bg-card p-3.5 transition-all hover:border-foreground/10 hover:shadow-sm animate-fade-in"
    >
      {/* Time header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{timeAgo}</span>
          {isLatest && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Latest
            </span>
          )}
        </div>
        <time
          dateTime={version.createdAt}
          className="text-[10px] text-muted-foreground"
          title={date.toLocaleString()}
        >
          {date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>

      {/* Preview */}
      {version.preview && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {version.preview}
        </p>
      )}

      {/* Restore button */}
      {!isLatest && (
        <div className="mt-3 flex items-center gap-2">
          {isConfirming ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={onRestore}
                disabled={isRestoring}
                className="h-7 px-3 text-xs"
              >
                {isRestoring ? (
                  <>
                    <svg
                      className="mr-1 h-3 w-3 animate-spin"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r="6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="28"
                        strokeDashoffset="22"
                      />
                    </svg>
                    Restoring…
                  </>
                ) : (
                  'Confirm restore'
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelConfirm}
                className="h-7 px-2 text-xs"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onRestore}
              className="h-7 gap-1.5 px-3 text-xs opacity-0 transition-opacity group-hover:opacity-100"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Restore this version
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
