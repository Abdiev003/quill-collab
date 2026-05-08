'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Editor } from '@/components/editor/Editor';
import { VersionHistoryDrawer } from '@/components/documents/VersionHistoryDrawer';
import { ShareModal } from '@/components/documents/ShareModal';
import { EditorLoadingSkeleton } from '@/components/ui/page-skeletons';
import { useDocument } from '@/hooks/useDocument';
import { useRenameDocument } from '@/hooks/useDocuments';
import { useCollaboration } from '@/lib/collab/useCollaboration';

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: document, isLoading, isError } = useDocument(id);

  if (isLoading) {
    return <EditorLoadingSkeleton />;
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

  return <DocumentEditor documentId={document.id} initialTitle={document.title} />;
}

// ---------------------------------------------------------------------------
// Document editor — owns the collaboration connection
// ---------------------------------------------------------------------------

function DocumentEditor({
  documentId,
  initialTitle,
}: {
  documentId: string;
  initialTitle: string;
}) {
  const collab = useCollaboration(documentId);

  const disconnectProvider = useCallback(() => {
    if (collab.provider) {
      // eslint-disable-next-line react-hooks/immutability
      collab.provider.shouldConnect = false;
      collab.provider.disconnect();
    }
  }, [collab.provider]);

  return (
    <div className="flex h-full flex-col">
      <DocumentHeader
        documentId={documentId}
        initialTitle={initialTitle}
        disconnectProvider={disconnectProvider}
      />
      <div className="flex-1 overflow-hidden">
        <Editor collab={collab} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline-editable document title + version history + share button
// ---------------------------------------------------------------------------

function DocumentHeader({
  documentId,
  initialTitle,
  disconnectProvider,
}: {
  documentId: string;
  initialTitle: string;
  disconnectProvider: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
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
    <>
      <div className="flex items-center justify-between border-b bg-card px-6 py-3">
        {/* Title */}
        <div className="flex-1">
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
              aria-label="Rename document"
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

        {/* Actions: Share + Version history */}
        <div className="flex items-center gap-1">
          {/* Share button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShareModalOpen(true)}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Share document"
            title="Share document"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span className="hidden sm:inline text-xs">Share</span>
          </Button>

          {/* Version history button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVersionDrawerOpen(true)}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Version history"
            title="Version history"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="hidden sm:inline text-xs">History</span>
          </Button>
        </div>
      </div>

      {/* Version History Drawer */}
      <VersionHistoryDrawer
        documentId={documentId}
        open={versionDrawerOpen}
        onClose={() => setVersionDrawerOpen(false)}
        disconnectProvider={disconnectProvider}
      />

      {/* Share Modal */}
      <ShareModal
        documentId={documentId}
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </>
  );
}
