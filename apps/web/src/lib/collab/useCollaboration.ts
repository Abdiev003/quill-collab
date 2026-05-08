'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { getAccessToken } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthProvider';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

const COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

function pickColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface CollaborationUser {
  userId: string;
  displayName: string;
  color: string;
}

export interface CollabSnapshot {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  connectionStatus: ConnectionStatus;
  collaborators: CollaborationUser[];
}

// ---------------------------------------------------------------------------
// External store — holds mutable Yjs state outside of React
// ---------------------------------------------------------------------------

const EMPTY: CollabSnapshot = {
  ydoc: null,
  provider: null,
  connectionStatus: 'connecting',
  collaborators: [],
};

class CollabStore {
  private listeners = new Set<() => void>();
  private snapshot: CollabSnapshot = EMPTY;
  private ydoc: Y.Doc | null = null;
  private provider: WebsocketProvider | null = null;

  /** Open a Yjs connection. Safe to call from useEffect. */
  connect(
    documentId: string,
    userId: string,
    displayName: string,
    token: string,
  ) {
    const doc = new Y.Doc();
    const ws = new WebsocketProvider(WS_URL, documentId, doc, {
      connect: true,
      params: { token, documentId },
    });

    ws.awareness.setLocalStateField('user', {
      userId,
      displayName,
      color: pickColor(userId),
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

    ws.awareness.on('change', () => {
      const users: CollaborationUser[] = [];
      ws.awareness.getStates().forEach((state, cid) => {
        if (cid !== ws.awareness.clientID && state.user) {
          users.push(state.user as CollaborationUser);
        }
      });
      this.emit({ collaborators: users });
    });

    // Initial snapshot with doc + provider (status stays 'connecting')
    this.emit({});
  }

  /** Tear down everything. Safe to call from useEffect cleanup. */
  destroy() {
    this.provider?.disconnect();
    this.provider?.destroy();
    this.ydoc?.destroy();
    this.ydoc = null;
    this.provider = null;
    this.snapshot = EMPTY;
    this.notify();
  }

  // -- useSyncExternalStore interface --

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getSnapshot = (): CollabSnapshot => this.snapshot;

  // -- internal --

  private emit(patch: Partial<CollabSnapshot>) {
    this.snapshot = {
      ydoc: this.ydoc,
      provider: this.provider,
      connectionStatus: this.snapshot.connectionStatus,
      collaborators: this.snapshot.collaborators,
      ...patch,
    };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCollaboration(documentId: string): CollabSnapshot {
  const { user } = useAuth();

  // New store per documentId — constructor has zero side effects
  const store = useMemo(() => new CollabStore(), [documentId]);

  // Side effects (connect / disconnect) live in useEffect
  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;

    store.connect(documentId, user.id, user.displayName, token);
    return () => store.destroy();
  }, [store, documentId, user]);

  // Subscribe to the external store — the React 19 way
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
