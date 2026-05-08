'use client';

import type { ActivitySummary, ActivityType } from '@quill-collab/shared';
import { useActivity, useActivityStream } from '@/hooks/useActivity';
import { cn } from '@/lib/utils';

interface ActivityPanelProps {
  documentId: string;
}

const LABELS: Record<ActivityType, string> = {
  create: 'Created document',
  rename: 'Renamed document',
  'edit-batch': 'Edited document',
  restore: 'Restored document',
  share: 'Shared document',
};

export function ActivityPanel({ documentId }: ActivityPanelProps) {
  const { data: activity = [], isLoading } = useActivity(documentId);
  useActivityStream(documentId);

  if (isLoading) {
    return (
      <div className="space-y-3 px-2 py-2">
        <ActivitySkeleton />
        <ActivitySkeleton />
        <ActivitySkeleton />
      </div>
    );
  }

  if (activity.length === 0) {
    return <p className="px-2.5 py-2 text-xs text-muted-foreground">No activity yet</p>;
  }

  return (
    <div className="space-y-1.5 px-1.5 py-1">
      {activity.map((item) => (
        <ActivityRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function ActivityRow({ item }: { item: ActivitySummary }) {
  return (
    <div className="rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
            item.type === 'edit-batch'
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground',
          )}
          aria-hidden
        >
          {iconFor(item.type)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-sidebar-foreground">{LABELS[item.type]}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {item.actorName ?? 'Someone'} - {formatTime(item.createdAt)}
          </p>
          {item.type === 'rename' && typeof item.metadata?.title === 'string' && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {item.metadata.title}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-3/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function iconFor(type: ActivityType): string {
  switch (type) {
    case 'create':
      return '+';
    case 'rename':
      return 'T';
    case 'edit-batch':
      return 'E';
    case 'restore':
      return 'R';
    case 'share':
      return 'S';
  }
}

function formatTime(value: string): string {
  const deltaSeconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);

  if (deltaSeconds < 60) return 'just now';
  if (deltaSeconds < 3600) return `${Math.round(deltaSeconds / 60)}m ago`;
  if (deltaSeconds < 86_400) return `${Math.round(deltaSeconds / 3600)}h ago`;
  return `${Math.round(deltaSeconds / 86_400)}d ago`;
}
