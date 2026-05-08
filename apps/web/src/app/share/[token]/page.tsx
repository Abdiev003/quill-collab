'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { EditorContent, useEditor } from '@tiptap/react';
import type { ResolvedShare } from '@quill-collab/shared';
import { resolveShareToken } from '@/lib/api/sharing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; share: ResolvedShare };

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    resolveShareToken(token)
      .then((share) => {
        if (!cancelled) setState({ kind: 'ready', share });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error', message: 'Invalid or expired share link' });
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.kind === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-muted-foreground border-r-muted-foreground" />
          <p className="text-sm text-muted-foreground">Opening shared document…</p>
        </div>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background animate-fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-destructive"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">{state.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This link may have been revoked or the document deleted.
          </p>
        </div>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Go to homepage
        </Button>
      </div>
    );
  }

  return <SharedEditor share={state.share} shareToken={token} />;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface ShareCollabSnapshot {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  connectionStatus: ConnectionStatus;
}

const EMPTY_SNAPSHOT: ShareCollabSnapshot = {
  ydoc: null,
  provider: null,
  connectionStatus: 'connecting',
};

class ShareCollabStore {
  private listeners = new Set<() => void>();
  private snapshot: ShareCollabSnapshot = EMPTY_SNAPSHOT;
  private ydoc: Y.Doc | null = null;
  private provider: WebsocketProvider | null = null;

  connect(documentId: string, shareToken: string) {
    const doc = new Y.Doc();
    const ws = new WebsocketProvider(WS_URL, documentId, doc, {
      connect: false,
      params: { shareToken, documentId },
    });

    ws.awareness.setLocalStateField('user', {
      userId: `guest-${Date.now()}`,
      displayName: 'Guest',
      color: '#94a3b8',
    });

    this.ydoc = doc;
    this.provider = ws;

    ws.on('status', ({ status }: { status: string }) => {
      const mapped: ConnectionStatus =
        status === 'connected'
          ? 'connected'
          : status === 'disconnected'
            ? 'disconnected'
            : 'connecting';
      this.emit({ connectionStatus: mapped });
    });

    this.emit({});
    ws.connect();
  }

  destroy() {
    this.provider?.disconnect();
    this.provider?.destroy();
    this.ydoc?.destroy();
    this.ydoc = null;
    this.provider = null;
    this.snapshot = EMPTY_SNAPSHOT;
    this.notify();
  }

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getSnapshot = (): ShareCollabSnapshot => this.snapshot;

  private emit(patch: Partial<ShareCollabSnapshot>) {
    this.snapshot = {
      ydoc: this.ydoc,
      provider: this.provider,
      connectionStatus: this.snapshot.connectionStatus,
      ...patch,
    };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }
}

function useShareCollaboration(documentId: string, shareToken: string): ShareCollabSnapshot {
  const [store] = useState(() => new ShareCollabStore());

  useEffect(() => {
    store.connect(documentId, shareToken);
    return () => store.destroy();
  }, [store, documentId, shareToken]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

function SharedEditor({ share, shareToken }: { share: ResolvedShare; shareToken: string }) {
  const isReadOnly = share.permission === 'READ';
  const { ydoc, provider, connectionStatus } = useShareCollaboration(share.documentId, shareToken);

  if (!ydoc || !provider || connectionStatus !== 'connected') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-muted-foreground border-r-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {connectionStatus === 'disconnected' ? 'Reconnecting…' : 'Connecting to document…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <SharedEditorHeader
        title={share.documentTitle}
        permission={share.permission}
        connectionStatus={connectionStatus}
      />
      <div className="flex-1 overflow-y-auto">
        <SharedEditorContent ydoc={ydoc} provider={provider} isReadOnly={isReadOnly} />
      </div>
    </div>
  );
}

function SharedEditorHeader({
  title,
  permission,
  connectionStatus,
}: {
  title: string;
  permission: string;
  connectionStatus: ConnectionStatus;
}) {
  return (
    <div className="flex items-center justify-between border-b bg-card px-6 py-3">
      <div className="flex items-center gap-3">
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
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
          <p className="text-[11px] text-muted-foreground">Shared via Quill</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={permission === 'WRITE' ? 'default' : 'secondary'} className="text-[10px]">
          {permission === 'WRITE' ? 'Can edit' : 'View only'}
        </Badge>
        {connectionStatus === 'connected' && (
          <Badge
            variant="secondary"
            className="gap-1.5 font-normal text-emerald-600 dark:text-emerald-400"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </Badge>
        )}
      </div>
    </div>
  );
}

function SharedEditorContent({
  ydoc,
  provider,
  isReadOnly,
}: {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  isReadOnly: boolean;
}) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          undoRedo: false,
        }),
        Placeholder.configure({
          placeholder: isReadOnly ? 'This shared document is empty.' : 'Start typing…',
        }),
        Collaboration.configure({
          document: ydoc,
          provider,
        }),
      ],
      editable: !isReadOnly,
      editorProps: {
        attributes: {
          class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none px-6 py-4',
          role: 'textbox',
          'aria-label': 'Shared document editor',
          'aria-multiline': 'true',
        },
      },
      immediatelyRender: false,
    },
    [ydoc, provider, isReadOnly],
  );

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return <EditorContent editor={editor} className="min-h-full" />;
}
