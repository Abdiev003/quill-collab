export type ActivityType = 'create' | 'rename' | 'edit-batch' | 'restore' | 'share';

export interface ActivitySummary {
  id: string;
  documentId: string;
  type: ActivityType;
  actorId: string;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityEvent {
  type: 'activity:new';
  activity: ActivitySummary;
}
