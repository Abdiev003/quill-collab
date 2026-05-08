'use client';

import type { ActivityEvent, ActivitySummary } from '@quill-collab/shared';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { listActivity } from '@/lib/api/activity';
import { getAccessToken, subscribeAccessToken } from '@/lib/api/client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

export const activityKeys = {
  list: (documentId: string) => ['activity', documentId] as const,
};

export function useActivity(documentId: string | null): UseQueryResult<ActivitySummary[]> {
  return useQuery({
    queryKey: activityKeys.list(documentId ?? ''),
    queryFn: () => listActivity(documentId ?? ''),
    enabled: !!documentId,
  });
}

export function useActivityStream(documentId: string | null): void {
  const qc = useQueryClient();
  const [token, setToken] = useState(() => getAccessToken());

  useEffect(() => subscribeAccessToken(setToken), []);

  useEffect(() => {
    if (!documentId || !token) return;

    const url = `${WS_URL}/activity/${documentId}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as ActivityEvent;
        if (message.type !== 'activity:new') return;

        qc.setQueryData<ActivitySummary[]>(activityKeys.list(documentId), (previous) => {
          const rows = previous ?? [];
          if (rows.some((row) => row.id === message.activity.id)) return rows;
          return [message.activity, ...rows].slice(0, 50);
        });
      } catch {
        // Ignore malformed messages from a closed or stale socket.
      }
    };

    return () => {
      ws.close();
    };
  }, [documentId, qc, token]);
}
