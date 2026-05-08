'use client';

import { useState, useCallback, useRef } from 'react';
import type { ShareSummary } from '@quill-collab/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShares, useCreateShare, useRevokeShare } from '@/hooks/useShares';
import { useToast } from '@/lib/toast/ToastProvider';

interface ShareModalProps {
  documentId: string;
  open: boolean;
  onClose: () => void;
}

export function ShareModal({ documentId, open, onClose }: ShareModalProps) {
  const { data: shares, isLoading } = useShares(documentId);
  const createMutation = useCreateShare(documentId);
  const revokeMutation = useRevokeShare(documentId);
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleCreate = useCallback(
    (permission: 'READ' | 'WRITE') => {
      createMutation.mutate({ permission });
    },
    [createMutation],
  );

  const handleCopyLink = useCallback(
    (share: ShareSummary) => {
      const url = `${window.location.origin}/share/${share.token}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(share.id);
        toast('Link copied to clipboard', 'success');
        setTimeout(() => setCopiedId(null), 2000);
      });
    },
    [toast],
  );

  const handleRevoke = useCallback(
    (shareId: string) => {
      revokeMutation.mutate({ shareId });
    },
    [revokeMutation],
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md rounded-xl border bg-card shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
            <h2 className="text-base font-semibold">Share document</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
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

        {/* Create new share */}
        <div className="border-b px-5 py-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Create a share link to let others access this document.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreate('READ')}
              disabled={createMutation.isPending}
              className="flex-1 gap-1.5"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Read-only
            </Button>
            <Button
              size="sm"
              onClick={() => handleCreate('WRITE')}
              disabled={createMutation.isPending}
              className="flex-1 gap-1.5"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Can edit
            </Button>
          </div>
        </div>

        {/* Existing shares */}
        <div className="px-5 py-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Active links
          </h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-muted-foreground border-r-muted-foreground" />
            </div>
          ) : !shares || shares.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground/70">
              No active share links
            </p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {shares.map((share) => (
                <ShareRow
                  key={share.id}
                  share={share}
                  isCopied={copiedId === share.id}
                  onCopy={() => handleCopyLink(share)}
                  onRevoke={() => handleRevoke(share.id)}
                  isRevoking={revokeMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShareRow({
  share,
  isCopied,
  onCopy,
  onRevoke,
  isRevoking,
}: {
  share: ShareSummary;
  isCopied: boolean;
  onCopy: () => void;
  onRevoke: () => void;
  isRevoking: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <Badge
          variant={share.permission === 'WRITE' ? 'default' : 'secondary'}
          className="shrink-0 text-[10px]"
        >
          {share.permission === 'WRITE' ? 'Edit' : 'View'}
        </Badge>
        <span className="truncate text-xs text-muted-foreground font-mono">
          …{share.token.slice(-12)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onCopy}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          title="Copy link"
          aria-label="Copy share link"
        >
          {isCopied ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-500"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
        <button
          onClick={onRevoke}
          disabled={isRevoking}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          title="Revoke"
          aria-label="Revoke share link"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
